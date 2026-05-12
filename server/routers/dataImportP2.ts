import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { hasPermission, isSuperAdmin, MaksabRole, Permission } from "@shared/permissions";
import * as db from "../db";
import {
  MANDOUB_COLUMN_MAP, MANDOUB_PERFORMANCE_COLUMN_MAP, MANDOUB_DUES_COLUMN_MAP,
  REFUND_COLUMN_MAP, REVENUE_COLUMN_MAP,
  MANDOUB_TYPE_MAP, MANDOUB_STATUS_MAP,
  EARNING_TYPE_MAP, MANDOUB_PAYMENT_STATUS_MAP,
  REFUND_TYPE_MAP, CAUSED_BY_MAP, COVERED_BY_MAP, REFUND_STATUS_MAP,
  REVENUE_SOURCE_MAP, REVENUE_STATUS_MAP, REVENUE_PAYMENT_METHOD_MAP,
  YES_NO_BOOLEAN_MAP, ORDER_STATUS_MAP,
  normalizeValue, normalizeBooleanValue, mapColumns, parseRow, sanitizeText,
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

// ============================================================
// MANDOUBS IMPORT
// ============================================================

const mandoubsImportRouter = router({
  parse: protectedProcedure
    .input(z.object({
      rows: z.array(z.array(z.any())),
      headers: z.array(z.string()),
      fileName: z.string(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportMandoubs");
      const wilayatScope = getWilayatScope(ctx.user!);

      const columnMapping = mapColumns(input.headers, MANDOUB_COLUMN_MAP);
      const validRows: any[] = [];
      const invalidRows: any[] = [];
      const duplicateRows: any[] = [];

      for (let i = 0; i < input.rows.length; i++) {
        const raw = parseRow(input.rows[i], columnMapping);
        const fullName = sanitizeText(raw.fullName, 255);
        if (!fullName) {
          invalidRows.push({ rowNumber: i + 2, reason: "Missing mandoub name (اسم المندوب)", data: raw });
          continue;
        }

        const mandoubType = normalizeValue(raw.mandoubType, MANDOUB_TYPE_MAP, "fast");
        const status = normalizeValue(raw.status, MANDOUB_STATUS_MAP, "pending_approval");

        // Wilayat lookup
        let wilayatId: number | null = null;
        if (raw.wilayat) {
          const w = await db.findWilayatByName(raw.wilayat.trim());
          if (w) {
            if (wilayatScope && w.id !== wilayatScope) {
              invalidRows.push({ rowNumber: i + 2, reason: "Wilayat outside your access scope", data: raw });
              continue;
            }
            wilayatId = w.id;
          }
        }

        // Duplicate check by phone
        if (raw.phone) {
          const existing = await db.findMandoubByPhone(raw.phone.trim());
          if (existing) {
            duplicateRows.push({ rowNumber: i + 2, data: raw, existingId: existing.id });
            if (input.duplicateHandling === "skip") continue;
          }
        }

        // Approval rule: imported mandoubs NOT active unless user has ApproveMandoub permission
        let finalStatus = status;
        if (status === "active") {
          const role = getEffectiveRole(ctx.user!);
          if (!isSuperAdmin(role) && !hasPermission(role, ctx.user!.permissions as any, "ApproveMandoub")) {
            finalStatus = "pending_approval";
          }
        }

        const normalized = {
          fullName,
          phone: raw.phone?.trim() || null,
          email: raw.email?.trim() || null,
          wilayatId,
          mandoubType,
          status: finalStatus,
          notes: sanitizeText(raw.notes, 1000) || null,
        };

        validRows.push({ rowNumber: i + 2, data: normalized, isDuplicate: false });
      }

      const batch = await db.createImportBatch({
        importType: "mandoubs",
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
      requireImportPermission(ctx.user!, "ImportMandoubs");

      const batch = await db.getImportBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import batch not found" });
      if (batch.status !== "pending_preview") throw new TRPCError({ code: "BAD_REQUEST", message: "Batch already processed" });

      const allRows = (batch.validRowsData as any[]) || [];
      let importedCount = 0;
      let skippedCount = 0;
      const errors: any[] = [];

      for (const row of allRows) {
        try {
          await db.createMandoub(row.data as any);
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
        entityType: "mandoub",
        notes: `Batch #${input.batchId}: ${importedCount} mandoubs imported, ${skippedCount} skipped`,
      });

      return { batchId: input.batchId, importedCount, skippedCount, errors, status };
    }),
});

// ============================================================
// MANDOUB PERFORMANCE IMPORT
// ============================================================

const mandoubPerformanceImportRouter = router({
  parse: protectedProcedure
    .input(z.object({
      rows: z.array(z.array(z.any())),
      headers: z.array(z.string()),
      fileName: z.string(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportMandoubPerformance");

      const columnMapping = mapColumns(input.headers, MANDOUB_PERFORMANCE_COLUMN_MAP);
      const validRows: any[] = [];
      const invalidRows: any[] = [];
      const duplicateRows: any[] = [];

      for (let i = 0; i < input.rows.length; i++) {
        const raw = parseRow(input.rows[i], columnMapping);

        // Must have mandoub identifier (name or phone)
        if (!raw.mandoubName && !raw.mandoubPhone) {
          invalidRows.push({ rowNumber: i + 2, reason: "Missing mandoub name or phone", data: raw });
          continue;
        }

        // Find mandoub
        let mandoubId: number | null = null;
        if (raw.mandoubPhone) {
          const m = await db.findMandoubByPhone(raw.mandoubPhone.trim());
          if (m) mandoubId = m.id;
        }
        if (!mandoubId && raw.mandoubName) {
          const m = await db.findMandoubByName(raw.mandoubName.trim());
          if (m) mandoubId = m.id;
        }
        if (!mandoubId) {
          invalidRows.push({ rowNumber: i + 2, reason: "Mandoub not found in system", data: raw });
          continue;
        }

        // Find order if orderNumber provided
        let orderId: number | null = null;
        const orderNumber = raw.orderNumber?.trim() || null;
        if (orderNumber) {
          const order = await db.findOrderByNumber(orderNumber);
          if (order) orderId = order.id;
        }

        // Duplicate check: same mandoub + same order number
        if (orderNumber) {
          const existing = await db.findMandoubPerformanceDuplicate(mandoubId, orderNumber);
          if (existing) {
            duplicateRows.push({ rowNumber: i + 2, data: raw, existingId: existing.id });
            if (input.duplicateHandling === "skip") continue;
          }
        }

        const delayed = normalizeBooleanValue(raw.delayed, YES_NO_BOOLEAN_MAP, false);
        const deliveryDuration = raw.deliveryDuration ? parseInt(raw.deliveryDuration) : null;
        const orderStatus = raw.orderStatus ? normalizeValue(raw.orderStatus, ORDER_STATUS_MAP, raw.orderStatus) : null;

        const normalized = {
          mandoubId,
          orderId,
          orderNumber,
          orderDate: parseDate(raw.orderDate),
          acceptedAt: parseDate(raw.acceptedTime),
          pickedUpAt: parseDate(raw.pickupTime),
          deliveredAt: parseDate(raw.deliveryTime),
          deliveryDurationMinutes: isNaN(deliveryDuration as any) ? null : deliveryDuration,
          orderStatus,
          delayed,
          performanceRating: raw.performanceRating?.trim() || null,
          notes: sanitizeText(raw.notes, 1000) || null,
        };

        validRows.push({ rowNumber: i + 2, data: normalized, isDuplicate: false });
      }

      const batch = await db.createImportBatch({
        importType: "mandoub_performance",
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
      requireImportPermission(ctx.user!, "ImportMandoubPerformance");

      const batch = await db.getImportBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import batch not found" });
      if (batch.status !== "pending_preview") throw new TRPCError({ code: "BAD_REQUEST", message: "Batch already processed" });

      const allRows = (batch.validRowsData as any[]) || [];
      let importedCount = 0;
      let skippedCount = 0;
      const errors: any[] = [];

      for (const row of allRows) {
        try {
          await db.createMandoubPerformance({ ...row.data, importBatchId: input.batchId } as any);
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
        entityType: "mandoub_performance",
        notes: `Batch #${input.batchId}: ${importedCount} performance records imported, ${skippedCount} skipped`,
      });

      return { batchId: input.batchId, importedCount, skippedCount, errors, status };
    }),
});

// ============================================================
// MANDOUB DUES IMPORT
// ============================================================

const mandoubDuesImportRouter = router({
  parse: protectedProcedure
    .input(z.object({
      rows: z.array(z.array(z.any())),
      headers: z.array(z.string()),
      fileName: z.string(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportMandoubDues");

      const columnMapping = mapColumns(input.headers, MANDOUB_DUES_COLUMN_MAP);
      const validRows: any[] = [];
      const invalidRows: any[] = [];
      const duplicateRows: any[] = [];

      for (let i = 0; i < input.rows.length; i++) {
        const raw = parseRow(input.rows[i], columnMapping);

        // Must have mandoub identifier
        if (!raw.mandoubName && !raw.mandoubPhone) {
          invalidRows.push({ rowNumber: i + 2, reason: "Missing mandoub name or phone", data: raw });
          continue;
        }

        // Find mandoub
        let mandoubId: number | null = null;
        if (raw.mandoubPhone) {
          const m = await db.findMandoubByPhone(raw.mandoubPhone.trim());
          if (m) mandoubId = m.id;
        }
        if (!mandoubId && raw.mandoubName) {
          const m = await db.findMandoubByName(raw.mandoubName.trim());
          if (m) mandoubId = m.id;
        }
        if (!mandoubId) {
          invalidRows.push({ rowNumber: i + 2, reason: "Mandoub not found in system", data: raw });
          continue;
        }

        // earningType is required
        const earningType = normalizeValue(raw.earningType, EARNING_TYPE_MAP, "");
        if (!earningType) {
          invalidRows.push({ rowNumber: i + 2, reason: "Missing or invalid earning type (نوع الاستحقاق)", data: raw });
          continue;
        }

        // Find order if provided
        let orderId: number | null = null;
        if (raw.orderNumber) {
          const order = await db.findOrderByNumber(raw.orderNumber.trim());
          if (order) orderId = order.id;
        }

        // Duplicate check: same mandoub + same order + same earningType
        const existing = await db.findMandoubDueDuplicate(mandoubId, orderId, earningType);
        if (existing) {
          duplicateRows.push({ rowNumber: i + 2, data: raw, existingId: existing.id });
          if (input.duplicateHandling === "skip") continue;
        }

        const amount = raw.amount?.trim() || "0";
        const paidAmount = raw.paidAmount?.trim() || "0";
        const remainingAmount = raw.remainingAmount?.trim() ||
          String(Math.max(0, parseFloat(amount) - parseFloat(paidAmount)));
        const paymentStatus = normalizeValue(raw.paymentStatus, MANDOUB_PAYMENT_STATUS_MAP, "unpaid");

        const normalized = {
          mandoubId,
          earningType,
          orderId,
          periodStart: parseDate(raw.periodStart),
          periodEnd: parseDate(raw.periodEnd),
          amount,
          paidAmount,
          remainingAmount,
          paymentStatus,
          paymentDate: parseDate(raw.paymentDate),
          notes: sanitizeText(raw.notes, 1000) || null,
        };

        validRows.push({ rowNumber: i + 2, data: normalized, isDuplicate: false });
      }

      const batch = await db.createImportBatch({
        importType: "mandoub_dues",
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
      requireImportPermission(ctx.user!, "ImportMandoubDues");

      const batch = await db.getImportBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import batch not found" });
      if (batch.status !== "pending_preview") throw new TRPCError({ code: "BAD_REQUEST", message: "Batch already processed" });

      const allRows = (batch.validRowsData as any[]) || [];
      let importedCount = 0;
      let skippedCount = 0;
      const errors: any[] = [];

      for (const row of allRows) {
        try {
          await db.createMandoubDue(row.data as any);
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
        entityType: "mandoub_due",
        notes: `Batch #${input.batchId}: ${importedCount} mandoub dues imported, ${skippedCount} skipped`,
      });

      return { batchId: input.batchId, importedCount, skippedCount, errors, status };
    }),
});

// ============================================================
// CANCELLATIONS & REFUNDS IMPORT
// ============================================================

const refundsImportRouter = router({
  parse: protectedProcedure
    .input(z.object({
      rows: z.array(z.array(z.any())),
      headers: z.array(z.string()),
      fileName: z.string(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportRefunds");

      const columnMapping = mapColumns(input.headers, REFUND_COLUMN_MAP);
      const validRows: any[] = [];
      const invalidRows: any[] = [];
      const duplicateRows: any[] = [];

      for (let i = 0; i < input.rows.length; i++) {
        const raw = parseRow(input.rows[i], columnMapping);

        // Must have order or booking reference
        if (!raw.orderNumber && !raw.bookingNumber) {
          invalidRows.push({ rowNumber: i + 2, reason: "Missing order number or booking number", data: raw });
          continue;
        }

        // Find order/booking
        let orderId: number | null = null;
        let bookingId: number | null = null;
        if (raw.orderNumber) {
          const order = await db.findOrderByNumber(raw.orderNumber.trim());
          if (order) orderId = order.id;
        }
        if (raw.bookingNumber) {
          const booking = await db.findBookingByNumber(raw.bookingNumber.trim());
          if (booking) bookingId = booking.id;
        }

        const refundType = normalizeValue(raw.refundType, REFUND_TYPE_MAP, "full");
        const refundAmount = raw.refundAmount?.trim() || "0";

        // Duplicate check: same order/booking + same amount + same reason
        if (orderId || bookingId) {
          const existing = await db.findRefundDuplicate(orderId, bookingId, refundAmount);
          if (existing) {
            duplicateRows.push({ rowNumber: i + 2, data: raw, existingId: existing.id });
            if (input.duplicateHandling === "skip") continue;
          }
        }

        const normalized = {
          orderId,
          bookingId,
          reason: sanitizeText(raw.reason, 1000) || null,
          paidAmount: raw.paidAmount?.trim() || "0",
          refundAmount,
          refundType,
          whoCausedIssue: normalizeValue(raw.causedBy, CAUSED_BY_MAP, null as any) || null,
          whoCoversDifference: normalizeValue(raw.coveredBy, COVERED_BY_MAP, "not_specified"),
          mandoubOwedMoney: normalizeBooleanValue(raw.mandoubOwedMoney, YES_NO_BOOLEAN_MAP, false),
          storeOwedMoney: normalizeBooleanValue(raw.storeOwedMoney, YES_NO_BOOLEAN_MAP, false),
          companyCoveredAmount: raw.companyCoveredAmount?.trim() || "0",
          status: normalizeValue(raw.status, REFUND_STATUS_MAP, "pending_review"),
          notes: sanitizeText(raw.notes, 1000) || null,
        };

        validRows.push({ rowNumber: i + 2, data: normalized, isDuplicate: false });
      }

      const batch = await db.createImportBatch({
        importType: "refunds",
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
      requireImportPermission(ctx.user!, "ImportRefunds");

      const batch = await db.getImportBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import batch not found" });
      if (batch.status !== "pending_preview") throw new TRPCError({ code: "BAD_REQUEST", message: "Batch already processed" });

      const allRows = (batch.validRowsData as any[]) || [];
      let importedCount = 0;
      let skippedCount = 0;
      const errors: any[] = [];

      for (const row of allRows) {
        try {
          await db.createRefund(row.data as any);
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
        entityType: "refund",
        notes: `Batch #${input.batchId}: ${importedCount} refunds imported, ${skippedCount} skipped`,
      });

      return { batchId: input.batchId, importedCount, skippedCount, errors, status };
    }),
});

// ============================================================
// REVENUES IMPORT
// ============================================================

const revenuesImportRouter = router({
  parse: protectedProcedure
    .input(z.object({
      rows: z.array(z.array(z.any())),
      headers: z.array(z.string()),
      fileName: z.string(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportRevenues");

      const columnMapping = mapColumns(input.headers, REVENUE_COLUMN_MAP);
      const validRows: any[] = [];
      const invalidRows: any[] = [];
      const duplicateRows: any[] = [];

      for (let i = 0; i < input.rows.length; i++) {
        const raw = parseRow(input.rows[i], columnMapping);

        const source = normalizeValue(raw.source, REVENUE_SOURCE_MAP, "");
        if (!source) {
          invalidRows.push({ rowNumber: i + 2, reason: "Missing or invalid revenue source (مصدر الإيراد)", data: raw });
          continue;
        }

        const amount = raw.amount?.trim() || "0";
        if (amount === "0" || !raw.amount) {
          invalidRows.push({ rowNumber: i + 2, reason: "Missing amount (المبلغ)", data: raw });
          continue;
        }

        // Find linked entities
        let orderId: number | null = null;
        let bookingId: number | null = null;
        let storeId: number | null = null;
        let wilayatId: number | null = null;

        if (raw.orderNumber) {
          const order = await db.findOrderByNumber(raw.orderNumber.trim());
          if (order) orderId = order.id;
        }
        if (raw.bookingNumber) {
          const booking = await db.findBookingByNumber(raw.bookingNumber.trim());
          if (booking) bookingId = booking.id;
        }
        if (raw.storeName) {
          const store = await db.findStoreByName(raw.storeName.trim());
          if (store) storeId = store.id;
        }
        if (raw.wilayat) {
          const w = await db.findWilayatByName(raw.wilayat.trim());
          if (w) wilayatId = w.id;
        }

        // Duplicate check: same source + same linked entity + same amount
        const existing = await db.findRevenueDuplicate(source, orderId, bookingId, amount);
        if (existing) {
          duplicateRows.push({ rowNumber: i + 2, data: raw, existingId: existing.id });
          if (input.duplicateHandling === "skip") continue;
        }

        const normalized = {
          revenueDate: parseDate(raw.revenueDate) || new Date(),
          source,
          orderId,
          bookingId,
          storeId,
          wilayatId,
          amount,
          paymentMethod: normalizeValue(raw.paymentMethod, REVENUE_PAYMENT_METHOD_MAP, null as any) || null,
          registeredById: ctx.user!.id,
          status: normalizeValue(raw.status, REVENUE_STATUS_MAP, "recorded"),
          notes: sanitizeText(raw.notes, 1000) || null,
        };

        validRows.push({ rowNumber: i + 2, data: normalized, isDuplicate: false });
      }

      const batch = await db.createImportBatch({
        importType: "revenues",
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
      requireImportPermission(ctx.user!, "ImportRevenues");

      const batch = await db.getImportBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import batch not found" });
      if (batch.status !== "pending_preview") throw new TRPCError({ code: "BAD_REQUEST", message: "Batch already processed" });

      const allRows = (batch.validRowsData as any[]) || [];
      let importedCount = 0;
      let skippedCount = 0;
      const errors: any[] = [];

      for (const row of allRows) {
        try {
          await db.createRevenue(row.data as any);
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
        entityType: "revenue",
        notes: `Batch #${input.batchId}: ${importedCount} revenues imported, ${skippedCount} skipped`,
      });

      return { batchId: input.batchId, importedCount, skippedCount, errors, status };
    }),
});

// ============================================================
// COMBINED P2 DATA IMPORT ROUTER
// ============================================================

export const dataImportP2Router = router({
  mandoubs: mandoubsImportRouter,
  mandoubPerformance: mandoubPerformanceImportRouter,
  mandoubDues: mandoubDuesImportRouter,
  refunds: refundsImportRouter,
  revenues: revenuesImportRouter,
});
