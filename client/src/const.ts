export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
// Both `VITE_OAUTH_PORTAL_URL` and `VITE_APP_ID` must be set at *build time*
// (not just runtime) because Vite inlines them into the client bundle.
// If they're missing we throw rather than silently building a URL that
// points at the app's own origin (which previously presented as
// "auth.me always returns null" with no other error).
export const getLoginUrl = (): string => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  if (!oauthPortalUrl || !appId) {
    const msg =
      "[Auth] VITE_OAUTH_PORTAL_URL and/or VITE_APP_ID were not set when " +
      "this client bundle was built. The app must be rebuilt with these " +
      "env vars defined before login can work.";
    console.error(msg);
    throw new Error(msg);
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);
  const normalizedPortal = oauthPortalUrl.replace(/\/+$/, "");

  const url = new URL(`${normalizedPortal}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
