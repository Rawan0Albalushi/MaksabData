// Safe production fallback. If `OAUTH_SERVER_URL` is missing in the deploy
// environment we still want the server to boot and avoid `new URL(undefined)`
// style crashes further down the call chain.
const DEFAULT_OAUTH_SERVER_URL = "https://maksabdata-production.up.railway.app";

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL || DEFAULT_OAUTH_SERVER_URL,
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
