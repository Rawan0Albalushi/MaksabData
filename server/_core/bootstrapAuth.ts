import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { timingSafeEqual } from "crypto";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { ENV } from "./env";
import { sdk } from "./sdk";

const DEFAULT_BOOTSTRAP_OPEN_ID = "bootstrap-owner";

/**
 * Production-safe bootstrap admin login.
 *
 * This exists so the project owner can log in when the regular OAuth flow
 * is misconfigured (e.g. missing VITE_OAUTH_PORTAL_URL on Railway) — without
 * which the app would be unreachable.
 *
 * Enabled when `BOOTSTRAP_LOGIN_SECRET` env var is set. The route returns
 * 404 (falls through to static) when it isn't.
 *
 * Usage:
 *   1. Set `BOOTSTRAP_LOGIN_SECRET` to a long random string on Railway
 *      (e.g. `openssl rand -base64 32`).
 *   2. (Optional) Set `OWNER_OPEN_ID` to the openId of the user to log in
 *      as. Defaults to "bootstrap-owner". You can also override per-request
 *      with `?openId=...` in the URL.
 *   3. Re-deploy.
 *   4. Visit:
 *      https://<your-host>/api/admin/bootstrap-login?secret=<the secret>
 *   5. You'll be redirected to `/` and logged in as the owner (Manager role).
 *   6. After your OAuth is configured properly, UNSET `BOOTSTRAP_LOGIN_SECRET`
 *      and re-deploy to remove the route.
 *
 * The secret is compared in constant time and every use (success or fail)
 * is logged so the audit trail is visible in deploy logs.
 */
export function registerBootstrapAuthRoutes(app: Express): void {
  const secret = process.env.BOOTSTRAP_LOGIN_SECRET;
  if (!secret) {
    console.log(
      "[BootstrapAuth] BOOTSTRAP_LOGIN_SECRET not set; bootstrap login route is DISABLED."
    );
    return;
  }

  const defaultOpenId = ENV.ownerOpenId || DEFAULT_BOOTSTRAP_OPEN_ID;

  console.warn(
    `[BootstrapAuth] /api/admin/bootstrap-login is ENABLED ` +
      `(defaultOpenId=${defaultOpenId}). ` +
      `Unset BOOTSTRAP_LOGIN_SECRET after you've configured real OAuth.`
  );

  app.get(
    "/api/admin/bootstrap-login",
    async (req: Request, res: Response) => {
      const provided =
        typeof req.query.secret === "string" ? req.query.secret : "";

      const expectedBuf = Buffer.from(secret);
      const providedBuf = Buffer.from(provided);

      // Constant-time compare. Different lengths fail without leaking.
      const ok =
        expectedBuf.length === providedBuf.length &&
        timingSafeEqual(expectedBuf, providedBuf);

      if (!ok) {
        console.warn(
          `[BootstrapAuth] Rejected bootstrap login attempt from ${
            req.ip ?? "unknown"
          }`
        );
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      if (!ENV.cookieSecret) {
        console.error(
          "[BootstrapAuth] JWT_SECRET is not set; cannot sign session cookie."
        );
        res.status(500).json({
          error: "Server misconfigured: JWT_SECRET is not set",
        });
        return;
      }

      try {
        const openIdQuery =
          typeof req.query.openId === "string" ? req.query.openId : "";
        const openId = openIdQuery || defaultOpenId;
        const name = "Bootstrap Owner";

        await db.upsertUser({
          openId,
          name,
          email: null,
          loginMethod: "bootstrap",
          role: "admin",
          maksabRole: "manager",
          status: "active",
          lastSignedIn: new Date(),
        });

        const token = await sdk.createSessionToken(openId, {
          expiresInMs: ONE_YEAR_MS,
          name,
        });

        // Use Lax + Secure for the bootstrap flow specifically. Lax works
        // for the same-site redirect we're about to do (bootstrap-login -> /
        // on the same domain), avoids the SameSite=None+Secure constraint
        // that can drop cookies silently behind some proxies, and Secure is
        // safe because Railway always terminates TLS in front of us.
        const isLocalhost =
          req.hostname === "localhost" ||
          req.hostname === "127.0.0.1" ||
          req.hostname === "::1";

        res.cookie(COOKIE_NAME, token, {
          httpOnly: true,
          path: "/",
          sameSite: "lax",
          secure: !isLocalhost,
          maxAge: ONE_YEAR_MS,
        });

        console.warn(
          `[BootstrapAuth] Bootstrap login succeeded for openId=${openId} ` +
            `from ${req.ip ?? "unknown"}`
        );

        res.redirect(302, "/");
      } catch (error) {
        console.error("[BootstrapAuth] Login failed:", error);
        res.status(500).json({
          error: "Bootstrap login failed",
          details: String(error),
        });
      }
    }
  );
}
