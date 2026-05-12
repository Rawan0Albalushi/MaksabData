import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import axios from "axios";
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

/**
 * Build the public origin of this request, honoring x-forwarded-proto/host
 * so URLs are correct behind Railway's edge proxy.
 */
function getPublicOrigin(req: Request): string {
  const protoHeader = req.headers["x-forwarded-proto"];
  const rawProto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
  const proto = (rawProto ?? req.protocol).split(",")[0].trim();
  const host = req.get("x-forwarded-host") ?? req.get("host");
  return `${proto}://${host}`;
}

type OAuthUserInfo = {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod: string;
};

/**
 * Shared post-OAuth flow: upsert user, detect first login & owner, write
 * audit log, sign session JWT, set cookie, redirect to "/".
 *
 * Called by both the Manus OAuth callback and the Google OAuth callback so
 * the user-provisioning rules (auto-Manager for owner, pending_approval for
 * new non-owner users, audit logging) stay in one place.
 */
async function establishSession(
  req: Request,
  res: Response,
  info: OAuthUserInfo
): Promise<void> {
  if (!info.openId) {
    res.status(400).json({ error: "openId missing from user info" });
    return;
  }

  const normalizedEmail = info.email?.toLowerCase() ?? null;
  const isOwnerByOpenId = info.openId === ENV.ownerOpenId;
  const isOwnerByEmail =
    normalizedEmail !== null && ENV.ownerEmails.includes(normalizedEmail);
  const isOwner = isOwnerByOpenId || isOwnerByEmail;

  const existingUser = await withRetry(() => db.getUserByOpenId(info.openId));
  const isFirstLogin = !existingUser;

  const upsertData: any = {
    openId: info.openId,
    name: info.name || null,
    email: info.email ?? null,
    loginMethod: info.loginMethod,
    lastSignedIn: new Date(),
  };

  if (isOwner) {
    upsertData.role = "admin";
    if (!existingUser?.maksabRole || existingUser.maksabRole !== "manager") {
      upsertData.maksabRole = "manager";
      upsertData.status = "active";
    }
  }

  if (isFirstLogin && !isOwner) {
    upsertData.status = "pending_approval";
  }

  await withRetry(() => db.upsertUser(upsertData));

  try {
    const loggedInUser = await withRetry(() => db.getUserByOpenId(info.openId));
    if (loggedInUser) {
      await db.createAuditLog({
        userId: loggedInUser.id,
        userName: loggedInUser.name ?? info.name ?? "",
        actionType: isFirstLogin ? "user_first_login" : "user_login",
        entityType: "user",
        entityId: loggedInUser.id,
        newValues: {
          loginMethod: info.loginMethod,
          timestamp: new Date().toISOString(),
          isOwner,
          maksabRole: loggedInUser.maksabRole,
        },
      });
    }
  } catch (auditError) {
    console.warn("[OAuth] Audit log failed (non-critical):", auditError);
  }

  const sessionToken = await sdk.createSessionToken(info.openId, {
    name: info.name || "",
    expiresInMs: ONE_YEAR_MS,
  });

  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
  res.redirect(302, "/");
}

export function registerOAuthRoutes(app: Express) {
  // ─── Manus webdev OAuth callback (used when running on Manus) ──────────────
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

      await establishSession(req, res, {
        openId: userInfo.openId,
        name: userInfo.name,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? "manus",
      });
    } catch (error) {
      console.error("[OAuth] Manus callback failed", error);
      res.redirect(302, "/?auth_error=callback_failed");
    }
  });

  // ─── Google OAuth (self-hosted fallback when Manus portal isn't available) ─
  app.get("/api/auth/google", (req: Request, res: Response) => {
    const clientId = ENV.googleClientId;
    if (!clientId) {
      console.error(
        "[OAuth] /api/auth/google hit but GOOGLE_CLIENT_ID is not set"
      );
      res.status(500).json({
        error: "Google OAuth is not configured on this deployment",
      });
      return;
    }

    const redirectUri = `${getPublicOrigin(req)}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
    });

    res.redirect(
      302,
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    );
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const errorParam = getQueryParam(req, "error");

    if (errorParam) {
      console.warn("[OAuth] Google returned error:", errorParam);
      res.redirect(302, `/?auth_error=${encodeURIComponent(errorParam)}`);
      return;
    }

    if (!code) {
      res.status(400).json({ error: "code is required" });
      return;
    }

    const clientId = ENV.googleClientId;
    const clientSecret = ENV.googleClientSecret;
    if (!clientId || !clientSecret) {
      console.error(
        "[OAuth] Google callback hit but GOOGLE_CLIENT_ID/SECRET are not set"
      );
      res.status(500).json({
        error: "Google OAuth is not configured on this deployment",
      });
      return;
    }

    try {
      const redirectUri = `${getPublicOrigin(req)}/api/auth/google/callback`;

      const tokenResp = await axios.post(
        "https://oauth2.googleapis.com/token",
        new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const accessToken: string | undefined = tokenResp.data?.access_token;
      if (!accessToken) {
        throw new Error("Google did not return an access_token");
      }

      const userInfoResp = await axios.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const googleUser = userInfoResp.data as {
        id: string;
        email?: string;
        name?: string;
        verified_email?: boolean;
      };

      if (!googleUser?.id) {
        throw new Error("Google user info missing id");
      }

      await establishSession(req, res, {
        openId: `google_${googleUser.id}`,
        name: googleUser.name ?? null,
        email: googleUser.email ?? null,
        loginMethod: "google",
      });
    } catch (error: any) {
      console.error(
        "[OAuth] Google callback failed:",
        error?.response?.data ?? error?.message ?? error
      );
      res.redirect(302, "/?auth_error=google_callback_failed");
    }
  });
}
