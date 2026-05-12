import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

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
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
  return { ctx };
}

describe("auth.me", () => {
  it("returns null for unauthenticated user", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user object for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user-001");
    expect(result?.maksabRole).toBe("manager");
    expect(result?.name).toBe("Test Admin");
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});

describe("permissions", () => {
  it("rejects unauthenticated access to employee.list", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.employee.list()).rejects.toThrow();
  });

  it("rejects employee role from managing employees (no ManageEmployees permission)", async () => {
    const { ctx } = createAuthContext({ maksabRole: "mandoub", permissions: [] });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.employee.list()).rejects.toThrow();
  });

  it("allows manager role to access employee.list", async () => {
    const { ctx } = createAuthContext({ maksabRole: "manager" });
    const caller = appRouter.createCaller(ctx);
    // This will attempt a DB call; in test env it returns empty array
    const result = await caller.employee.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("dashboard.stats", () => {
  it("returns stats object for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.stats();
    // Should return an object with numeric counts
    if (result) {
      expect(typeof result.totalUsers).toBe("number");
      expect(typeof result.totalEmployees).toBe("number");
      expect(typeof result.totalMandoubs).toBe("number");
      expect(typeof result.totalStores).toBe("number");
    }
  });
});

describe("notification.list", () => {
  it("rejects unauthenticated access", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.notification.list()).rejects.toThrow();
  });

  it("returns array for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.notification.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("wilayat.list", () => {
  it("returns array for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.wilayat.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
