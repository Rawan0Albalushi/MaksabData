import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { hasPermission, isSuperAdmin, MaksabRole, Permission } from "@shared/permissions";
import * as db from "../db";
import {
  STORE_COLUMN_MAP, PRODUCT_COLUMN_MAP, CUSTOMER_COLUMN_MAP,
  ORDER_COLUMN_MAP, PAYMENT_COLUMN_MAP,
  STORE_CATEGORY_MAP, CLASSIFICATION_MAP, COMMUNICATION_STATUS_MAP,
  MERCHANT_APPROVAL_MAP, ADDED_IN_SYSTEM_MAP, ACTIVATION_STATUS_MAP,
  PRODUCT_STATUS_MAP, SHOW_IN_APP_MAP,
  CUSTOMER_STATUS_MAP, ORDER_TYPE_MAP, ORDER_STATUS_MAP,
  PAYMENT_STATUS_MAP, PAYMENT_METHOD_MAP, PAYMENT_TABLE_METHOD_MAP,
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

// ============================================================
// STORES IMPORT
// ============================================================

const storesImportRouter = router({
  parse: protectedProcedure
    .input(z.object({
      rows: z.array(z.array(z.any())),
      headers: z.array(z.string()),
      fileName: z.string(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportStores");
      const wilayatScope = getWilayatScope(ctx.user!);

      const columnMapping = mapColumns(input.headers, STORE_COLUMN_MAP);
      const validRows: any[] = [];
      const invalidRows: any[] = [];
      const duplicateRows: any[] = [];

      const existingStores = await db.getAllStoresSimple();

      for (let i = 0; i < input.rows.length; i++) {
        const row = input.rows[i];
        const parsed = parseRow(row, columnMapping);

        if (!parsed.nameAr || parsed.nameAr.trim() === "") {
          invalidRows.push({ rowNumber: i + 2, reason: "Missing Store Name / اسم المحل", data: parsed });
          continue;
        }

        const normalized: any = {
          nameAr: sanitizeText(parsed.nameAr, 255),
          nameEn: sanitizeText(parsed.nameEn, 255) || null,
          merchantName: sanitizeText(parsed.merchantName, 255) || null,
          merchantPhone: sanitizeText(parsed.merchantPhone, 20) || null,
          whatsappNumber: sanitizeText(parsed.whatsappNumber, 20) || null,
          category: normalizeValue(parsed.category, STORE_CATEGORY_MAP, "other"),
          communicationStatus: normalizeValue(parsed.communicationStatus, COMMUNICATION_STATUS_MAP, "not_specified"),
          merchantApproval: normalizeValue(parsed.merchantApproval, MERCHANT_APPROVAL_MAP, "not_specified"),
          addedInSystem: normalizeValue(parsed.addedInSystem, ADDED_IN_SYSTEM_MAP, "not_specified"),
          activationStatus: normalizeValue(parsed.activationStatus, ACTIVATION_STATUS_MAP, "not_specified"),
          classification: normalizeValue(parsed.classification, CLASSIFICATION_MAP, "not_specified"),
          region: sanitizeText(parsed.region, 255) || null,
          responsibleEmployee: sanitizeText(parsed.responsibleEmployee, 255) || null,
          googleMapsLink: sanitizeText(parsed.googleMapsLink, 512) || null,
          address: sanitizeText(parsed.address, 500) || null,
          notes: sanitizeText(parsed.notes, 1000) || null,
        };

        if (parsed.wilayat) {
          const wilayat = await db.findWilayatByName(parsed.wilayat.trim());
          if (wilayat) normalized.wilayatId = wilayat.id;
        }

        if (wilayatScope && normalized.wilayatId && normalized.wilayatId !== wilayatScope) {
          invalidRows.push({ rowNumber: i + 2, reason: "Wilayat access denied", data: parsed });
          continue;
        }

        if (normalized.activationStatus === "active") {
          const role = getEffectiveRole(ctx.user!);
          if (!isSuperAdmin(role) && !hasPermission(role, ctx.user!.permissions as any, "ActivateStore")) {
            normalized.activationStatus = "pending_activation";
          }
        }

        const isDuplicate = existingStores.some(
          (s: any) => s.nameAr === normalized.nameAr && (!normalized.wilayatId || s.wilayatId === normalized.wilayatId)
        );

        if (isDuplicate) {
          duplicateRows.push({ rowNumber: i + 2, data: normalized, existingMatch: true });
          if (input.duplicateHandling === "skip") continue;
        }

        validRows.push({ rowNumber: i + 2, data: normalized, isDuplicate });
      }

      // Store ALL valid rows in the batch for later confirm
      const batch = await db.createImportBatch({
        importType: "stores",
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
        validRowsData: validRows, // ALL valid rows stored server-side
      });

      return {
        batchId: batch.id,
        totalRows: input.rows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        duplicateRows: duplicateRows.length,
        preview: validRows.slice(0, 20), // Only first 20 for display
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
      requireImportPermission(ctx.user!, "ImportStores");

      // Retrieve ALL valid rows from the stored batch
      const batch = await db.getImportBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import batch not found" });
      if (batch.status !== "pending_preview") throw new TRPCError({ code: "BAD_REQUEST", message: "Batch already processed" });

      const allRows = (batch.validRowsData as any[]) || [];
      let importedCount = 0;
      let skippedCount = 0;
      const errors: any[] = [];

      for (const row of allRows) {
        try {
          if (row.isDuplicate && input.duplicateHandling === "skip") {
            skippedCount++;
            continue;
          }
          if (row.isDuplicate && input.duplicateHandling === "update_existing") {
            const existing = await db.findStoreByNameAndWilayat(row.data.nameAr, row.data.wilayatId);
            if (existing) {
              await db.updateStore(existing.id, row.data);
              importedCount++;
              continue;
            }
          }
          await db.createStore({ ...row.data, createdById: ctx.user!.id } as any);
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
        validRowsData: null, // Clear stored rows after import
      });

      await db.createAuditLog({
        userId: ctx.user!.id,
        userName: ctx.user!.name ?? "",
        actionType: "import_confirmed",
        entityType: "store",
        notes: `Batch #${input.batchId}: ${importedCount} stores imported, ${skippedCount} skipped (total valid: ${allRows.length})`,
      });

      return { batchId: input.batchId, importedCount, skippedCount, errors, status };
    }),
});

// ============================================================
// PRODUCTS IMPORT
// ============================================================

const productsImportRouter = router({
  parse: protectedProcedure
    .input(z.object({
      rows: z.array(z.array(z.any())),
      headers: z.array(z.string()),
      fileName: z.string(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportProducts");

      const columnMapping = mapColumns(input.headers, PRODUCT_COLUMN_MAP);
      const validRows: any[] = [];
      const invalidRows: any[] = [];
      const duplicateRows: any[] = [];

      for (let i = 0; i < input.rows.length; i++) {
        const row = input.rows[i];
        const parsed = parseRow(row, columnMapping);

        if (!parsed.productName || parsed.productName.trim() === "") {
          invalidRows.push({ rowNumber: i + 2, reason: "Missing Product Name / اسم المنتج", data: parsed });
          continue;
        }

        let storeId: number | null = null;
        if (parsed.storeId) {
          storeId = parseInt(parsed.storeId);
          if (isNaN(storeId)) storeId = null;
        }
        if (!storeId && parsed.storeName) {
          const store = await db.findStoreByName(parsed.storeName.trim());
          if (store) storeId = store.id;
        }

        if (!storeId) {
          invalidRows.push({ rowNumber: i + 2, reason: "Cannot match store (Store Name or Store ID required)", data: parsed });
          continue;
        }

        const normalized: any = {
          storeId,
          name: sanitizeText(parsed.productName, 255),
          menuCategory: sanitizeText(parsed.menuCategory, 100) || null,
          price: parsed.price || null,
          description: sanitizeText(parsed.description, 1000) || null,
          productStatus: normalizeValue(parsed.productStatus, PRODUCT_STATUS_MAP, "not_specified"),
          showInApp: parsed.showInApp ? normalizeBooleanValue(parsed.showInApp, SHOW_IN_APP_MAP, true) : true,
          productImage: sanitizeText(parsed.imageUrl, 512) || null,
          notes: sanitizeText(parsed.notes, 1000) || null,
          sortOrder: parsed.sortOrder ? parseInt(parsed.sortOrder) || 0 : 0,
        };

        const isDuplicate = await db.findProductDuplicate(storeId, normalized.name, normalized.menuCategory);
        if (isDuplicate) {
          duplicateRows.push({ rowNumber: i + 2, data: normalized, existingMatch: true });
          if (input.duplicateHandling === "skip") continue;
        }

        validRows.push({ rowNumber: i + 2, data: normalized, isDuplicate: !!isDuplicate });
      }

      const batch = await db.createImportBatch({
        importType: "menu_products",
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
      requireImportPermission(ctx.user!, "ImportProducts");

      const batch = await db.getImportBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import batch not found" });
      if (batch.status !== "pending_preview") throw new TRPCError({ code: "BAD_REQUEST", message: "Batch already processed" });

      const allRows = (batch.validRowsData as any[]) || [];
      let importedCount = 0;
      let skippedCount = 0;
      const errors: any[] = [];

      for (const row of allRows) {
        try {
          if (row.isDuplicate && input.duplicateHandling === "skip") {
            skippedCount++;
            continue;
          }

          let categoryId: number | null = null;
          if (row.data.menuCategory) {
            categoryId = await db.findOrCreateMenuCategory(row.data.storeId, row.data.menuCategory);
          }

          if (row.isDuplicate && input.duplicateHandling === "update_existing") {
            const existing = await db.findProductDuplicate(row.data.storeId, row.data.name, row.data.menuCategory);
            if (existing) {
              await db.updateProduct(existing.id, { ...row.data, categoryId });
              importedCount++;
              continue;
            }
          }

          await db.createProduct({ ...row.data, categoryId });
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
        entityType: "product",
        notes: `Batch #${input.batchId}: ${importedCount} products imported, ${skippedCount} skipped (total valid: ${allRows.length})`,
      });

      return { batchId: input.batchId, importedCount, skippedCount, errors, status };
    }),
});

// ============================================================
// CUSTOMERS IMPORT
// ============================================================

const customersImportRouter = router({
  parse: protectedProcedure
    .input(z.object({
      rows: z.array(z.array(z.any())),
      headers: z.array(z.string()),
      fileName: z.string(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportCustomers");
      const wilayatScope = getWilayatScope(ctx.user!);

      const columnMapping = mapColumns(input.headers, CUSTOMER_COLUMN_MAP);
      const validRows: any[] = [];
      const invalidRows: any[] = [];
      const duplicateRows: any[] = [];

      for (let i = 0; i < input.rows.length; i++) {
        const row = input.rows[i];
        const parsed = parseRow(row, columnMapping);

        if (!parsed.phone || parsed.phone.trim() === "") {
          invalidRows.push({ rowNumber: i + 2, reason: "Missing Customer Phone / رقم العميل", data: parsed });
          continue;
        }

        const normalized: any = {
          fullName: sanitizeText(parsed.fullName, 255) || parsed.phone.trim(),
          phone: sanitizeText(parsed.phone, 20),
          email: sanitizeText(parsed.email, 320) || null,
          address: sanitizeText(parsed.address, 500) || null,
          savedLocations: parsed.savedLocations || null,
          status: normalizeValue(parsed.status, CUSTOMER_STATUS_MAP, "active"),
          notes: sanitizeText(parsed.notes, 1000) || null,
        };

        if (parsed.wilayat) {
          const wilayat = await db.findWilayatByName(parsed.wilayat.trim());
          if (wilayat) normalized.wilayatId = wilayat.id;
        }

        if (wilayatScope && normalized.wilayatId && normalized.wilayatId !== wilayatScope) {
          invalidRows.push({ rowNumber: i + 2, reason: "Wilayat access denied", data: parsed });
          continue;
        }

        const existing = await db.findCustomerByPhone(normalized.phone);
        if (existing) {
          duplicateRows.push({ rowNumber: i + 2, data: normalized, existingId: existing.id });
          if (input.duplicateHandling === "skip") continue;
        }

        validRows.push({ rowNumber: i + 2, data: normalized, isDuplicate: !!existing, existingId: existing?.id });
      }

      const batch = await db.createImportBatch({
        importType: "customers",
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
      requireImportPermission(ctx.user!, "ImportCustomers");

      const batch = await db.getImportBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import batch not found" });
      if (batch.status !== "pending_preview") throw new TRPCError({ code: "BAD_REQUEST", message: "Batch already processed" });

      const allRows = (batch.validRowsData as any[]) || [];
      let importedCount = 0;
      let skippedCount = 0;
      const errors: any[] = [];

      for (const row of allRows) {
        try {
          if (row.isDuplicate && input.duplicateHandling === "skip") {
            skippedCount++;
            continue;
          }
          if (row.isDuplicate && input.duplicateHandling === "update_existing" && row.existingId) {
            await db.updateCustomer(row.existingId, row.data);
            importedCount++;
            continue;
          }
          await db.createCustomer(row.data);
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
        entityType: "customer",
        notes: `Batch #${input.batchId}: ${importedCount} customers imported, ${skippedCount} skipped (total valid: ${allRows.length})`,
      });

      return { batchId: input.batchId, importedCount, skippedCount, errors, status };
    }),
});

// ============================================================
// ORDERS IMPORT
// ============================================================

const ordersImportRouter = router({
  parse: protectedProcedure
    .input(z.object({
      rows: z.array(z.array(z.any())),
      headers: z.array(z.string()),
      fileName: z.string(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
      createMissingStores: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportOrders");
      const wilayatScope = getWilayatScope(ctx.user!);

      const columnMapping = mapColumns(input.headers, ORDER_COLUMN_MAP);
      const validRows: any[] = [];
      const invalidRows: any[] = [];
      const duplicateRows: any[] = [];

      for (let i = 0; i < input.rows.length; i++) {
        const row = input.rows[i];
        const parsed = parseRow(row, columnMapping);

        if (!parsed.orderNumber || parsed.orderNumber.trim() === "") {
          invalidRows.push({ rowNumber: i + 2, reason: "Missing Order Number / رقم الطلب", data: parsed });
          continue;
        }

        const normalized: any = {
          orderNumber: sanitizeText(parsed.orderNumber, 50),
          orderDate: parsed.orderDate ? new Date(parsed.orderDate) : new Date(),
          customerName: sanitizeText(parsed.customerName, 255) || null,
          customerPhone: sanitizeText(parsed.customerPhone, 20) || null,
          customerAddress: sanitizeText(parsed.customerAddress, 500) || null,
          orderType: normalizeValue(parsed.orderType, ORDER_TYPE_MAP, "other"),
          orderStatus: normalizeValue(parsed.orderStatus, ORDER_STATUS_MAP, "new"),
          orderAmount: parsed.orderAmount || "0",
          deliveryFee: parsed.deliveryFee || "0",
          discountAmount: parsed.discountAmount || "0",
          totalPaidByCustomer: parsed.totalPaid || "0",
          paymentMethod: parsed.paymentMethod ? normalizeValue(parsed.paymentMethod, PAYMENT_METHOD_MAP, "other") : null,
          paymentStatus: normalizeValue(parsed.paymentStatus, PAYMENT_STATUS_MAP, "not_paid"),
          customerNotes: sanitizeText(parsed.customerNotes, 1000) || null,
          internalNotes: sanitizeText(parsed.internalNotes, 1000) || null,
        };

        if (parsed.wilayat) {
          const wilayat = await db.findWilayatByName(parsed.wilayat.trim());
          if (wilayat) normalized.wilayatId = wilayat.id;
        }

        if (wilayatScope && normalized.wilayatId && normalized.wilayatId !== wilayatScope) {
          invalidRows.push({ rowNumber: i + 2, reason: "Wilayat access denied", data: parsed });
          continue;
        }

        if (parsed.storeName) {
          const store = await db.findStoreByName(parsed.storeName.trim());
          if (store) {
            normalized.storeId = store.id;
          } else if (input.createMissingStores) {
            const result = await db.createStore({ nameAr: parsed.storeName.trim() } as any);
            normalized.storeId = (result as any)?.[0]?.insertId || null;
          }
        }

        if (parsed.storeClassification) {
          normalized.storeClassification = normalizeValue(parsed.storeClassification, CLASSIFICATION_MAP, "not_specified");
        }

        if (parsed.customerPhone) {
          const customer = await db.findCustomerByPhone(parsed.customerPhone.trim());
          if (customer) normalized.customerId = customer.id;
        }

        if (parsed.mandoubPhone) {
          const mandoub = await db.findMandoubByPhone(parsed.mandoubPhone.trim());
          if (mandoub) normalized.assignedMandoubId = mandoub.id;
        }

        const existing = await db.findOrderByNumber(normalized.orderNumber);
        if (existing) {
          duplicateRows.push({ rowNumber: i + 2, data: normalized, existingId: existing.id });
          if (input.duplicateHandling === "skip") continue;
        }

        validRows.push({ rowNumber: i + 2, data: normalized, isDuplicate: !!existing, existingId: existing?.id });
      }

      const batch = await db.createImportBatch({
        importType: "orders",
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
      requireImportPermission(ctx.user!, "ImportOrders");

      const batch = await db.getImportBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import batch not found" });
      if (batch.status !== "pending_preview") throw new TRPCError({ code: "BAD_REQUEST", message: "Batch already processed" });

      const allRows = (batch.validRowsData as any[]) || [];
      let importedCount = 0;
      let skippedCount = 0;
      const errors: any[] = [];

      for (const row of allRows) {
        try {
          if (row.isDuplicate && input.duplicateHandling === "skip") {
            skippedCount++;
            continue;
          }
          if (row.isDuplicate && input.duplicateHandling === "update_existing" && row.existingId) {
            await db.updateOrder(row.existingId, row.data);
            importedCount++;
            continue;
          }
          await db.createOrder({ ...row.data, createdById: ctx.user!.id } as any);
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
        entityType: "order",
        notes: `Batch #${input.batchId}: ${importedCount} orders imported, ${skippedCount} skipped (total valid: ${allRows.length})`,
      });

      return { batchId: input.batchId, importedCount, skippedCount, errors, status };
    }),
});

// ============================================================
// PAYMENTS IMPORT
// ============================================================

const paymentsImportRouter = router({
  parse: protectedProcedure
    .input(z.object({
      rows: z.array(z.array(z.any())),
      headers: z.array(z.string()),
      fileName: z.string(),
      duplicateHandling: z.enum(["skip", "import_anyway", "update_existing"]).default("skip"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ImportPayments");

      const columnMapping = mapColumns(input.headers, PAYMENT_COLUMN_MAP);
      const validRows: any[] = [];
      const invalidRows: any[] = [];
      const duplicateRows: any[] = [];

      for (let i = 0; i < input.rows.length; i++) {
        const row = input.rows[i];
        const parsed = parseRow(row, columnMapping);

        const hasRef = parsed.paymentReference && parsed.paymentReference.trim() !== "";
        const hasOrderAndAmount = (parsed.orderNumber && parsed.orderNumber.trim() !== "") && (parsed.amount && parsed.amount.trim() !== "");

        if (!hasRef && !hasOrderAndAmount) {
          invalidRows.push({ rowNumber: i + 2, reason: "Missing Payment Reference or (Order Number + Amount)", data: parsed });
          continue;
        }

        const normalized: any = {
          paymentReference: sanitizeText(parsed.paymentReference, 100) || null,
          amount: parsed.amount || "0",
          paymentMethod: normalizeValue(parsed.paymentMethod, PAYMENT_TABLE_METHOD_MAP, "other"),
          paymentStatus: normalizeValue(parsed.paymentStatus, PAYMENT_STATUS_MAP, "not_paid"),
          paymentDate: parsed.paymentDate ? new Date(parsed.paymentDate) : new Date(),
          isRefunded: parsed.isRefunded ? normalizeBooleanValue(parsed.isRefunded, SHOW_IN_APP_MAP, false) : false,
          refundAmount: parsed.refundAmount || null,
          notes: sanitizeText(parsed.notes, 1000) || null,
        };

        if (parsed.orderNumber) {
          const order = await db.findOrderByNumber(parsed.orderNumber.trim());
          if (order) normalized.orderId = order.id;
        }

        if (parsed.bookingNumber) {
          const booking = await db.findBookingByNumber(parsed.bookingNumber.trim());
          if (booking) normalized.bookingId = booking.id;
        }

        if (parsed.customerPhone) {
          const customer = await db.findCustomerByPhone(parsed.customerPhone.trim());
          if (customer) normalized.customerId = customer.id;
        }

        if (normalized.paymentReference) {
          const existing = await db.findPaymentByReference(normalized.paymentReference);
          if (existing) {
            duplicateRows.push({ rowNumber: i + 2, data: normalized, existingId: existing.id });
            if (input.duplicateHandling === "skip") continue;
          }
        }

        validRows.push({ rowNumber: i + 2, data: normalized, isDuplicate: false });
      }

      const batch = await db.createImportBatch({
        importType: "payments",
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
      requireImportPermission(ctx.user!, "ImportPayments");

      const batch = await db.getImportBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: "NOT_FOUND", message: "Import batch not found" });
      if (batch.status !== "pending_preview") throw new TRPCError({ code: "BAD_REQUEST", message: "Batch already processed" });

      const allRows = (batch.validRowsData as any[]) || [];
      let importedCount = 0;
      let skippedCount = 0;
      const errors: any[] = [];

      for (const row of allRows) {
        try {
          await db.createPayment({ ...row.data, importBatchId: input.batchId });
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
        entityType: "payment",
        notes: `Batch #${input.batchId}: ${importedCount} payments imported, ${skippedCount} skipped (total valid: ${allRows.length})`,
      });

      return { batchId: input.batchId, importedCount, skippedCount, errors, status };
    }),
});

// ============================================================
// IMPORT HISTORY
// ============================================================

const importHistoryRouter = router({
  list: protectedProcedure
    .input(z.object({
      importType: z.enum(["stores", "menu_products", "customers", "orders", "payments"]).optional(),
      status: z.enum(["pending_preview", "imported", "imported_with_errors", "failed", "cancelled"]).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ViewImportHistory");
      return db.getImportBatches(input?.importType, input?.status, input?.limit || 50, input?.offset || 0);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ViewImportHistory");
      return db.getImportBatchById(input.id);
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireImportPermission(ctx.user!, "ViewImportHistory");
      await db.updateImportBatch(input.id, { status: "cancelled", validRowsData: null });
      await db.createAuditLog({
        userId: ctx.user!.id,
        userName: ctx.user!.name ?? "",
        actionType: "import_cancelled",
        entityType: "import_batch",
        entityId: input.id,
      });
      return { success: true };
    }),
});

// ============================================================
// COMBINED DATA IMPORT ROUTER
// ============================================================

export const dataImportRouter = router({
  stores: storesImportRouter,
  products: productsImportRouter,
  customers: customersImportRouter,
  orders: ordersImportRouter,
  payments: paymentsImportRouter,
  history: importHistoryRouter,
});
