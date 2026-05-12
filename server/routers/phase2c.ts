/**
 * Phase 2C Routers: Finance (Budgets, Expenses, Revenues, Mandoub Dues, Store Dues, Settlements)
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
// BUDGETS ROUTER
// ============================================================
export const budgetRouter = router({
  list: requirePermission("ViewFinance")
    .input(z.object({
      wilayatId: z.number().optional(),
      status: z.string().optional(),
      feature: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getAllBudgets(input ?? undefined);
    }),
  getById: requirePermission("ViewFinance")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getBudgetById(input.id);
    }),
  create: requirePermission("ManageBudgets")
    .input(z.object({
      name: z.string(),
      feature: z.string(),
      approvedAmount: z.string(),
      wilayatId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createBudget({
        ...input,
        spentAmount: "0",
        remainingAmount: input.approvedAmount,
        status: "active",
        createdById: ctx.user.id,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      } as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "budget_created",
        entityType: "budget",
        newValues: input,
      });
      return { success: true };
    }),
  update: requirePermission("ManageBudgets")
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      approvedAmount: z.string().optional(),
      status: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const old = await db.getBudgetById(id);
      await db.updateBudget(id, data as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "budget_updated",
        entityType: "budget",
        entityId: id,
        oldValues: old,
        newValues: data,
      });
      return { success: true };
    }),
});

// ============================================================
// EXPENSES ROUTER
// ============================================================
export const expenseRouter = router({
  list: requirePermission("ViewFinance")
    .input(z.object({
      wilayatId: z.number().optional(),
      expenseType: z.string().optional(),
      approvalStatus: z.string().optional(),
      budgetId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getAllExpenses(input ?? undefined);
    }),
  getById: requirePermission("ViewFinance")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getExpenseById(input.id);
    }),
  create: requirePermission("ManageExpenses")
    .input(z.object({
      expenseType: z.string(),
      description: z.string(),
      amount: z.string(),
      budgetId: z.number().optional(),
      wilayatId: z.number().optional(),
      receiptUrl: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createExpense({
        ...input,
        approvalStatus: "pending_approval",
        registeredById: ctx.user.id,
        expenseDate: new Date(),
      } as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "expense_created",
        entityType: "expense",
        newValues: input,
      });
      // Notify finance managers
      const allUsers = await db.getAllUsers();
      const financeUsers = allUsers.filter((u: any) => u.maksabRole === "finance_manager" || ["manager", "deputy_manager"].includes(u.maksabRole));
      for (const fu of financeUsers) {
        await db.createNotification({
          userId: fu.id,
          title: "New Expense Request",
          message: `${ctx.user.name} submitted an expense of ${input.amount} for ${input.description}`,
          type: "approval_request",
          relatedEntityType: "expense",
        });
      }
      return { success: true };
    }),
  approve: requirePermission("ApproveExpenses")
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const expense = await db.getExpenseById(input.id);
      if (!expense) throw new TRPCError({ code: "NOT_FOUND" });
      await db.updateExpense(input.id, {
        approvalStatus: input.status,
        approvedById: ctx.user.id,
        approvedAt: new Date(),
      } as any);

      // If approved and linked to budget, update budget spent/remaining
      if (input.status === "approved" && expense.budgetId) {
        const budget = await db.getBudgetById(expense.budgetId);
        if (budget) {
          const spent = parseFloat(budget.spentAmount || "0") + parseFloat(expense.amount || "0");
          const remaining = parseFloat(budget.approvedAmount || "0") - spent;
          await db.updateBudget(expense.budgetId, {
            spentAmount: spent.toFixed(2),
            remainingAmount: remaining.toFixed(2),
          } as any);
        }
      }

      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: `expense_${input.status}`,
        entityType: "expense",
        entityId: input.id,
        oldValues: { approvalStatus: expense.approvalStatus },
        newValues: { approvalStatus: input.status },
        notes: input.notes,
      });
      return { success: true };
    }),
});

// ============================================================
// REVENUES ROUTER
// ============================================================
export const revenueRouter = router({
  list: requirePermission("ViewFinance")
    .input(z.object({
      wilayatId: z.number().optional(),
      source: z.string().optional(),
      storeId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getAllRevenues(input ?? undefined);
    }),
  create: requirePermission("ManageRevenues")
    .input(z.object({
      source: z.string(),
      amount: z.string(),
      description: z.string().optional(),
      orderId: z.number().optional(),
      storeId: z.number().optional(),
      wilayatId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createRevenue({
        ...input,
        status: "recorded",
        registeredById: ctx.user.id,
        revenueDate: new Date(),
      } as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "revenue_recorded",
        entityType: "revenue",
        newValues: input,
      });
      return { success: true };
    }),
});

// ============================================================
// MANDOUB DUES ROUTER
// ============================================================
export const mandoubDueRouter = router({
  list: requirePermission("ViewFinance")
    .input(z.object({
      mandoubId: z.number().optional(),
      paymentStatus: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getAllMandoubDues(input ?? undefined);
    }),
  create: requirePermission("ManageMandoubDues")
    .input(z.object({
      mandoubId: z.number(),
      orderId: z.number().optional(),
      earningType: z.string(),
      amount: z.string(),
      description: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createMandoubDue({
        ...input,
        earningType: input.earningType as any,
        paymentStatus: "unpaid",
      } as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "mandoub_due_created",
        entityType: "mandoub_due",
        newValues: input,
      });
      return { success: true };
    }),
  updatePayment: requirePermission("ManageMandoubDues")
    .input(z.object({
      id: z.number(),
      paymentStatus: z.string(),
      paymentMethod: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.paymentStatus === "paid") updateData.paymentDate = new Date();
      await db.updateMandoubDue(id, updateData);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "mandoub_due_payment_updated",
        entityType: "mandoub_due",
        entityId: id,
        newValues: data,
      });
      return { success: true };
    }),
});

// ============================================================
// STORE DUES ROUTER
// ============================================================
export const storeDueRouter = router({
  list: requirePermission("ViewFinance")
    .input(z.object({
      storeId: z.number().optional(),
      settlementStatus: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getAllStoreDues(input ?? undefined);
    }),
  create: requirePermission("ManageStoreDues")
    .input(z.object({
      storeId: z.number(),
      orderId: z.number().optional(),
      earningType: z.string().optional(),
      amount: z.string(),
      commissionRate: z.string().optional(),
      description: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { earningType, amount, commissionRate, ...rest } = input;
      await db.createStoreDue({
        ...rest,
        storeDueAmount: amount,
        commissionPercentage: commissionRate || null,
        settlementStatus: "unsettled",
      } as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "store_due_created",
        entityType: "store_due",
        newValues: input,
      });
      return { success: true };
    }),
  updateSettlement: requirePermission("ManageStoreDues")
    .input(z.object({
      id: z.number(),
      settlementStatus: z.string(),
      settlementId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.settlementStatus === "settled") updateData.settlementDate = new Date();
      await db.updateStoreDue(id, updateData);
      return { success: true };
    }),
});

// ============================================================
// SETTLEMENTS ROUTER
// ============================================================
export const settlementRouter = router({
  list: requirePermission("ViewFinance")
    .input(z.object({
      settlementType: z.string().optional(),
      status: z.string().optional(),
      relatedEntityType: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return db.getAllSettlements(input ?? undefined);
    }),
  getById: requirePermission("ViewFinance")
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getSettlementById(input.id);
    }),
  create: requirePermission("ManageSettlements")
    .input(z.object({
      settlementType: z.string(),
      relatedEntityType: z.string(),
      relatedEntityId: z.number(),
      totalAmount: z.string(),
      paymentMethod: z.string().optional(),
      referenceNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createSettlement({
        ...input,
        status: "pending",
        createdById: ctx.user.id,
        settlementDate: new Date(),
      } as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: "settlement_created",
        entityType: "settlement",
        newValues: input,
      });
      return { success: true };
    }),
  approve: requirePermission("ApproveSettlements")
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const settlement = await db.getSettlementById(input.id);
      if (!settlement) throw new TRPCError({ code: "NOT_FOUND" });
      await db.updateSettlement(input.id, {
        status: input.status,
        approvedById: ctx.user.id,
      } as any);
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name ?? "",
        actionType: `settlement_${input.status}`,
        entityType: "settlement",
        entityId: input.id,
        oldValues: { status: settlement.status },
        newValues: { status: input.status },
        notes: input.notes,
      });
      return { success: true };
    }),
});

// ============================================================
// PHASE 2 DASHBOARD STATS
// ============================================================
export const phase2DashboardRouter = router({
  stats: protectedProcedure
    .input(z.object({ wilayatId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return db.getPhase2DashboardStats(input?.wilayatId);
    }),
});
