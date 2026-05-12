import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/** Simple retry helper for transient DB errors (ECONNRESET, ETIMEDOUT) */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isTransient = error?.cause?.code === "ECONNRESET" ||
        error?.cause?.code === "ETIMEDOUT" ||
        error?.code === "ECONNRESET" ||
        error?.code === "ETIMEDOUT";
      if (!isTransient || attempt === retries) throw error;
      await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw new Error("Retry exhausted");
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Check if this is the project owner
      const isOwner = userInfo.openId === ENV.ownerOpenId;

      // Check if user already exists to determine if this is first login (with retry for transient DB errors)
      const existingUser = await withRetry(() => db.getUserByOpenId(userInfo.openId));
      const isFirstLogin = !existingUser;

      // Build upsert data
      const upsertData: any = {
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      };

      // Auto-assign owner as Manager with full permissions on first login
      // Also fix existing owner records that don't have maksabRole set
      if (isOwner) {
        upsertData.role = "admin";
        if (!existingUser?.maksabRole || existingUser.maksabRole !== "manager") {
          upsertData.maksabRole = "manager";
          upsertData.status = "active";
        }
      }

      // New non-owner users: set status to pending_approval so they land on Pending Role Assignment
      if (isFirstLogin && !isOwner) {
        upsertData.status = "pending_approval";
      }

      await withRetry(() => db.upsertUser(upsertData));

      // Log login event in audit log (non-critical, don't fail on error)
      try {
        const loggedInUser = await withRetry(() => db.getUserByOpenId(userInfo.openId));
        if (loggedInUser) {
          await db.createAuditLog({
            userId: loggedInUser.id,
            userName: loggedInUser.name ?? userInfo.name ?? "",
            actionType: isFirstLogin ? "user_first_login" : "user_login",
            entityType: "user",
            entityId: loggedInUser.id,
            newValues: {
              loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
              timestamp: new Date().toISOString(),
              isOwner,
              maksabRole: loggedInUser.maksabRole,
            },
          });
        }
      } catch (auditError) {
        console.warn("[OAuth] Audit log failed (non-critical):", auditError);
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      // Redirect to home with error flag instead of showing raw JSON error
      res.redirect(302, "/?auth_error=callback_failed");
    }
  });
}
