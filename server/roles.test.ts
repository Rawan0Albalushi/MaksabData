import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "admin@maksab.com",
    name: "Test Admin",
    loginMethod: "manus",
    role: "admin",
    phone: "+96812345678",
    maksabRole: "manager",
    jobTitle: "Manager",
    wilayatId: 1,
    profilePhoto: null,
    status: "active",
    managerId: null,
    permissions: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    archived: false,
    ...overrides,
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
  return { ctx };
}

// ==================== ROLE ROUTER ====================
describe("role router", () => {
  it("rejects unauthenticated access to role.list", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.role.list()).rejects.toThrow();
  });

  it("returns array for admin user", async () => {
    const { ctx } = createAuthContext({ maksabRole: "manager" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.role.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects non-admin from creating roles", async () => {
    const { ctx } = createAuthContext({ role: "user", maksabRole: "employee" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.role.create({ name: "test_role", nameAr: "Test", nameEn: "Test" })).rejects.toThrow();
  });

  it("admin can create a new role", async () => {
    const { ctx } = createAuthContext({ role: "admin", maksabRole: "manager" });
    const caller = appRouter.createCaller(ctx);
    const slug = `test_role_${Date.now()}`;
    const result = await caller.role.create({ name: slug, nameAr: "دور تجريبي", nameEn: "Test Role" });
    expect(result.success).toBe(true);
  });

  it("admin can list roles and see newly created role", async () => {
    const { ctx } = createAuthContext({ role: "admin", maksabRole: "manager" });
    const caller = appRouter.createCaller(ctx);
    const slug = `list_test_${Date.now()}`;
    await caller.role.create({ name: slug, nameAr: "للعرض", nameEn: "For List" });
    const roles = await caller.role.list();
    expect(roles.some((r: any) => r.name === slug)).toBe(true);
  });

  it("admin can update a role (name, isActive)", async () => {
    const { ctx } = createAuthContext({ role: "admin", maksabRole: "manager" });
    const caller = appRouter.createCaller(ctx);
    const slug = `update_test_${Date.now()}`;
    await caller.role.create({ name: slug, nameAr: "قبل", nameEn: "Before" });
    const roles = await caller.role.list();
    const role = roles.find((r: any) => r.name === slug);
    expect(role).toBeDefined();
    const updateResult = await caller.role.update({ id: role!.id, nameAr: "بعد", isActive: false });
    expect(updateResult.success).toBe(true);
    // Verify the update
    const updated = await caller.role.getById({ id: role!.id });
    expect(updated?.nameAr).toBe("بعد");
    expect(updated?.isActive).toBe(false);
  });

  it("admin can set permissions for a role", async () => {
    const { ctx } = createAuthContext({ role: "admin", maksabRole: "manager" });
    const caller = appRouter.createCaller(ctx);
    const slug = `perms_test_${Date.now()}`;
    await caller.role.create({ name: slug, nameAr: "صلاحيات", nameEn: "Perms" });
    const roles = await caller.role.list();
    const role = roles.find((r: any) => r.name === slug);
    expect(role).toBeDefined();
    const permsResult = await caller.role.setPermissions({ roleId: role!.id, permissions: ["ManageStores", "ManageOrders"] });
    expect(permsResult.success).toBe(true);
    // Verify permissions were saved
    const roleWithPerms = await caller.role.getById({ id: role!.id });
    expect(roleWithPerms?.permissions).toContain("ManageStores");
    expect(roleWithPerms?.permissions).toContain("ManageOrders");
  });
});

// ==================== JOB TITLE ROUTER ====================
describe("jobTitle router", () => {
  it("rejects unauthenticated access to jobTitle.list", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.jobTitle.list()).rejects.toThrow();
  });

  it("returns array for admin user", async () => {
    const { ctx } = createAuthContext({ maksabRole: "manager" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.jobTitle.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects non-admin from creating job titles", async () => {
    const { ctx } = createAuthContext({ role: "user", maksabRole: "employee" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.jobTitle.create({ nameAr: "Test", nameEn: "Test" })).rejects.toThrow();
  });

  it("admin can create a job title", async () => {
    const { ctx } = createAuthContext({ role: "admin", maksabRole: "manager" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.jobTitle.create({ nameAr: "مشرف ميداني", nameEn: "Field Supervisor" });
    expect(result.success).toBe(true);
  });

  it("admin can list job titles and see newly created one", async () => {
    const { ctx } = createAuthContext({ role: "admin", maksabRole: "manager" });
    const caller = appRouter.createCaller(ctx);
    const uniqueName = `مسمى_${Date.now()}`;
    await caller.jobTitle.create({ nameAr: uniqueName, nameEn: "Unique Title" });
    const titles = await caller.jobTitle.list();
    expect(titles.some((jt: any) => jt.nameAr === uniqueName)).toBe(true);
  });

  it("admin can update a job title (deactivate)", async () => {
    const { ctx } = createAuthContext({ role: "admin", maksabRole: "manager" });
    const caller = appRouter.createCaller(ctx);
    const uniqueName = `تحديث_${Date.now()}`;
    await caller.jobTitle.create({ nameAr: uniqueName, nameEn: "To Update" });
    const titles = await caller.jobTitle.list();
    const jt = titles.find((t: any) => t.nameAr === uniqueName);
    expect(jt).toBeDefined();
    const updateResult = await caller.jobTitle.update({ id: jt!.id, isActive: false, nameAr: "محدث" });
    expect(updateResult.success).toBe(true);
  });
});

// ==================== STORE ENUM FILTERS ====================
describe("store list with new enum filters", () => {
  it("accepts communicationStatus filter with new enum values", async () => {
    const { ctx } = createAuthContext({ maksabRole: "manager" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.store.list({ communicationStatus: "needs_follow_up" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("accepts activationStatus filter with hidden value", async () => {
    const { ctx } = createAuthContext({ maksabRole: "manager" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.store.list({ activationStatus: "hidden" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("accepts addedInSystem filter with in_progress value", async () => {
    const { ctx } = createAuthContext({ maksabRole: "manager" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.store.list({ addedInSystem: "in_progress" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("accepts category filter with fixed enum value", async () => {
    const { ctx } = createAuthContext({ maksabRole: "manager" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.store.list({ category: "restaurant" });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ==================== STORE CREATE WITH ONBOARDING FIELDS ====================
describe("store create with onboarding fields", () => {
  it("creates store with only nameAr (minimum required)", async () => {
    const { ctx } = createAuthContext({ role: "admin", maksabRole: "manager" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.store.create({ nameAr: `محل_${Date.now()}` });
    expect(result.success).toBe(true);
  });

  it("creates store with all onboarding fields", async () => {
    const { ctx } = createAuthContext({ role: "admin", maksabRole: "manager" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.store.create({
      nameAr: `محل_كامل_${Date.now()}`,
      nameEn: "Full Store",
      merchantName: "Ahmed",
      merchantPhone: "+96812345678",
      category: "restaurant",
      classification: "contracted",
      communicationStatus: "yes",
      merchantApproval: "yes",
      addedInSystem: "yes",
      activationStatus: "active",
      notes: "Test notes",
    });
    expect(result.success).toBe(true);
  });
});
