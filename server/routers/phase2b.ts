/**
 * Phase 2B Routers: Refunds, Coupons/Offers, Complaints
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

function getEffectiveRole(user: any): string {
  if (user.maksabRole) return user.maksabRole;
  if (user.role === "admin") return "manager";
  return "employee";
}

const SUPER_ROLES = ["manager", "deputy_manager", "top_employee_minister"];

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

// ============================================================
// REFUNDS ROUTER
// ============================================================
export const refundRouter = router({
  list: requirePermission("ViewRefunds")
    .input(z.object({
      status: z.string().optional(),
      orderId: z.number().optional(),
      bookingId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getAllRefunds(input ?? undefined);
    }),
  getById: requirePermission("ViewRefunds")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getRefundById(input.id);
    }),
  create: requirePermission("ManageRefunds")
    .input(z.object({
      orderId: z.number().optional(),
      bookingId: z.number().optional(),
      refundType: z.string(),
      reason: z.string(),
      originalAmount: z.string().optional(),
      refundAmount: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createRefund({
        ...input,
        requestedById: ctx.user.id,
        status: "pending_review",
      } as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "refund_requested",
        entityType: "refund",
        newValues: input,
      });
      // Notify finance managers
      const allUsers = await db.getAllUsers();
      const financeUsers = allUsers.filter((u: any) => u.maksabRole === "finance_manager" || ["manager", "deputy_manager", "top_employee_minister"].includes(u.maksabRole));
      for (const fu of financeUsers) {
        await db.createNotification({
          userId: fu.id,
          title: "New Refund Request",
          message: `A refund of ${input.refundAmount} has been requested by ${ctx.user.name}. Reason: ${input.reason}`,
          type: "approval_request",
          relatedEntityType: "refund",
        });
      }
      return { success: true };
    }),
  review: requirePermission("ApproveRefunds")
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected"]),
      notes: z.string().optional(),
      refundMethod: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const refund = await db.getRefundById(input.id);
      if (!refund) throw new TRPCError({ code: "NOT_FOUND" });
      await db.updateRefund(input.id, {
        status: input.status,
        reviewedById: ctx.user.id,
        reviewDate: new Date(),
        reviewNotes: input.notes,
        refundMethod: input.refundMethod,
        processedAt: input.status === "approved" ? new Date() : undefined,
      } as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: `refund_${input.status}`,
        entityType: "refund",
        entityId: input.id,
        oldValues: { status: refund.status },
        newValues: { status: input.status },
        notes: input.notes,
      });
      return { success: true };
    }),
});

// ============================================================
// COUPONS ROUTER
// ============================================================
export const couponRouter = router({
  list: requirePermission("ViewCoupons")
    .input(z.object({
      status: z.string().optional(),
      wilayatId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getAllCoupons(input ?? undefined);
    }),
  getById: requirePermission("ViewCoupons")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getCouponById(input.id);
    }),
  create: requirePermission("ManageCoupons")
    .input(z.object({
      code: z.string(),
      discountType: z.string(),
      discountValue: z.string(),
      minOrderAmount: z.string().optional(),
      maxDiscount: z.string().optional(),
      maxUsageTotal: z.number().optional(),
      maxUsagePerUser: z.number().optional(),
      validFrom: z.string().optional(),
      validTo: z.string().optional(),
      applicableStoreIds: z.any().optional(),
      applicableCategories: z.any().optional(),
      wilayatId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check code uniqueness
      const existing = await db.getCouponByCode(input.code);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Coupon code already exists" });
      await db.createCoupon({
        ...input,
        status: "active",
        createdById: ctx.user.id,
        validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
        validTo: input.validTo ? new Date(input.validTo) : undefined,
      } as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "coupon_created",
        entityType: "coupon",
        newValues: input,
      });
      return { success: true };
    }),
  update: requirePermission("ManageCoupons")
    .input(z.object({
      id: z.number(),
      discountType: z.string().optional(),
      discountValue: z.string().optional(),
      minOrderAmount: z.string().optional(),
      maxDiscount: z.string().optional(),
      maxUsageTotal: z.number().optional(),
      maxUsagePerUser: z.number().optional(),
      validFrom: z.string().optional(),
      validTo: z.string().optional(),
      status: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const old = await db.getCouponById(id);
      const updateData: any = { ...data };
      if (data.validFrom) updateData.validFrom = new Date(data.validFrom);
      if (data.validTo) updateData.validTo = new Date(data.validTo);
      await db.updateCoupon(id, updateData);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "coupon_updated",
        entityType: "coupon",
        entityId: id,
        oldValues: old,
        newValues: data,
      });
      return { success: true };
    }),
});

// ============================================================
// OFFERS ROUTER
// ============================================================
export const offerRouter = router({
  list: requirePermission("ViewCoupons")
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return db.getAllOffers(input ?? undefined);
    }),
  create: requirePermission("ManageCoupons")
    .input(z.object({
      title: z.string(),
      description: z.string().optional(),
      offerType: z.string(),
      discountValue: z.string().optional(),
      applicableStoreIds: z.any().optional(),
      applicableCategories: z.any().optional(),
      validFrom: z.string().optional(),
      validTo: z.string().optional(),
      imageUrl: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createOffer({
        ...input,
        status: "active",
        createdById: ctx.user.id,
        validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
        validTo: input.validTo ? new Date(input.validTo) : undefined,
      } as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "offer_created",
        entityType: "offer",
        newValues: input,
      });
      return { success: true };
    }),
  update: requirePermission("ManageCoupons")
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      discountValue: z.string().optional(),
      status: z.string().optional(),
      validFrom: z.string().optional(),
      validTo: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.validFrom) updateData.validFrom = new Date(data.validFrom);
      if (data.validTo) updateData.validTo = new Date(data.validTo);
      await db.updateOffer(id, updateData);
      return { success: true };
    }),
});

// ============================================================
// COMPLAINTS ROUTER
// ============================================================
export const complaintRouter = router({
  list: requirePermission("ViewComplaints")
    .input(z.object({
      status: z.string().optional(),
      complaintType: z.string().optional(),
      customerId: z.number().optional(),
      storeId: z.number().optional(),
      mandoubId: z.number().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getAllComplaints(input ?? undefined);
    }),
  getById: requirePermission("ViewComplaints")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getComplaintById(input.id);
    }),
  create: requirePermission("ManageComplaints")
    .input(z.object({
      complaintType: z.string(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      customerId: z.number().optional(),
      orderId: z.number().optional(),
      bookingId: z.number().optional(),
      storeId: z.number().optional(),
      mandoubId: z.number().optional(),
      subject: z.string(),
      description: z.string().optional(),
      priority: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createComplaint({
        ...input,
        status: "new",
        createdById: ctx.user.id,
      } as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "complaint_created",
        entityType: "complaint",
        newValues: input,
      });
      return { success: true };
    }),
  update: requirePermission("ManageComplaints")
    .input(z.object({
      id: z.number(),
      status: z.string().optional(),
      assignedToId: z.number().optional(),
      resolution: z.string().optional(),
      internalNotes: z.string().optional(),
      priority: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const old = await db.getComplaintById(id);
      const updateData: any = { ...data };
      if (data.status === "resolved") updateData.resolvedAt = new Date();
      await db.updateComplaint(id, updateData);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "complaint_updated",
        entityType: "complaint",
        entityId: id,
        oldValues: old,
        newValues: data,
      });
      return { success: true };
    }),
  archive: requirePermission("ManageComplaints")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.updateComplaint(input.id, { archived: true } as any);
      await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "complaint_archived", entityType: "complaint", entityId: input.id });
      return { success: true };
    }),
});
