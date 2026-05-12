export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Safe fallback so production builds never feed `undefined` into `new URL()`.
// If `VITE_OAUTH_PORTAL_URL` is not provided at build time (e.g. on Railway),
// we fall back to the deployed app origin to avoid runtime crashes.
const DEFAULT_OAUTH_PORTAL_URL = "https://maksabdata-production.up.railway.app";
const DEFAULT_APP_ID = "maksab";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl =
    import.meta.env.VITE_OAUTH_PORTAL_URL || DEFAULT_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID || DEFAULT_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  // Normalize trailing slash so the resulting URL is always well-formed.
  const normalizedPortal = oauthPortalUrl.replace(/\/+$/, "");

  const url = new URL(`${normalizedPortal}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
