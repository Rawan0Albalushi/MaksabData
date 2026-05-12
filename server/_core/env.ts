// Previously this fell back to the app's own Railway origin when
// `OAUTH_SERVER_URL` was unset. That silently broke login (the app would
// "redirect to OAuth" at its own URL, which just serves the SPA). We now
// leave it empty and log a loud warning so the misconfig is visible.
const oauthServerUrl = process.env.OAUTH_SERVER_URL ?? "";
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !oauthServerUrl) {
  console.error(
    "[Env] OAUTH_SERVER_URL is not set in production. " +
      "Login will not work — token exchange and user-info calls will fail. " +
      "Set OAUTH_SERVER_URL to your OAuth provider's API base URL."
  );
}
if (isProduction && !process.env.JWT_SECRET) {
  console.error(
    "[Env] JWT_SECRET is not set in production. " +
      "Session cookies cannot be signed/verified safely. " +
      "Set JWT_SECRET to a long random string."
  );
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: oauthServerUrl,
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction,
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
