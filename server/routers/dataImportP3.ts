import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { hasPermission, isSuperAdmin, MaksabRole, Permission } from "@shared/permissions";
import * as db from "../db";
import {
  BOOKING_COLUMN_MAP, BOOKING_SERVICE_TYPE_MAP, BOOKING_STATUS_MAP,
  COUPON_COLUMN_MAP, DISCOUNT_TYPE_MAP, COUPON_STATUS_MAP, WHO_BEARS_COST_MAP,
  EXPENSE_COLUMN_MAP, EXPENSE_TYPE_MAP, EXPENSE_PAYMENT_METHOD_MAP, EXPENSE_APPROVAL_STATUS_MAP, BENEFICIARY_TYPE_MAP,
  STORE_DUE_COLUMN_MAP, STORE_DUE_SETTLEMENT_STATUS_MAP,
  SETTLEMENT_COLUMN_MAP, SETTLEMENT_TYPE_MAP, SETTLEMENT_ENTITY_TYPE_MAP, SETTLEMENT_STATUS_MAP,
  COMPLAINT_COLUMN_MAP, COMPLAINT_TYPE_MAP, COMPLAINT_STATUS_MAP,
  PAYMENT_STATUS_MAP,
  normalizeValue, mapColumns, parseRow, sanitizeText,
} from "@shared/importNormalization";

// ============================================================
// HELPERS
// ============================================================
function getEffectiveRole(user: any): MaksabRole {
  if (user.maksabRole) return user.maksabRole as MaksabRole;
  if (user.role === "admin") return "manager";
  return "employee";
}
function requireImportPermission(user: any, permission: Permission) {
  const role = getEffectiveRole(user);
  if (isSuperAdmin(role)) return;
  if (!hasPermission(role, user.permissions as any, permission)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
  }
}
function getWilayatScope(user: any): number | undefined {
  const role = getEffectiveRole(user);
  if (isSuperAdmin(role)) return undefined;
  if (hasPermission(role, user.permissions as any, "ViewAllAreas")) return undefined;
  return user.wilayatId || undefined;
}
function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}
function parseNumber(value: string | null | undefined): string {
  if (!value) return "0";
  const n = parseFloat(value.replace(/[^\d.-]/g, ""));
  return isNaN(n) ? "0" : String(n);
}
function parseInt2(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = parseInt(value.replace(/[^\d]/g, ""));
  return isNaN(n) ? null : n;
}

// ============================================================
// BOOKINGS IMPORT
// ============================================================
const bookingsImportRouter = router({
  parse: protectedProcedure
    .input(z.object({
      rows: z.array(z.array(z.any())),
      headers: z.array(z.string()),
      fileName: z.string(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportBookings");
      const columnMapping = mapColumns(input.headers, BOOKING_COLUMN_MAP);
      const validRows: any[] = [];
      const invalidRows: any[] = [];
      const duplicateRows: any[] = [];
      const wilayatScope = getWilayatScope(ctx.user!);

      for (let i = 0; i < input.rows.length; i++) {
        const raw = parseRow(input.rows[i], columnMapping);
        const serviceType = normalizeValue(raw.serviceType, BOOKING_SERVICE_TYPE_MAP, "other");
        const bookingDate = parseDate(raw.bookingDate);
        if (!bookingDate) {
          invalidRows.push({ rowNumber: i + 2, reason: "Missing or invalid bookingDate" });
          continue;
        }
        // Resolve wilayat
        let wilayatId = wilayatScope || null;
        if (raw.wilayat && !wilayatScope) {
          const w = await db.findWilayatByName(raw.wilayat);
          if (w) wilayatId = w.id;
        }
        // Resolve customer
        let customerId: number | null = null;
        if (raw.customerPhone) {
          const c = await db.findCustomerByPhone(raw.customerPhone);
          if (c) customerId = c.id;
        }
        const bookingStatus = normalizeValue(raw.bookingStatus, BOOKING_STATUS_MAP, "new");
        const paymentStatus = normalizeValue(raw.paymentStatus, PAYMENT_STATUS_MAP, "not_paid");
        const normalized = {
          serviceType: serviceType as any,
          customerName: sanitizeText(raw.customerName, 255) || null,
          customerPhone: raw.customerPhone?.trim() || null,
          customerId,
          wilayatId,
          bookingDate,
          startTime: raw.startTime?.trim() || null,
          endTime: raw.endTime?.trim() || null,
          totalAmount: parseNumber(raw.totalAmount || raw.estimatedPrice),
          bookingStatus: bookingStatus as any,
          paymentStatus: paymentStatus as any,
          notes: sanitizeText(raw.notes, 1000) || null,
        };
        validRows.push({ rowNumber: i + 2, data: normalized, isDuplicate: false });
      }
      const batch = await db.createImportBatch({
        importType: "bookings",
        fileName: input.fileName,
        uploadedById: ctx.user!.id,
        uploadedByName: ctx.user!.name || "",
        totalRows: input.rows.length,
        importedRows: 0,
        skippedRows: invalidRows.length,
        duplicateRows: duplicateRows.length,
        status: "pending_preview",
        duplicateHandling: input.duplicateHandling,
        errorSummary: invalidRows.length > 0 ? invalidRows.slice(0, 50) : null,
        validRowsData: validRows,
      });
      return {
        batchId: batch.id,
        totalRows: input.rows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        duplicateRows: duplicateRows.length,
        preview: validRows.slice(0, 20),
        errors: invalidRows.slice(0, 50),
        duplicates: duplicateRows.slice(0, 20),
      };
    }),
  confirm: protectedProcedure
    .input(z.object({
      batchId: z.number(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportBookings");
      const batch = await db.getImportBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import batch not found" });
      if (batch.status !== "pending_preview") throw new TRPCError({ code: "BAD_REQUEST", message: "Batch already processed" });
      const allRows = (batch.validRowsData as any[]) || [];
      let importedCount = 0;
      let skippedCount = 0;
      const errors: any[] = [];
      for (const row of allRows) {
        try {
          await db.createBooking(row.data as any);
          importedCount++;
        } catch (err: any) {
          errors.push({ rowNumber: row.rowNumber, error: err.message });
          skippedCount++;
        }
      }
      const status = errors.length > 0 ? "imported_with_errors" : "imported";
      await db.updateImportBatch(input.batchId, {
        importedRows: importedCount,
        skippedRows: skippedCount + (batch.skippedRows || 0),
        status,
        errorSummary: errors.length > 0 ? errors : null,
        validRowsData: null,
      });
      await db.createAuditLog({
        userId: ctx.user!.id,
        userName: ctx.user!.name ?? "",
        actionType: "import_confirmed",
        entityType: "booking",
        notes: `Batch #${input.batchId}: ${importedCount} bookings imported, ${skippedCount} skipped`,
      });
      return { batchId: input.batchId, importedCount, skippedCount, errors, status };
    }),
});

// ============================================================
// COUPONS IMPORT
// ============================================================
const couponsImportRouter = router({
  parse: protectedProcedure
    .input(z.object({
      rows: z.array(z.array(z.any())),
      headers: z.array(z.string()),
      fileName: z.string(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportCoupons");
      const columnMapping = mapColumns(input.headers, COUPON_COLUMN_MAP);
      const validRows: any[] = [];
      const invalidRows: any[] = [];
      const duplicateRows: any[] = [];

      for (let i = 0; i < input.rows.length; i++) {
        const raw = parseRow(input.rows[i], columnMapping);
        const name = sanitizeText(raw.name, 255);
        const code = raw.code?.trim();
        if (!name || !code) {
          invalidRows.push({ rowNumber: i + 2, reason: "Missing coupon name or code" });
          continue;
        }
        // Check duplicate by code
        const existing = await db.getCouponByCode(code);
        if (existing) {
          if (input.duplicateHandling === "skip") {
            duplicateRows.push({ rowNumber: i + 2, reason: `Code "${code}" already exists` });
            continue;
          }
        }
        const discountType = normalizeValue(raw.discountType, DISCOUNT_TYPE_MAP, "fixed");
        const couponStatus = normalizeValue(raw.status, COUPON_STATUS_MAP, "active");
        const whoBearsCost = normalizeValue(raw.whoBearsCost, WHO_BEARS_COST_MAP, "maksab");
        // Resolve wilayat
        let wilayatId: number | null = null;
        if (raw.wilayat) {
          const w = await db.findWilayatByName(raw.wilayat);
          if (w) wilayatId = w.id;
        }
        // Resolve store
        let linkedStoreId: number | null = null;
        if (raw.storeName) {
          const s = await db.findStoreByName(raw.storeName);
          if (s) linkedStoreId = s.id;
        }
        const normalized = {
          name,
          code,
          discountType: discountType as any,
          discountValue: parseNumber(raw.discountValue),
          startDate: parseDate(raw.startDate),
          endDate: parseDate(raw.endDate),
          wilayatId,
          linkedStoreId,
          whoBearsCost: whoBearsCost as any,
          usageLimit: parseInt2(raw.usageLimit),
          perCustomerLimit: parseInt2(raw.perCustomerLimit),
          minimumOrderAmount: raw.minimumOrderAmount ? parseNumber(raw.minimumOrderAmount) : null,
          status: couponStatus as any,
          notes: sanitizeText(raw.notes, 1000) || null,
        };
        validRows.push({ rowNumber: i + 2, data: normalized, isDuplicate: !!existing });
      }
      const batch = await db.createImportBatch({
        importType: "coupons",
        fileName: input.fileName,
        uploadedById: ctx.user!.id,
        uploadedByName: ctx.user!.name || "",
        totalRows: input.rows.length,
        importedRows: 0,
        skippedRows: invalidRows.length,
        duplicateRows: duplicateRows.length,
        status: "pending_preview",
        duplicateHandling: input.duplicateHandling,
        errorSummary: invalidRows.length > 0 ? invalidRows.slice(0, 50) : null,
        validRowsData: validRows,
      });
      return {
        batchId: batch.id,
        totalRows: input.rows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        duplicateRows: duplicateRows.length,
        preview: validRows.slice(0, 20),
        errors: invalidRows.slice(0, 50),
        duplicates: duplicateRows.slice(0, 20),
      };
    }),
  confirm: protectedProcedure
    .input(z.object({
      batchId: z.number(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportCoupons");
      const batch = await db.getImportBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import batch not found" });
      if (batch.status !== "pending_preview") throw new TRPCError({ code: "BAD_REQUEST", message: "Batch already processed" });
      const allRows = (batch.validRowsData as any[]) || [];
      let importedCount = 0;
      let skippedCount = 0;
      const errors: any[] = [];
      for (const row of allRows) {
        try {
          await db.createCoupon(row.data as any);
          importedCount++;
        } catch (err: any) {
          errors.push({ rowNumber: row.rowNumber, error: err.message });
          skippedCount++;
        }
      }
      const status = errors.length > 0 ? "imported_with_errors" : "imported";
      await db.updateImportBatch(input.batchId, {
        importedRows: importedCount,
        skippedRows: skippedCount + (batch.skippedRows || 0),
        status,
        errorSummary: errors.length > 0 ? errors : null,
        validRowsData: null,
      });
      await db.createAuditLog({
        userId: ctx.user!.id,
        userName: ctx.user!.name ?? "",
        actionType: "import_confirmed",
        entityType: "coupon",
        notes: `Batch #${input.batchId}: ${importedCount} coupons imported, ${skippedCount} skipped`,
      });
      return { batchId: input.batchId, importedCount, skippedCount, errors, status };
    }),
});

// ============================================================
// EXPENSES IMPORT
// ============================================================
const expensesImportRouter = router({
  parse: protectedProcedure
    .input(z.object({
      rows: z.array(z.array(z.any())),
      headers: z.array(z.string()),
      fileName: z.string(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportExpenses");
      const columnMapping = mapColumns(input.headers, EXPENSE_COLUMN_MAP);
      const validRows: any[] = [];
      const invalidRows: any[] = [];
      const wilayatScope = getWilayatScope(ctx.user!);

      for (let i = 0; i < input.rows.length; i++) {
        const raw = parseRow(input.rows[i], columnMapping);
        const expenseType = normalizeValue(raw.expenseType, EXPENSE_TYPE_MAP, "other");
        const amount = parseNumber(raw.amount);
        if (amount === "0" && !raw.amount) {
          invalidRows.push({ rowNumber: i + 2, reason: "Missing amount" });
          continue;
        }
        const paymentMethod = raw.paymentMethod ? normalizeValue(raw.paymentMethod, EXPENSE_PAYMENT_METHOD_MAP, "cash") : null;
        const approvalStatus = normalizeValue(raw.approvalStatus, EXPENSE_APPROVAL_STATUS_MAP, "pending_approval");
        const beneficiaryType = raw.beneficiaryType ? normalizeValue(raw.beneficiaryType, BENEFICIARY_TYPE_MAP, "other") : null;
        // Resolve wilayat
        let wilayatId = wilayatScope || null;
        if (raw.wilayat && !wilayatScope) {
          const w = await db.findWilayatByName(raw.wilayat);
          if (w) wilayatId = w.id;
        }
        // Resolve budget
        let budgetId: number | null = null;
        if (raw.budgetName) {
          const b = await db.findBudgetByName(raw.budgetName);
          if (b) budgetId = b.id;
        }
        const expenseDate = parseDate(raw.expenseDate) || new Date();
        const normalized = {
          expenseDate,
          expenseType: expenseType as any,
          amount,
          paymentMethod: paymentMethod as any,
          reason: sanitizeText(raw.reason, 1000) || null,
          beneficiaryType: beneficiaryType as any,
          beneficiaryName: sanitizeText(raw.beneficiaryName, 255) || null,
          wilayatId,
          budgetId,
          approvalStatus: approvalStatus as any,
          registeredById: ctx.user!.id,
          notes: sanitizeText(raw.notes, 1000) || null,
        };
        validRows.push({ rowNumber: i + 2, data: normalized, isDuplicate: false });
      }
      const batch = await db.createImportBatch({
        importType: "expenses",
        fileName: input.fileName,
        uploadedById: ctx.user!.id,
        uploadedByName: ctx.user!.name || "",
        totalRows: input.rows.length,
        importedRows: 0,
        skippedRows: invalidRows.length,
        duplicateRows: 0,
        status: "pending_preview",
        duplicateHandling: input.duplicateHandling,
        errorSummary: invalidRows.length > 0 ? invalidRows.slice(0, 50) : null,
        validRowsData: validRows,
      });
      return {
        batchId: batch.id,
        totalRows: input.rows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        duplicateRows: 0,
        preview: validRows.slice(0, 20),
        errors: invalidRows.slice(0, 50),
        duplicates: [],
      };
    }),
  confirm: protectedProcedure
    .input(z.object({
      batchId: z.number(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportExpenses");
      const batch = await db.getImportBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import batch not found" });
      if (batch.status !== "pending_preview") throw new TRPCError({ code: "BAD_REQUEST", message: "Batch already processed" });
      const allRows = (batch.validRowsData as any[]) || [];
      let importedCount = 0;
      let skippedCount = 0;
      const errors: any[] = [];
      for (const row of allRows) {
        try {
          await db.createExpense(row.data as any);
          importedCount++;
        } catch (err: any) {
          errors.push({ rowNumber: row.rowNumber, error: err.message });
          skippedCount++;
        }
      }
      const status = errors.length > 0 ? "imported_with_errors" : "imported";
      await db.updateImportBatch(input.batchId, {
        importedRows: importedCount,
        skippedRows: skippedCount + (batch.skippedRows || 0),
        status,
        errorSummary: errors.length > 0 ? errors : null,
        validRowsData: null,
      });
      await db.createAuditLog({
        userId: ctx.user!.id,
        userName: ctx.user!.name ?? "",
        actionType: "import_confirmed",
        entityType: "expense",
        notes: `Batch #${input.batchId}: ${importedCount} expenses imported, ${skippedCount} skipped`,
      });
      return { batchId: input.batchId, importedCount, skippedCount, errors, status };
    }),
});

// ============================================================
// STORE DUES IMPORT
// ============================================================
const storeDuesImportRouter = router({
  parse: protectedProcedure
    .input(z.object({
      rows: z.array(z.array(z.any())),
      headers: z.array(z.string()),
      fileName: z.string(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportStoreDues");
      const columnMapping = mapColumns(input.headers, STORE_DUE_COLUMN_MAP);
      const validRows: any[] = [];
      const invalidRows: any[] = [];
      const wilayatScope = getWilayatScope(ctx.user!);

      for (let i = 0; i < input.rows.length; i++) {
        const raw = parseRow(input.rows[i], columnMapping);
        // Store is required
        if (!raw.storeName) {
          invalidRows.push({ rowNumber: i + 2, reason: "Missing store name" });
          continue;
        }
        const store = await db.findStoreByNameAndWilayat(raw.storeName, wilayatScope || undefined);
        if (!store) {
          invalidRows.push({ rowNumber: i + 2, reason: `Store "${raw.storeName}" not found` });
          continue;
        }
        // Resolve order if provided
        let orderId: number | null = null;
        if (raw.orderNumber) {
          const order = await db.findOrderByNumber(raw.orderNumber);
          if (order) orderId = order.id;
        }
        const settlementStatus = normalizeValue(raw.settlementStatus, STORE_DUE_SETTLEMENT_STATUS_MAP, "unsettled");
        const normalized = {
          storeId: store.id,
          orderId,
          totalSalesAmount: parseNumber(raw.totalSalesAmount),
          commissionPercentage: raw.commissionPercentage?.trim() || null,
          commissionAmount: parseNumber(raw.commissionAmount),
          storeDueAmount: parseNumber(raw.storeDueAmount),
          paidAmount: parseNumber(raw.paidAmount),
          remainingAmount: parseNumber(raw.remainingAmount),
          settlementStatus: settlementStatus as any,
          settlementDate: parseDate(raw.settlementDate),
          notes: sanitizeText(raw.notes, 1000) || null,
        };
        validRows.push({ rowNumber: i + 2, data: normalized, isDuplicate: false });
      }
      const batch = await db.createImportBatch({
        importType: "store_dues",
        fileName: input.fileName,
        uploadedById: ctx.user!.id,
        uploadedByName: ctx.user!.name || "",
        totalRows: input.rows.length,
        importedRows: 0,
        skippedRows: invalidRows.length,
        duplicateRows: 0,
        status: "pending_preview",
        duplicateHandling: input.duplicateHandling,
        errorSummary: invalidRows.length > 0 ? invalidRows.slice(0, 50) : null,
        validRowsData: validRows,
      });
      return {
        batchId: batch.id,
        totalRows: input.rows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        duplicateRows: 0,
        preview: validRows.slice(0, 20),
        errors: invalidRows.slice(0, 50),
        duplicates: [],
      };
    }),
  confirm: protectedProcedure
    .input(z.object({
      batchId: z.number(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportStoreDues");
      const batch = await db.getImportBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import batch not found" });
      if (batch.status !== "pending_preview") throw new TRPCError({ code: "BAD_REQUEST", message: "Batch already processed" });
      const allRows = (batch.validRowsData as any[]) || [];
      let importedCount = 0;
      let skippedCount = 0;
      const errors: any[] = [];
      for (const row of allRows) {
        try {
          await db.createStoreDue(row.data as any);
          importedCount++;
        } catch (err: any) {
          errors.push({ rowNumber: row.rowNumber, error: err.message });
          skippedCount++;
        }
      }
      const status = errors.length > 0 ? "imported_with_errors" : "imported";
      await db.updateImportBatch(input.batchId, {
        importedRows: importedCount,
        skippedRows: skippedCount + (batch.skippedRows || 0),
        status,
        errorSummary: errors.length > 0 ? errors : null,
        validRowsData: null,
      });
      await db.createAuditLog({
        userId: ctx.user!.id,
        userName: ctx.user!.name ?? "",
        actionType: "import_confirmed",
        entityType: "store_due",
        notes: `Batch #${input.batchId}: ${importedCount} store dues imported, ${skippedCount} skipped`,
      });
      return { batchId: input.batchId, importedCount, skippedCount, errors, status };
    }),
});

// ============================================================
// SETTLEMENTS IMPORT
// ============================================================
const settlementsImportRouter = router({
  parse: protectedProcedure
    .input(z.object({
      rows: z.array(z.array(z.any())),
      headers: z.array(z.string()),
      fileName: z.string(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportSettlements");
      const columnMapping = mapColumns(input.headers, SETTLEMENT_COLUMN_MAP);
      const validRows: any[] = [];
      const invalidRows: any[] = [];

      for (let i = 0; i < input.rows.length; i++) {
        const raw = parseRow(input.rows[i], columnMapping);
        const settlementType = normalizeValue(raw.settlementType, SETTLEMENT_TYPE_MAP, "other");
        const relatedEntityType = raw.relatedEntityType ? normalizeValue(raw.relatedEntityType, SETTLEMENT_ENTITY_TYPE_MAP, "other") : null;
        const status = normalizeValue(raw.status, SETTLEMENT_STATUS_MAP, "pending");
        const amount = parseNumber(raw.amount);
        // Resolve related entity
        let relatedEntityId: number | null = null;
        let relatedEntityName = sanitizeText(raw.relatedEntityName, 255) || null;
        if (relatedEntityName && relatedEntityType) {
          if (relatedEntityType === "mandoub") {
            const m = await db.findMandoubByName(relatedEntityName);
            if (m) relatedEntityId = m.id;
          } else if (relatedEntityType === "store") {
            const s = await db.findStoreByName(relatedEntityName);
            if (s) relatedEntityId = s.id;
          } else if (relatedEntityType === "customer") {
            // Try by phone if it looks like a phone number
            if (raw.relatedEntityName?.match(/^\d/)) {
              const c = await db.findCustomerByPhone(raw.relatedEntityName);
              if (c) relatedEntityId = c.id;
            }
          }
        }
        // Resolve order
        let orderId: number | null = null;
        if (raw.orderNumber) {
          const order = await db.findOrderByNumber(raw.orderNumber);
          if (order) orderId = order.id;
        }
        // Resolve booking
        let bookingId: number | null = null;
        if (raw.bookingNumber) {
          const booking = await db.findBookingByNumber(raw.bookingNumber);
          if (booking) bookingId = booking.id;
        }
        const normalized = {
          settlementType: settlementType as any,
          relatedEntityType: relatedEntityType as any,
          relatedEntityId,
          relatedEntityName,
          orderId,
          bookingId,
          amount,
          reason: sanitizeText(raw.reason, 1000) || null,
          status: status as any,
          settlementDate: parseDate(raw.settlementDate),
          registeredById: ctx.user!.id,
          notes: sanitizeText(raw.notes, 1000) || null,
        };
        validRows.push({ rowNumber: i + 2, data: normalized, isDuplicate: false });
      }
      const batch = await db.createImportBatch({
        importType: "settlements",
        fileName: input.fileName,
        uploadedById: ctx.user!.id,
        uploadedByName: ctx.user!.name || "",
        totalRows: input.rows.length,
        importedRows: 0,
        skippedRows: invalidRows.length,
        duplicateRows: 0,
        status: "pending_preview",
        duplicateHandling: input.duplicateHandling,
        errorSummary: invalidRows.length > 0 ? invalidRows.slice(0, 50) : null,
        validRowsData: validRows,
      });
      return {
        batchId: batch.id,
        totalRows: input.rows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        duplicateRows: 0,
        preview: validRows.slice(0, 20),
        errors: invalidRows.slice(0, 50),
        duplicates: [],
      };
    }),
  confirm: protectedProcedure
    .input(z.object({
      batchId: z.number(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportSettlements");
      const batch = await db.getImportBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import batch not found" });
      if (batch.status !== "pending_preview") throw new TRPCError({ code: "BAD_REQUEST", message: "Batch already processed" });
      const allRows = (batch.validRowsData as any[]) || [];
      let importedCount = 0;
      let skippedCount = 0;
      const errors: any[] = [];
      for (const row of allRows) {
        try {
          await db.createSettlement(row.data as any);
          importedCount++;
        } catch (err: any) {
          errors.push({ rowNumber: row.rowNumber, error: err.message });
          skippedCount++;
        }
      }
      const status = errors.length > 0 ? "imported_with_errors" : "imported";
      await db.updateImportBatch(input.batchId, {
        importedRows: importedCount,
        skippedRows: skippedCount + (batch.skippedRows || 0),
        status,
        errorSummary: errors.length > 0 ? errors : null,
        validRowsData: null,
      });
      await db.createAuditLog({
        userId: ctx.user!.id,
        userName: ctx.user!.name ?? "",
        actionType: "import_confirmed",
        entityType: "settlement",
        notes: `Batch #${input.batchId}: ${importedCount} settlements imported, ${skippedCount} skipped`,
      });
      return { batchId: input.batchId, importedCount, skippedCount, errors, status };
    }),
});

// ============================================================
// COMPLAINTS IMPORT
// ============================================================
const complaintsImportRouter = router({
  parse: protectedProcedure
    .input(z.object({
      rows: z.array(z.array(z.any())),
      headers: z.array(z.string()),
      fileName: z.string(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportComplaints");
      const columnMapping = mapColumns(input.headers, COMPLAINT_COLUMN_MAP);
      const validRows: any[] = [];
      const invalidRows: any[] = [];

      for (let i = 0; i < input.rows.length; i++) {
        const raw = parseRow(input.rows[i], columnMapping);
        const complaintType = normalizeValue(raw.complaintType, COMPLAINT_TYPE_MAP, "other");
        const status = normalizeValue(raw.status, COMPLAINT_STATUS_MAP, "new");
        // Resolve customer
        let customerId: number | null = null;
        if (raw.customerPhone) {
          const c = await db.findCustomerByPhone(raw.customerPhone);
          if (c) customerId = c.id;
        }
        // Resolve order
        let orderId: number | null = null;
        if (raw.orderNumber) {
          const order = await db.findOrderByNumber(raw.orderNumber);
          if (order) orderId = order.id;
        }
        // Resolve booking
        let bookingId: number | null = null;
        if (raw.bookingNumber) {
          const booking = await db.findBookingByNumber(raw.bookingNumber);
          if (booking) bookingId = booking.id;
        }
        // Resolve store
        let storeId: number | null = null;
        if (raw.storeName) {
          const s = await db.findStoreByName(raw.storeName);
          if (s) storeId = s.id;
        }
        // Resolve mandoub
        let mandoubId: number | null = null;
        if (raw.mandoubName) {
          const m = await db.findMandoubByName(raw.mandoubName);
          if (m) mandoubId = m.id;
        }
        const normalized = {
          customerId,
          customerName: sanitizeText(raw.customerName, 255) || null,
          customerPhone: raw.customerPhone?.trim() || null,
          orderId,
          bookingId,
          storeId,
          mandoubId,
          complaintType: complaintType as any,
          description: sanitizeText(raw.description, 2000) || null,
          status: status as any,
          resolutionNotes: sanitizeText(raw.resolutionNotes, 2000) || null,
        };
        validRows.push({ rowNumber: i + 2, data: normalized, isDuplicate: false });
      }
      const batch = await db.createImportBatch({
        importType: "complaints",
        fileName: input.fileName,
        uploadedById: ctx.user!.id,
        uploadedByName: ctx.user!.name || "",
        totalRows: input.rows.length,
        importedRows: 0,
        skippedRows: invalidRows.length,
        duplicateRows: 0,
        status: "pending_preview",
        duplicateHandling: input.duplicateHandling,
        errorSummary: invalidRows.length > 0 ? invalidRows.slice(0, 50) : null,
        validRowsData: validRows,
      });
      return {
        batchId: batch.id,
        totalRows: input.rows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        duplicateRows: 0,
        preview: validRows.slice(0, 20),
        errors: invalidRows.slice(0, 50),
        duplicates: [],
      };
    }),
  confirm: protectedProcedure
    .input(z.object({
      batchId: z.number(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportComplaints");
      const batch = await db.getImportBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import batch not found" });
      if (batch.status !== "pending_preview") throw new TRPCError({ code: "BAD_REQUEST", message: "Batch already processed" });
      const allRows = (batch.validRowsData as any[]) || [];
      let importedCount = 0;
      let skippedCount = 0;
      const errors: any[] = [];
      for (const row of allRows) {
        try {
          await db.createComplaint(row.data as any);
          importedCount++;
        } catch (err: any) {
          errors.push({ rowNumber: row.rowNumber, error: err.message });
          skippedCount++;
        }
      }
      const status = errors.length > 0 ? "imported_with_errors" : "imported";
      await db.updateImportBatch(input.batchId, {
        importedRows: importedCount,
        skippedRows: skippedCount + (batch.skippedRows || 0),
        status,
        errorSummary: errors.length > 0 ? errors : null,
        validRowsData: null,
      });
      await db.createAuditLog({
        userId: ctx.user!.id,
        userName: ctx.user!.name ?? "",
        actionType: "import_confirmed",
        entityType: "complaint",
        notes: `Batch #${input.batchId}: ${importedCount} complaints imported, ${skippedCount} skipped`,
      });
      return { batchId: input.batchId, importedCount, skippedCount, errors, status };
    }),
});

// ============================================================
// COMBINED P3 DATA IMPORT ROUTER
// ============================================================
export const dataImportP3Router = router({
  bookings: bookingsImportRouter,
  coupons: couponsImportRouter,
  expenses: expensesImportRouter,
  storeDues: storeDuesImportRouter,
  settlements: settlementsImportRouter,
  complaints: complaintsImportRouter,
});
