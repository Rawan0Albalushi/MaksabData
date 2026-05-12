/**
 * Phase 2A Routers: Bulk Import, Orders, Customers, Bookings
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "../_core/trpc";
import * as db from "../db";

// Re-use the same middleware pattern from main routers
import { protectedProcedure } from "../_core/trpc";

/** Resolve the effective role — admin with null maksabRole is treated as manager */
function getEffectiveRole(user: any): string {
  if (user.maksabRole) return user.maksabRole;
  if (user.role === "admin") return "manager";
  return "employee";
}

const SUPER_ROLES = ["manager", "deputy_manager", "top_employee_minister"];

// Helper: create requirePermission using protectedProcedure
function requirePermission(permission: string) {
  return protectedProcedure.use(({ ctx, next }) => {
    const userPerms = ctx.user.permissions ? (typeof ctx.user.permissions === "string" ? JSON.parse(ctx.user.permissions) : ctx.user.permissions) : [];
    const role = getEffectiveRole(ctx.user);
    if (!SUPER_ROLES.includes(role) && !userPerms.includes(permission)) {
      throw new TRPCError({ code: "FORBIDDEN", message: `Missing permission: ${permission}` });
    }
    return next({ ctx });
  });
}

function enforceWilayatScope(user: any, requestedWilayatId?: number): number | undefined {
  const role = getEffectiveRole(user);
  if (SUPER_ROLES.includes(role)) return requestedWilayatId;
  if (user.wilayatId) return user.wilayatId;
  return requestedWilayatId;
}

// ============================================================
// BULK IMPORT ROUTER
// ============================================================
// Old Bulk Import is disabled. Use Data Import (/data-import) instead.
export const bulkImportRouter = router({
  parseStores: requirePermission("BulkImportStores")
    .input(z.object({ rows: z.array(z.record(z.string(), z.any())) }))
    .mutation(async () => {
      throw new TRPCError({ code: "FORBIDDEN", message: "Old Bulk Import is disabled. Please use Data Import." });
    }),
  confirmImport: requirePermission("BulkImportStores")
    .input(z.object({ stores: z.array(z.any()) }))
    .mutation(async () => {
      throw new TRPCError({ code: "FORBIDDEN", message: "Old Bulk Import is disabled. Please use Data Import." });
    }),
});

// ============================================================
// ORDERS ROUTER
// ============================================================
export const orderRouter = router({
  list: requirePermission("ViewOrders")
    .input(z.object({
      wilayatId: z.number().optional(),
      orderType: z.string().optional(),
      orderStatus: z.string().optional(),
      paymentStatus: z.string().optional(),
      storeId: z.number().optional(),
      customerId: z.number().optional(),
      assignedMandoubId: z.number().optional(),
      search: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      storeClassification: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const wilayatId = enforceWilayatScope(ctx.user, input?.wilayatId);
      return db.getAllOrders({ ...input, wilayatId: wilayatId || undefined });
    }),
  getById: requirePermission("ViewOrders")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getOrderById(input.id);
    }),
  create: requirePermission("CreateOrder")
    .input(z.object({
      orderNumber: z.string().optional(),
      orderType: z.string(),
      storeClassification: z.string().optional(),
      storeId: z.number().optional(),
      storeName: z.string().optional(),
      customerId: z.number().optional(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      customerAddress: z.string().optional(),
      wilayatId: z.number().optional(),
      assignedMandoubId: z.number().optional(),
      assignedEmployeeId: z.number().optional(),
      items: z.any().optional(),
      subtotal: z.string().optional(),
      deliveryFee: z.string().optional(),
      discount: z.string().optional(),
      totalAmount: z.string().optional(),
      paymentMethod: z.string().optional(),
      notes: z.string().optional(),
      internalNotes: z.string().optional(),
      scheduledDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const orderNumber = input.orderNumber || `ORD-${Date.now().toString(36).toUpperCase()}`;
      const wilayatId = enforceWilayatScope(ctx.user, input.wilayatId);
      await db.createOrder({
        ...input,
        orderNumber,
        wilayatId: wilayatId || input.wilayatId,
        orderStatus: "new",
        paymentStatus: "not_paid",
        createdById: ctx.user.id,
        orderDate: new Date(),
      } as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "order_created",
        entityType: "order",
        newValues: { orderNumber, orderType: input.orderType, storeName: input.storeName },
      });
      return { success: true, orderNumber };
    }),
  updateStatus: requirePermission("ManageOrders")
    .input(z.object({
      id: z.number(),
      orderStatus: z.string(),
      notes: z.string().optional(),
      cancellationReason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const old = await db.getOrderById(input.id);
      if (!old) throw new TRPCError({ code: "NOT_FOUND" });
      const updateData: any = { orderStatus: input.orderStatus };
      if (input.cancellationReason) updateData.cancellationReason = input.cancellationReason;
      if (input.orderStatus === "completed") updateData.completedAt = new Date();
      await db.updateOrder(input.id, updateData);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "order_status_changed",
        entityType: "order",
        entityId: input.id,
        oldValues: { orderStatus: old.orderStatus },
        newValues: { orderStatus: input.orderStatus },
        notes: input.notes,
      });
      return { success: true };
    }),
  update: requirePermission("ManageOrders")
    .input(z.object({
      id: z.number(),
      assignedMandoubId: z.number().optional(),
      assignedEmployeeId: z.number().optional(),
      paymentStatus: z.string().optional(),
      paymentMethod: z.string().optional(),
      deliveryFee: z.string().optional(),
      discount: z.string().optional(),
      totalAmount: z.string().optional(),
      notes: z.string().optional(),
      internalNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const old = await db.getOrderById(id);
      await db.updateOrder(id, data as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "order_updated",
        entityType: "order",
        entityId: id,
        oldValues: old,
        newValues: data,
      });
      return { success: true };
    }),
  archive: requirePermission("ManageOrders")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.updateOrder(input.id, { archived: true } as any);
      await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "order_archived", entityType: "order", entityId: input.id });
      return { success: true };
    }),
});

// ============================================================
// CUSTOMERS ROUTER
// ============================================================
export const customerRouter = router({
  list: requirePermission("ViewCustomers")
    .input(z.object({
      wilayatId: z.number().optional(),
      status: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const wilayatId = enforceWilayatScope(ctx.user, input?.wilayatId);
      return db.getAllCustomers({ ...input, wilayatId: wilayatId || undefined });
    }),
  getById: requirePermission("ViewCustomers")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getCustomerById(input.id);
    }),
  create: requirePermission("ManageCustomers")
    .input(z.object({
      fullName: z.string(),
      phone: z.string().optional(),
      email: z.string().optional(),
      wilayatId: z.number().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createCustomer(input as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "customer_created",
        entityType: "customer",
        newValues: input,
      });
      return { success: true };
    }),
  update: requirePermission("ManageCustomers")
    .input(z.object({
      id: z.number(),
      fullName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      wilayatId: z.number().optional(),
      address: z.string().optional(),
      notes: z.string().optional(),
      status: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const old = await db.getCustomerById(id);
      await db.updateCustomer(id, data as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "customer_updated",
        entityType: "customer",
        entityId: id,
        oldValues: old,
        newValues: data,
      });
      return { success: true };
    }),
  archive: requirePermission("ManageCustomers")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.updateCustomer(input.id, { archived: true } as any);
      await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "customer_archived", entityType: "customer", entityId: input.id });
      return { success: true };
    }),
  /** Get orders for a specific customer */
  orders: requirePermission("ViewCustomers")
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      return db.getAllOrders({ customerId: input.customerId });
    }),
  /** Get bookings for a specific customer */
  bookings: requirePermission("ViewCustomers")
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      return db.getAllBookings({ customerId: input.customerId });
    }),
});

// ============================================================
// BOOKINGS ROUTER
// ============================================================
export const bookingRouter = router({
  list: requirePermission("ViewBookings")
    .input(z.object({
      wilayatId: z.number().optional(),
      serviceType: z.string().optional(),
      bookingStatus: z.string().optional(),
      customerId: z.number().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const wilayatId = enforceWilayatScope(ctx.user, input?.wilayatId);
      return db.getAllBookings({ ...input, wilayatId: wilayatId || undefined });
    }),
  getById: requirePermission("ViewBookings")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getBookingById(input.id);
    }),
  create: requirePermission("ManageBookings")
    .input(z.object({
      serviceType: z.string(),
      customerId: z.number().optional(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      wilayatId: z.number().optional(),
      scheduledDate: z.string().optional(),
      scheduledTime: z.string().optional(),
      pickupAddress: z.string().optional(),
      dropoffAddress: z.string().optional(),
      estimatedPrice: z.string().optional(),
      assignedMandoubId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const wilayatId = enforceWilayatScope(ctx.user, input.wilayatId);
      await db.createBooking({
        ...input,
        wilayatId: wilayatId || input.wilayatId,
        bookingStatus: "new",
        createdById: ctx.user.id,
      } as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "booking_created",
        entityType: "booking",
        newValues: input,
      });
      return { success: true };
    }),
  updateStatus: requirePermission("ManageBookings")
    .input(z.object({
      id: z.number(),
      bookingStatus: z.string(),
      notes: z.string().optional(),
      cancellationReason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const old = await db.getBookingById(input.id);
      if (!old) throw new TRPCError({ code: "NOT_FOUND" });
      const updateData: any = { bookingStatus: input.bookingStatus };
      if (input.cancellationReason) updateData.cancellationReason = input.cancellationReason;
      if (input.bookingStatus === "completed") updateData.completedAt = new Date();
      await db.updateBooking(input.id, updateData);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "booking_status_changed",
        entityType: "booking",
        entityId: input.id,
        oldValues: { bookingStatus: old.bookingStatus },
        newValues: { bookingStatus: input.bookingStatus },
        notes: input.notes,
      });
      return { success: true };
    }),
  update: requirePermission("ManageBookings")
    .input(z.object({
      id: z.number(),
      assignedMandoubId: z.number().optional(),
      paymentStatus: z.string().optional(),
      paymentMethod: z.string().optional(),
      actualPrice: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await db.updateBooking(id, data as any);
      return { success: true };
    }),
  archive: requirePermission("ManageBookings")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.updateBooking(input.id, { archived: true } as any);
      await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "booking_archived", entityType: "booking", entityId: input.id });
      return { success: true };
    }),
});
