import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

/**
 * Dev-only authentication bypass.
 *
 * Enabled when:
 *   - NODE_ENV !== "production"
 *   - DEV_AUTH_BYPASS === "true"
 *
 * Endpoints:
 *   GET /api/dev/login           -> log in as the owner/manager and redirect to "/"
 *   GET /api/dev/login?as=role   -> log in as a specific maksabRole (manager, employee, ...)
 *   GET /api/dev/whoami          -> show the current session payload
 *
 * NEVER expose this in production.
 */
export function registerDevAuthRoutes(app: Express): void {
  if (ENV.isProduction) return;
  if (process.env.DEV_AUTH_BYPASS !== "true") return;

  console.log(
    "[DevAuth] /api/dev/login is ENABLED (NODE_ENV != production && DEV_AUTH_BYPASS=true)"
  );

  app.get("/api/dev/login", async (req: Request, res: Response) => {
    try {
      const asRole = (req.query.as as string | undefined) ?? "manager";
      const openId = ENV.ownerOpenId || "local-dev-owner";
      const name = `Local Dev (${asRole})`;
      const email = "dev@local.test";

      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod: "dev-bypass",
        role: "admin",
        maksabRole: asRole as any,
        status: "active",
        lastSignedIn: new Date(),
      });

      const token = await sdk.createSessionToken(openId, {
        expiresInMs: ONE_YEAR_MS,
        name,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        sameSite: "lax",
        secure: false,
        maxAge: ONE_YEAR_MS,
      });

      const redirectTo = (req.query.redirect as string | undefined) ?? "/";
      res.redirect(redirectTo);
    } catch (error) {
      console.error("[DevAuth] Login failed:", error);
      res.status(500).json({
        error: "Dev login failed",
        details: String(error),
      });
    }
  });

  app.get("/api/dev/whoami", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ ok: true, user });
    } catch (error) {
      res.json({ ok: false, error: String(error) });
    }
  });
}
