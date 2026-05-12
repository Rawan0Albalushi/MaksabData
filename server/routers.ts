import { COOKIE_NAME } from "@shared/const";
import { bulkImportRouter, orderRouter, customerRouter, bookingRouter } from "./routers/phase2a";
import { refundRouter, couponRouter, offerRouter, complaintRouter } from "./routers/phase2b";
import { budgetRouter, expenseRouter, revenueRouter, mandoubDueRouter, storeDueRouter, settlementRouter, phase2DashboardRouter } from "./routers/phase2c";
import { dataImportRouter } from "./routers/dataImport";
import { dataImportP2Router } from "./routers/dataImportP2";
import { dataImportP3Router } from "./routers/dataImportP3";
import { hasPermission, isSuperAdmin, isHigherOrEqualRole, getRequiredApprovalPermission, MaksabRole, Permission } from "@shared/permissions";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";

// ============================================================
// MIDDLEWARE HELPERS
// ============================================================

/** Resolve the effective maksabRole — admin with null maksabRole is treated as manager */
function getEffectiveRole(user: any): MaksabRole {
  if (user.maksabRole) return user.maksabRole as MaksabRole;
  // Owner/admin fallback: treat as manager
  if (user.role === "admin") return "manager";
  return "employee"; // safe default
}

/** Get wilayat scope for the current user based on role */
function getWilayatScope(user: any): number | undefined {
  const role = getEffectiveRole(user);
  if (isSuperAdmin(role) || role === "finance_manager") return undefined;
  if ((role === "state_employee_minister" || role === "employee") && user.wilayatId) {
    return user.wilayatId;
  }
  return undefined;
}

/** Enforce wilayat scope: override any user-supplied wilayatId if the user is restricted */
function enforceWilayatScope(user: any, requestedWilayatId?: number): number | undefined {
  const scope = getWilayatScope(user);
  // If user has a forced scope, always use it regardless of what they requested
  if (scope !== undefined) return scope;
  // Otherwise, allow the requested filter
  return requestedWilayatId;
}

/** Permission-checking middleware factory */
function requirePermission(permission: Permission) {
  return protectedProcedure.use(({ ctx, next }) => {
    const user = ctx.user;
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
    const effectiveRole = getEffectiveRole(user);
    const userPerms = (user.permissions as Permission[]) ?? [];
    if (!hasPermission(effectiveRole, userPerms, permission)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
    }
    return next({ ctx });
  });
}

/** Sensitive fields that only super admins can change */
const SENSITIVE_FIELDS = ["maksabRole", "role", "jobTitle", "permissions", "status", "wilayatId", "managerId"];

/** Check if user is a super admin */
function isSuperAdminUser(user: any): boolean {
  return isSuperAdmin(getEffectiveRole(user));
}

export const appRouter = router({
  system: systemRouter,

  // ============================================================
  // AUTH ROUTES
  // ============================================================
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    /** Self-profile update: strips sensitive fields, creates approval for safe fields */
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        fullNameWithTribe: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        profilePhoto: z.string().optional(),
        wilayatId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Manager can directly update their own profile
        const effectiveRole = getEffectiveRole(ctx.user);
        const isManager = effectiveRole === "manager";
        // Only safe fields allowed for self-update
        const safeData: Record<string, any> = {};
        if (input.name !== undefined) safeData.name = input.name;
        if (input.fullNameWithTribe !== undefined) safeData.fullNameWithTribe = input.fullNameWithTribe;
        if (input.phone !== undefined) safeData.phone = input.phone;
        if (input.email !== undefined) safeData.email = input.email;
        if (input.profilePhoto !== undefined) safeData.profilePhoto = input.profilePhoto;
        if (input.wilayatId !== undefined) safeData.wilayatId = input.wilayatId;
        if (Object.keys(safeData).length === 0) return { success: false, message: "No changes" };
        // Manager direct update - no approval needed
        if (isManager) {
          const oldUser = await db.getUserById(ctx.user.id);
          const oldData: Record<string, any> = {};
          for (const key of Object.keys(safeData)) {
            oldData[key] = (oldUser as any)?.[key] ?? null;
          }
          await db.updateUser(ctx.user.id, safeData);
          await db.createAuditLog({
            userId: ctx.user.id,
            userName: ctx.user.name ?? "",
            actionType: "profile_direct_update",
            entityType: "user",
            entityId: ctx.user.id,
            oldValues: oldData,
            newValues: safeData,
            notes: "Manager self-update (no approval required)",
          });
          return { success: true, message: "Profile updated successfully", directUpdate: true };
        };

        // Create approval request for profile edit
        const oldUser = await db.getUserById(ctx.user.id);
        const oldData: Record<string, any> = {};
        for (const key of Object.keys(safeData)) {
          oldData[key] = (oldUser as any)?.[key] ?? null;
        }

        await db.createApproval({
          requestType: "profile_edit",
          requestedById: ctx.user.id,
          targetEntityType: "user",
          targetEntityId: ctx.user.id,
          oldData: oldData,
          newData: safeData,
        });

        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          actionType: "profile_edit_requested",
          entityType: "user",
          entityId: ctx.user.id,
          oldValues: oldData,
          newValues: safeData,
        });

        // Notify super admins
        const allUsers = await db.getAllUsers();
        const admins = allUsers.filter((u) => isSuperAdmin(u.maksabRole as any));
        for (const admin of admins) {
          await db.createNotification({
            userId: admin.id,
            title: "Profile Edit Request",
            message: `${ctx.user.name || "User #" + ctx.user.id} has requested a profile edit.`,
            type: "approval_request",
            relatedEntityType: "user",
            relatedEntityId: ctx.user.id,
          });
        }

        return { success: true, message: "Profile edit request submitted for approval" };
      }),
    /** Get full profile for the currently authenticated user (includes linked employee/mandoub) */
    getMyProfile: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const user = await db.getUserById(userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      // Get linked employee
      const employeeProfile = await db.getEmployeeByUserId(userId);
      // Get linked mandoub
      const mandoubProfile = await db.getMandoubByUserId(userId);
      // Get wilayat name
      let wilayatName: string | null = null;
      if (user.wilayatId) {
        const w = await db.getWilayatById(user.wilayatId);
        wilayatName = w?.nameAr ?? null;
      }
      // Get manager name
      let managerName: string | null = null;
      if (user.managerId) {
        const mgr = await db.getUserById(user.managerId);
        managerName = mgr?.name ?? mgr?.fullNameWithTribe ?? null;
      }
      // Get pending profile edit request
      const allApprovals = await db.getAllApprovals({ status: "pending_review" });
      const pendingEdit = allApprovals.find((a: any) => a.requestType === "profile_edit" && a.targetEntityId === userId && a.status === "pending_review");
      // Mandoub stats
      let mandoubStats: { totalOrders: number; totalEarnings: number; paidAmount: number; remainingAmount: number } | null = null;
      if (mandoubProfile) {
        const dues = await db.getAllMandoubDues({ mandoubId: mandoubProfile.id });
        const totalEarnings = dues.reduce((s: number, d: any) => s + parseFloat(d.amount || "0"), 0);
        const paidAmount = dues.reduce((s: number, d: any) => s + parseFloat(d.paidAmount || "0"), 0);
        mandoubStats = {
          totalOrders: dues.filter((d: any) => d.earningType === "per_order").length,
          totalEarnings,
          paidAmount,
          remainingAmount: totalEarnings - paidAmount,
        };
      }
      // Audit log: profile viewed
      await db.createAuditLog({
        userId,
        userName: user.name ?? "",
        actionType: "profile_viewed",
        entityType: "user",
        entityId: userId,
      });
      // Strip sensitive fields
      const { ...safeUser } = user;
      return {
        user: safeUser,
        wilayatName,
        managerName,
        employeeProfile: employeeProfile || null,
        mandoubProfile: mandoubProfile || null,
        mandoubStats,
        pendingEdit: pendingEdit || null,
      };
    }),
    /** Manager/DirectEdit: directly update a user's profile without approval */
    directUpdateProfile: protectedProcedure
      .input(z.object({
        targetUserId: z.number(),
        name: z.string().optional(),
        fullNameWithTribe: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        profilePhoto: z.string().optional(),
        wilayatId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const effectiveRole = getEffectiveRole(ctx.user);
        const isManager = effectiveRole === "manager";
        const isSelf = input.targetUserId === ctx.user.id;
        // Only manager can direct-edit (or self-edit for manager)
        if (!isManager && !isSelf) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only managers can directly update profiles" });
        }
        if (!isManager && isSelf) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Normal users must use the approval workflow" });
        }
        const targetUser = await db.getUserById(input.targetUserId);
        if (!targetUser) throw new TRPCError({ code: "NOT_FOUND" });
        const updateData: Record<string, any> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.fullNameWithTribe !== undefined) updateData.fullNameWithTribe = input.fullNameWithTribe;
        if (input.phone !== undefined) updateData.phone = input.phone;
        if (input.email !== undefined) updateData.email = input.email;
        if (input.profilePhoto !== undefined) updateData.profilePhoto = input.profilePhoto;
        if (input.wilayatId !== undefined) updateData.wilayatId = input.wilayatId;
        if (Object.keys(updateData).length === 0) return { success: false, message: "No changes" };
        const oldData: Record<string, any> = {};
        for (const key of Object.keys(updateData)) {
          oldData[key] = (targetUser as any)[key] ?? null;
        }
        await db.updateUser(input.targetUserId, updateData);
        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          actionType: "profile_direct_update",
          entityType: "user",
          entityId: input.targetUserId,
          oldValues: oldData,
          newValues: updateData,
          notes: isManager ? "Manager direct update" : "Self direct update",
        });
        return { success: true, message: "Profile updated successfully" };
      }),
    /** Admin-only: update any user's role, permissions, status */
    adminUpdateUser: requirePermission("ManageUsers")
      .input(z.object({
        userId: z.number(),
        maksabRole: z.string().optional(),
        jobTitle: z.string().optional(),
        wilayatId: z.number().nullable().optional(),
        status: z.string().optional(),
        permissions: z.array(z.string()).optional(),
        managerId: z.number().nullable().optional(),
        name: z.string().optional(),
        fullNameWithTribe: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!isSuperAdminUser(ctx.user)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only super admins can change user roles and permissions" });
        }
        const { userId, ...data } = input;
        const oldUser = await db.getUserById(userId);
        await db.updateUser(userId, data as any);
        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          actionType: "user_admin_updated",
          entityType: "user",
          entityId: userId,
          oldValues: oldUser,
          newValues: data,
        });
        return { success: true };
      }),
    /** List all users (for admin management) */
    listUsers: requirePermission("ManageUsers").query(async () => {
      return db.getAllUsers();
    }),
  }),

  // ============================================================
  // WILAYAT ROUTES
  // ============================================================
  wilayat: router({
    list: protectedProcedure.query(async () => {
      return db.getAllWilayats();
    }),
    create: requirePermission("ManageWilayats")
      .input(z.object({ nameAr: z.string(), nameEn: z.string().optional(), governorate: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await db.createWilayat(input);
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "wilayat_created", entityType: "wilayat", entityId: null, newValues: input });
        return { success: true };
      }),
    update: requirePermission("ManageWilayats")
      .input(z.object({ id: z.number(), nameAr: z.string().optional(), nameEn: z.string().optional(), governorate: z.string().optional(), isActive: z.boolean().optional() }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const old = await db.getWilayatById(id);
        await db.updateWilayat(id, data);
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "wilayat_updated", entityType: "wilayat", entityId: id, oldValues: old, newValues: data });
        return { success: true };
      }),
  }),

  // ============================================================
  // STORE CATEGORIES ROUTES
  // ============================================================
  storeCategory: router({
    list: protectedProcedure.query(async () => {
      return db.getAllStoreCategories();
    }),
    create: requirePermission("ManageSettings")
      .input(z.object({ nameAr: z.string(), nameEn: z.string().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        await db.createStoreCategory(input);
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "store_category_created", entityType: "store_category", newValues: input });
        return { success: true };
      }),
    update: requirePermission("ManageSettings")
      .input(z.object({ id: z.number(), nameAr: z.string().optional(), nameEn: z.string().optional(), isActive: z.boolean().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateStoreCategory(id, data);
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "store_category_updated", entityType: "store_category", entityId: id, newValues: data });
        return { success: true };
      }),
  }),

  // ============================================================
  // EMPLOYEE ROUTES
  // ============================================================
  employee: router({
    list: requirePermission("ManageEmployees")
      .input(z.object({ wilayatId: z.number().optional(), status: z.string().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const wilayatId = enforceWilayatScope(ctx.user, input?.wilayatId);
        return db.getAllEmployees({ wilayatId, status: input?.status });
      }),
    getById: requirePermission("ManageEmployees")
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getEmployeeById(input.id);
      }),
    create: requirePermission("ManageEmployees")
      .input(z.object({
        fullName: z.string(),
        phone: z.string().optional(),
        email: z.string().optional(),
        wilayatId: z.number().optional(),
        maksabRole: z.string().optional(),
        jobTitle: z.string().optional(),
        managerId: z.number().optional(),
        userId: z.number().optional(),
        notes: z.string().optional(),
        profilePhoto: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createEmployee(input as any);
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "employee_created", entityType: "employee", newValues: input });
        return { success: true };
      }),
    update: requirePermission("ManageEmployees")
      .input(z.object({
        id: z.number(),
        fullName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        wilayatId: z.number().optional(),
        maksabRole: z.string().optional(),
        jobTitle: z.string().optional(),
        status: z.string().optional(),
        managerId: z.number().optional(),
        userId: z.number().optional(),
        notes: z.string().optional(),
        profilePhoto: z.string().optional(),
        archived: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const old = await db.getEmployeeById(id);
        await db.updateEmployee(id, data as any);
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "employee_updated", entityType: "employee", entityId: id, oldValues: old, newValues: data });
        return { success: true };
      }),
    archive: requirePermission("ManageEmployees")
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateEmployee(input.id, { archived: true, status: "archived" });
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "employee_archived", entityType: "employee", entityId: input.id });
        return { success: true };
      }),
  }),

  // ============================================================
  // MANDOUB ROUTES
  // ============================================================
  mandoub: router({
    list: requirePermission("ManageMandoubs")
      .input(z.object({ wilayatId: z.number().optional(), status: z.string().optional(), responsibleEmployeeId: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const wilayatId = enforceWilayatScope(ctx.user, input?.wilayatId);
        return db.getAllMandoubs({ wilayatId, status: input?.status, responsibleEmployeeId: input?.responsibleEmployeeId });
      }),
    /** Mandoub portal: returns only the logged-in mandoub's own data by userId */
    myProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = ctx.user;
      if (user.maksabRole !== "mandoub") throw new TRPCError({ code: "FORBIDDEN" });
      // Find mandoub record linked to this user by userId
      const myRecord = await db.getMandoubByUserId(user.id);
      return myRecord || null;
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getMandoubById(input.id);
      }),
    create: requirePermission("ManageMandoubs")
      .input(z.object({
        fullName: z.string(),
        phone: z.string().optional(),
        email: z.string().optional(),
        wilayatId: z.number().optional(),
        mandoubType: z.enum(["fast", "long_distance"]),
        responsibleEmployeeId: z.number().optional(),
        userId: z.number().optional(),
        notes: z.string().optional(),
        profilePhoto: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Create mandoub with pending_approval status
        const insertResult = await db.createMandoub({ ...input, status: "pending_approval" } as any);
        const mandoubId = insertResult?.[0]?.insertId;

        // Create approval request linked to the mandoub
        await db.createApproval({
          requestType: "mandoub_activation",
          requestedById: ctx.user.id,
          targetEntityType: "mandoub",
          targetEntityId: mandoubId || undefined,
          newData: input,
        });

        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "mandoub_created", entityType: "mandoub", entityId: mandoubId, newValues: input });

        // Notify super admins
        const allUsers = await db.getAllUsers();
        const superAdmins = allUsers.filter((u) => isSuperAdmin(u.maksabRole as any));
        for (const admin of superAdmins) {
          await db.createNotification({
            userId: admin.id,
            title: "New Mandoub Approval Request",
            message: `${input.fullName} has been added as a mandoub and requires approval.`,
            type: "approval_request",
            relatedEntityType: "mandoub",
            relatedEntityId: mandoubId,
          });
        }
        return { success: true };
      }),
    update: requirePermission("ManageMandoubs")
      .input(z.object({
        id: z.number(),
        fullName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        wilayatId: z.number().optional(),
        mandoubType: z.enum(["fast", "long_distance"]).optional(),
        responsibleEmployeeId: z.number().optional(),
        userId: z.number().optional(),
        notes: z.string().optional(),
        profilePhoto: z.string().optional(),
        status: z.string().optional(),
        archived: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const old = await db.getMandoubById(id);
        await db.updateMandoub(id, data as any);
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "mandoub_updated", entityType: "mandoub", entityId: id, oldValues: old, newValues: data });
        return { success: true };
      }),
     /** Approve or reject a mandoub */
    approve: requirePermission("ApproveMandoub")
      .input(z.object({ id: z.number(), approved: z.boolean(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const mandoub = await db.getMandoubById(input.id);
        if (!mandoub) throw new TRPCError({ code: "NOT_FOUND" });

        // Prevent self-approval: if the mandoub's userId matches the approver
        const approverRole = getEffectiveRole(ctx.user);
        if (mandoub.userId === ctx.user.id && !isSuperAdmin(approverRole)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You cannot approve your own mandoub request. / لا يمكنك الموافقة على طلب المندوب الخاص بك.",
          });
        }

        const newStatus = input.approved ? "active" : "rejected";
        const updateData: any = { status: newStatus };
        if (input.approved) {
          updateData.approvedBy = ctx.user.id;
        }
        await db.updateMandoub(input.id, updateData);

        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          actionType: input.approved ? "mandoub_approved" : "mandoub_rejected",
          entityType: "mandoub",
          entityId: input.id,
          notes: input.notes,
          oldValues: { status: mandoub.status },
          newValues: { status: newStatus, approvedBy: input.approved ? ctx.user.id : undefined },
        });

        // Update related approval request
        const approvals = await db.getAllApprovals({ status: "pending_review" });
        const related = approvals.find((a) => a.targetEntityType === "mandoub" && a.targetEntityId === input.id);
        if (related) {
          await db.updateApproval(related.id, {
            status: input.approved ? "approved" : "rejected",
            reviewedById: ctx.user.id,
            reviewDate: new Date(),
            reviewNotes: input.notes,
          });
        }

        // Notify super admins
        const allUsers = await db.getAllUsers();
        const superAdmins = allUsers.filter((u) => isSuperAdmin(u.maksabRole as any));
        for (const admin of superAdmins) {
          if (admin.id !== ctx.user.id) {
            await db.createNotification({
              userId: admin.id,
              title: input.approved ? "Mandoub Approved" : "Mandoub Rejected",
              message: `Mandoub ${mandoub.fullName} has been ${input.approved ? "approved" : "rejected"} by ${ctx.user.name}.`,
              type: "approval_result",
              relatedEntityType: "mandoub",
              relatedEntityId: input.id,
            });
          }
        }
        return { success: true };
      }),
    archive: requirePermission("ManageMandoubs")
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateMandoub(input.id, { archived: true, status: "archived" });
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "mandoub_archived", entityType: "mandoub", entityId: input.id });
        return { success: true };
      }),
  }),

  // ============================================================
  // STORE ROUTES
  // ============================================================
  store: router({
    list: requirePermission("ViewStores")
      .input(z.object({
        wilayatId: z.number().optional(),
        category: z.string().optional(),
        classification: z.string().optional(),
        activationStatus: z.string().optional(),
        communicationStatus: z.string().optional(),
        merchantApproval: z.string().optional(),
        addedInSystem: z.string().optional(),
        responsibleEmployeeId: z.number().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        const wilayatId = enforceWilayatScope(ctx.user, input?.wilayatId);
        return db.getAllStores({ ...input, wilayatId });
      }),
    getById: requirePermission("ViewStores")
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getStoreById(input.id);
      }),
    create: requirePermission("CreateStore")
      .input(z.object({
        nameAr: z.string().min(1),
        nameEn: z.string().optional(),
        merchantName: z.string().optional(),
        merchantPhone: z.string().optional(),
        whatsappNumber: z.string().optional(),
        category: z.string().optional(),
        classification: z.string().optional(),
        wilayatId: z.number().optional(),
        region: z.string().optional(),
        responsibleEmployeeId: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createStore(input as any);
        const storeId = result?.[0]?.insertId;
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "store_created", entityType: "store", entityId: storeId, newValues: input });
        return { success: true, storeId };
      }),
    update: requirePermission("EditStore")
      .input(z.object({
        id: z.number(),
        nameAr: z.string().optional(),
        nameEn: z.string().optional(),
        merchantName: z.string().optional(),
        merchantPhone: z.string().optional(),
        whatsappNumber: z.string().optional(),
        category: z.string().optional(),
        communicationStatus: z.string().optional(),
        merchantApproval: z.string().optional(),
        addedInSystem: z.string().optional(),
        activationStatus: z.string().optional(),
        classification: z.string().optional(),
        wilayatId: z.number().optional(),
        region: z.string().optional(),
        responsibleEmployeeId: z.number().optional(),
        shortDescription: z.string().optional(),
        showInApp: z.boolean().optional(),
        notes: z.string().optional(),
        governorate: z.string().optional(),
        detailedAddress: z.string().optional(),
        googleMapsLink: z.string().optional(),
        locationNotes: z.string().optional(),
        workingDays: z.string().optional(),
        openingTime: z.string().optional(),
        closingTime: z.string().optional(),
        avgPreparationTime: z.string().optional(),
        acceptsOrdersNow: z.boolean().optional(),
        operationStatus: z.string().optional(),
        operationNotes: z.string().optional(),
        responsiblePersonName: z.string().optional(),
        responsiblePersonPhone: z.string().optional(),
        preferredCommunication: z.string().optional(),
        communicationNotes: z.string().optional(),
        contractStartDate: z.string().optional(),
        contractEndDate: z.string().optional(),
        contractStatus: z.string().optional(),
        commissionPercentage: z.string().optional(),
        orderReceivingMethod: z.string().optional(),
        merchantReceivesDirectly: z.string().optional(),
        agreementNotes: z.string().optional(),
        internalManagementNotes: z.string().optional(),
        ezhalhaExecutionMethod: z.string().optional(),
        ezhalhaPricesConfirmed: z.string().optional(),
        ezhalhaMenuConfirmed: z.string().optional(),
        ezhalhaRequiresReview: z.boolean().optional(),
        ezhalhaOperationsNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const old = await db.getStoreById(id);
        await db.updateStore(id, data as any);
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "store_updated", entityType: "store", entityId: id, oldValues: old, newValues: data });
        return { success: true };
      }),
    requestActivation: requirePermission("ViewStores")
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const store = await db.getStoreById(input.id);
        await db.updateStore(input.id, { activationStatus: "pending_activation" } as any);
        await db.createApproval({
          requestType: "store_activation",
          requestedById: ctx.user.id,
          targetEntityType: "store",
          targetEntityId: input.id,
          oldData: { activationStatus: store?.activationStatus },
          newData: { activationStatus: "active" },
        });
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "store_activation_requested", entityType: "store", entityId: input.id });
        // Notify super admins
        const allUsers = await db.getAllUsers();
        const superAdmins = allUsers.filter((u) => isSuperAdmin(u.maksabRole as any));
        for (const admin of superAdmins) {
          await db.createNotification({
            userId: admin.id,
            title: "Store Activation Request",
            message: `Store "${store?.nameAr || "#" + input.id}" activation has been requested by ${ctx.user.name}.`,
            type: "approval_request",
            relatedEntityType: "store",
            relatedEntityId: input.id,
          });
        }
        return { success: true };
      }),
    activate: requirePermission("ActivateStore")
      .input(z.object({ id: z.number(), activate: z.boolean(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const store = await db.getStoreById(input.id);
        if (!store) throw new TRPCError({ code: "NOT_FOUND" });

        // Prevent self-activation: if the store was created by the same user
        const approverRole = getEffectiveRole(ctx.user);
        if ((store as any).createdById === ctx.user.id && !isSuperAdmin(approverRole)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You cannot activate a store you created yourself. / لا يمكنك تفعيل متجر قمت بإنشائه بنفسك.",
          });
        }

        const newStatus = input.activate ? "active" : "inactive";
        await db.updateStore(input.id, { activationStatus: newStatus as any, showInApp: input.activate });

        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          actionType: input.activate ? "store_activated" : "store_deactivated",
          entityType: "store",
          entityId: input.id,
          notes: input.notes,
          oldValues: { activationStatus: store.activationStatus },
          newValues: { activationStatus: newStatus },
        });

        // Update related approval
        const approvals = await db.getAllApprovals({ status: "pending_review" });
        const related = approvals.find((a) => a.targetEntityType === "store" && a.targetEntityId === input.id);
        if (related) {
          await db.updateApproval(related.id, {
            status: input.activate ? "approved" : "rejected",
            reviewedById: ctx.user.id,
            reviewDate: new Date(),
            reviewNotes: input.notes,
          });
        }

        // Notify super admins
        const allUsers = await db.getAllUsers();
        const superAdmins = allUsers.filter((u) => isSuperAdmin(u.maksabRole as any));
        for (const admin of superAdmins) {
          if (admin.id !== ctx.user.id) {
            await db.createNotification({
              userId: admin.id,
              title: input.activate ? "Store Activated" : "Store Deactivated",
              message: `Store "${store.nameAr}" has been ${input.activate ? "activated" : "deactivated"} by ${ctx.user.name}.`,
              type: input.activate ? "activation" : "deactivation",
              relatedEntityType: "store",
              relatedEntityId: input.id,
            });
          }
        }
        return { success: true };
      }),
    archive: requirePermission("ArchiveStore")
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateStore(input.id, { archived: true, status: "archived" as any });
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "store_archived", entityType: "store", entityId: input.id });
        return { success: true };
      }),
  }),

  // ============================================================
  // STORE IMAGES ROUTES
  // ============================================================
  storeImage: router({
    list: requirePermission("ManageStoreDetails")
      .input(z.object({ storeId: z.number() }))
      .query(async ({ input }) => {
        return db.getStoreImages(input.storeId);
      }),
    create: requirePermission("ManageStoreDetails")
      .input(z.object({
        storeId: z.number(),
        imageUrl: z.string(),
        imageType: z.string().optional(),
        caption: z.string().optional(),
        title: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createStoreImage(input as any);
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "store_image_added", entityType: "store_image", newValues: input });
        return { success: true };
      }),
    update: requirePermission("ManageStoreDetails")
      .input(z.object({
        id: z.number(),
        caption: z.string().optional(),
        title: z.string().optional(),
        sortOrder: z.number().optional(),
        archived: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateStoreImage(id, data as any);
        return { success: true };
      }),
  }),

  // ============================================================
  // MENU/PRODUCTS ROUTES
  // ============================================================
  menu: router({
    categories: requirePermission("ManageMenu")
      .input(z.object({ storeId: z.number() }))
      .query(async ({ input }) => {
        return db.getMenuCategories(input.storeId);
      }),
    createCategory: requirePermission("ManageMenu")
      .input(z.object({ storeId: z.number(), name: z.string(), sortOrder: z.number().optional(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await db.createMenuCategory(input);
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "menu_category_created", entityType: "menu_category", newValues: input });
        return { success: true };
      }),
    updateCategory: requirePermission("ManageMenu")
      .input(z.object({ id: z.number(), name: z.string().optional(), sortOrder: z.number().optional(), isActive: z.boolean().optional(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateMenuCategory(id, data);
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "menu_category_updated", entityType: "menu_category", entityId: id, newValues: data });
        return { success: true };
      }),
    products: requirePermission("ManageMenu")
      .input(z.object({ storeId: z.number() }))
      .query(async ({ input }) => {
        return db.getProducts(input.storeId);
      }),
    createProduct: requirePermission("ManageMenu")
      .input(z.object({
        storeId: z.number(),
        categoryId: z.number().optional(),
        name: z.string(),
        price: z.string().optional(),
        description: z.string().optional(),
        productImage: z.string().optional(),
        productStatus: z.string().optional(),
        showInApp: z.boolean().optional(),
        addons: z.any().optional(),
        notes: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createProduct(input as any);
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "product_created", entityType: "product", newValues: input });
        return { success: true };
      }),
    updateProduct: requirePermission("ManageMenu")
      .input(z.object({
        id: z.number(),
        categoryId: z.number().optional(),
        name: z.string().optional(),
        price: z.string().optional(),
        description: z.string().optional(),
        productImage: z.string().optional(),
        productStatus: z.string().optional(),
        showInApp: z.boolean().optional(),
        addons: z.any().optional(),
        notes: z.string().optional(),
        sortOrder: z.number().optional(),
        archived: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateProduct(id, data as any);
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "product_updated", entityType: "product", entityId: id, newValues: data });
        return { success: true };
      }),
  }),

  // ============================================================
  // APPROVAL ROUTES - with real action execution
  // ============================================================
  approval: router({
    list: requirePermission("ManageApprovals")
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return db.getAllApprovals(input ?? undefined);
      }),
    getById: requirePermission("ManageApprovals")
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getApprovalById(input.id);
      }),
    /** Review an approval request - applies real actions on approve */
    review: protectedProcedure
      .input(z.object({ id: z.number(), status: z.enum(["approved", "rejected", "needs_changes"]), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const approval = await db.getApprovalById(input.id);
        if (!approval) throw new TRPCError({ code: "NOT_FOUND" });
        if (approval.status !== "pending_review") throw new TRPCError({ code: "BAD_REQUEST", message: "Approval already reviewed / الطلب تمت مراجعته مسبقاً" });

        const approverRole = getEffectiveRole(ctx.user);

        // === GOAL 1: Prevent self-approval ===
        if (approval.requestedById === ctx.user.id && !isSuperAdmin(approverRole)) {
          await db.createAuditLog({
            userId: ctx.user.id,
            userName: ctx.user.name ?? "",
            actionType: "self_approval_attempt",
            entityType: "approval",
            entityId: input.id,
            notes: "Attempted to approve own request",
          });
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You cannot approve your own request. / لا يمكنك الموافقة على طلبك الخاص.",
          });
        }

        // === GOAL 2: Permission-per-type check ===
        const requiredPerm = getRequiredApprovalPermission(approval.requestType);
        if (requiredPerm) {
          const userPerms = (ctx.user as any).permissions as string[] | null;
          if (!hasPermission(approverRole, userPerms as any, requiredPerm)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `You do not have permission to review this type of request. / ليس لديك صلاحية مراجعة هذا النوع من الطلبات.`,
            });
          }
        }

        // === GOAL 2: Hierarchy check - approver must be higher role than requester ===
        if (!isSuperAdmin(approverRole)) {
          const requester = await db.getUserById(approval.requestedById);
          if (requester) {
            const requesterRole = getEffectiveRole(requester);
            if (!isHigherOrEqualRole(approverRole, requesterRole)) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "You cannot approve requests from users with equal or higher role. / لا يمكنك الموافقة على طلبات مستخدمين بنفس المستوى أو أعلى.",
              });
            }
          }
        }

        // === GOAL 2: Wilayat scope enforcement ===
        if (!isSuperAdmin(approverRole) && approverRole !== "finance_manager") {
          const approverWilayat = (ctx.user as any).wilayatId;
          if (approverWilayat && approval.targetEntityId) {
            // For user-related approvals, check the target user's wilayat
            if (approval.targetEntityType === "user") {
              const targetUser = await db.getUserById(approval.targetEntityId);
              if (targetUser && targetUser.wilayatId && targetUser.wilayatId !== approverWilayat) {
                throw new TRPCError({
                  code: "FORBIDDEN",
                  message: "You can only approve requests within your wilayat. / يمكنك فقط الموافقة على الطلبات ضمن ولايتك.",
                });
              }
            }
          }
        }

        // Update approval record
        await db.updateApproval(input.id, {
          status: input.status,
          reviewedById: ctx.user.id,
          reviewDate: new Date(),
          reviewNotes: input.notes,
        });

        // If approved, apply the real action
        if (input.status === "approved") {
          switch (approval.requestType) {
            case "profile_edit": {
              if (approval.targetEntityId && approval.newData) {
                const newData = typeof approval.newData === "string" ? JSON.parse(approval.newData) : approval.newData;
                await db.updateUser(approval.targetEntityId, newData);
              }
              break;
            }
            case "mandoub_activation": {
              if (approval.targetEntityId) {
                await db.updateMandoub(approval.targetEntityId, { status: "active", approvedBy: ctx.user.id } as any);
              }
              break;
            }
            case "store_activation": {
              if (approval.targetEntityId) {
                await db.updateStore(approval.targetEntityId, { activationStatus: "active", showInApp: true } as any);
              }
              break;
            }
            case "role_change": {
              if (approval.targetEntityId && approval.newData) {
                const newData = typeof approval.newData === "string" ? JSON.parse(approval.newData) : approval.newData;
                await db.updateUser(approval.targetEntityId, newData);
              }
              break;
            }
          }
        }

        // If rejected and it's a mandoub activation, set mandoub to rejected
        if (input.status === "rejected" && approval.requestType === "mandoub_activation" && approval.targetEntityId) {
          await db.updateMandoub(approval.targetEntityId, { status: "rejected" } as any);
        }

        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          actionType: `approval_${input.status}`,
          entityType: "approval",
          entityId: input.id,
          notes: input.notes,
          oldValues: { status: approval.status },
          newValues: { status: input.status, requestType: approval.requestType, targetEntityType: approval.targetEntityType, targetEntityId: approval.targetEntityId },
        });

        // Notify the requester
        await db.createNotification({
          userId: approval.requestedById,
          title: `Approval ${input.status === "approved" ? "Approved" : input.status === "rejected" ? "Rejected" : "Needs Changes"}`,
          message: `Your ${approval.requestType} request has been ${input.status} by ${ctx.user.name}.${input.notes ? " Notes: " + input.notes : ""}`,
          type: "approval_result",
          relatedEntityType: approval.targetEntityType || undefined,
          relatedEntityId: approval.targetEntityId || undefined,
        });

        return { success: true };
      }),
  }),

  // ============================================================
  // NOTIFICATION ROUTES
  // ============================================================
  notification: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserNotifications(ctx.user.id);
    }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadNotificationCount(ctx.user.id);
    }),
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationRead(input.id);
        return { success: true };
      }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // ============================================================
  // AUDIT LOG ROUTES
  // ============================================================
  auditLog: router({
    list: requirePermission("ViewAuditLog")
      .input(z.object({
        entityType: z.string().optional(),
        entityId: z.number().optional(),
        userId: z.number().optional(),
        limit: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAuditLogs(input ?? undefined);
      }),
  }),

  // ============================================================
  // DASHBOARD ROUTES
  // ============================================================
  dashboard: router({
    stats: protectedProcedure
      .input(z.object({ wilayatId: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const wilayatId = enforceWilayatScope(ctx.user, input?.wilayatId);
        return db.getDashboardStats(wilayatId);
      }),
    recentApprovals: protectedProcedure.query(async () => {
      return db.getAllApprovals({ status: "pending_review" });
    }),
    recentAuditLogs: protectedProcedure.query(async () => {
      return db.getAuditLogs({ limit: 10 });
    }),
    /** Get stores assigned to a specific employee */
    myStores: protectedProcedure.query(async ({ ctx }) => {
      // Find employee record for this user
      const employee = await db.getEmployeeByUserId(ctx.user.id);
      if (!employee) return [];
      return db.getAllStores({ responsibleEmployeeId: employee.id });
    }),
    /** Get mandoubs under a specific employee */
    myMandoubs: protectedProcedure.query(async ({ ctx }) => {
      const employee = await db.getEmployeeByUserId(ctx.user.id);
      if (!employee) return [];
      return db.getAllMandoubs({ responsibleEmployeeId: employee.id });
    }),
  }),

  // ============================================================
  // STORE FOLLOW-UP ROUTES
  // ============================================================
  storeFollowUp: router({
    list: requirePermission("ManageStoreDetails")
      .input(z.object({ storeId: z.number() }))
      .query(async ({ input }) => {
        return db.getStoreFollowUps(input.storeId);
      }),
    create: requirePermission("ManageStoreDetails")
      .input(z.object({ storeId: z.number(), actionType: z.string(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await db.createStoreFollowUp({ ...input, employeeId: ctx.user.id });
        return { success: true };
      }),
  }),

  // ============================================================
  // PHASE 2 ROUTERS
  // ============================================================
  bulkImport: bulkImportRouter,
  order: orderRouter,
  customer: customerRouter,
  booking: bookingRouter,
  refund: refundRouter,
  coupon: couponRouter,
  offer: offerRouter,
  complaint: complaintRouter,
  budget: budgetRouter,
  expense: expenseRouter,
  revenue: revenueRouter,
  mandoubDue: mandoubDueRouter,
  storeDue: storeDueRouter,
  settlement: settlementRouter,
  phase2Dashboard: phase2DashboardRouter,
  dataImport: dataImportRouter,
  dataImportP2: dataImportP2Router,
  dataImportP3: dataImportP3Router,

  // ============================================================
  // ROLE & JOB TITLE MANAGEMENT ROUTES
  // ============================================================
  role: router({
    list: requirePermission("ManageSettings").query(async () => {
      return db.getAllRoles();
    }),
    getById: requirePermission("ManageSettings")
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const role = await db.getRoleById(input.id);
        if (!role) throw new TRPCError({ code: "NOT_FOUND" });
        const perms = await db.getRolePermissions(input.id);
        return { ...role, permissions: perms.map(p => p.permission) };
      }),
    create: requirePermission("ManageSettings")
      .input(z.object({
        name: z.string(),
        nameAr: z.string(),
        nameEn: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isSuperAdminUser(ctx.user)) throw new TRPCError({ code: "FORBIDDEN" });
        await db.createRole({ ...input, nameEn: input.nameEn || "", isSystemRole: false, isActive: true });
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "role_created", entityType: "role", newValues: input });
        return { success: true };
      }),
    update: requirePermission("ManageSettings")
      .input(z.object({
        id: z.number(),
        nameAr: z.string().optional(),
        nameEn: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isSuperAdminUser(ctx.user)) throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await db.updateRole(id, data as any);
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "role_updated", entityType: "role", entityId: id, newValues: data });
        return { success: true };
      }),
    setPermissions: requirePermission("ManageSettings")
      .input(z.object({
        roleId: z.number(),
        permissions: z.array(z.string()),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isSuperAdminUser(ctx.user)) throw new TRPCError({ code: "FORBIDDEN" });
        await db.setRolePermissions(input.roleId, input.permissions);
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "role_permissions_updated", entityType: "role", entityId: input.roleId, newValues: { permissions: input.permissions } });
        return { success: true };
      }),
  }),

  jobTitle: router({
    list: requirePermission("ManageSettings").query(async () => {
      return db.getAllJobTitles();
    }),
    create: requirePermission("ManageSettings")
      .input(z.object({
        nameAr: z.string(),
        nameEn: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isSuperAdminUser(ctx.user)) throw new TRPCError({ code: "FORBIDDEN" });
        await db.createJobTitle({ ...input, nameEn: input.nameEn || "", isActive: true });
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "job_title_created", entityType: "job_title", newValues: input });
        return { success: true };
      }),
    update: requirePermission("ManageSettings")
      .input(z.object({
        id: z.number(),
        nameAr: z.string().optional(),
        nameEn: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!isSuperAdminUser(ctx.user)) throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await db.updateJobTitle(id, data as any);
        await db.createAuditLog({ userId: ctx.user.id, userName: ctx.user.name ?? "", actionType: "job_title_updated", entityType: "job_title", entityId: id, newValues: data });
        return { success: true };
      }),
   }),

  // ============================================================
  // FILE UPLOAD
  // ============================================================
  upload: router({
    image: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        base64Data: z.string(),
        folder: z.enum(["profiles", "stores", "products", "mandoubs", "employees", "general"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const { fileName, base64Data, folder } = input;

        // Validate base64 data
        const matches = base64Data.match(/^data:(image\/(jpeg|jpg|png|webp));base64,(.+)$/);
        if (!matches) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid image format. Supported: JPG, PNG, WebP / صيغة الصورة غير مدعومة. المدعوم: JPG, PNG, WebP" });
        }

        const mimeType = matches[1];
        const rawBase64 = matches[3];
        const buffer = Buffer.from(rawBase64, "base64");

        // Validate file size (max 25MB)
        if (buffer.length > 25 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Image too large. Maximum size is 25MB. / حجم الصورة كبير جداً. الحد الأقصى 25 ميجابايت" });
        }

        // Sanitize filename
        const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
        const ext = sanitized.split(".").pop() || "png";
        const key = `${folder}/${ctx.user.id}-${Date.now()}.${ext}`;

        // Upload to S3
        const { storagePut } = await import("./storage");
        const { url } = await storagePut(key, buffer, mimeType);

        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? "",
          actionType: "file_uploaded",
          entityType: folder,
          notes: `Uploaded ${sanitized} to ${folder}`,
          newValues: { url, fileName: sanitized, size: buffer.length },
        });

        return { url, key };
      }),
  }),
});
export type AppRouter = typeof appRouter;
