import "dotenv/config";
import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerDevAuthRoutes } from "./devAuth";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

// Surface crashes in the deploy logs instead of letting Node die silently;
// without these, Railway's edge proxy just sees a dropped connection -> 502.
process.on("uncaughtException", (err) => {
  console.error("[Fatal] uncaughtException:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[Fatal] unhandledRejection:", reason);
});

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Lightweight request logger so we can see what Railway is sending us.
  // Express otherwise prints nothing, which is why 502s look like black boxes.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Healthcheck that does NOT depend on the static build or DB. Railway can
  // hit this to verify the container is alive even if the SPA is broken.
  app.get("/healthz", (_req: Request, res: Response) => {
    res.status(200).json({ ok: true, ts: new Date().toISOString() });
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerDevAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Global error handler so a thrown handler can't drop the connection and
  // produce an opaque 502 from Railway's proxy. Must be 4-arg signature.
  const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    console.error(`[HTTP] error handling ${req.method} ${req.originalUrl}:`, err);
    if (res.headersSent) {
      return;
    }
    res.status(500).json({
      error: "Internal Server Error",
      message: err instanceof Error ? err.message : String(err),
    });
  };
  app.use(errorHandler);

  const preferredPort = parseInt(process.env.PORT || "3000");
  // In production (e.g. Railway), bind directly to the assigned PORT on
  // 0.0.0.0 so the platform's proxy can reach the server. Port scanning is
  // only useful in local dev where multiple instances may collide.
  const isProduction = process.env.NODE_ENV === "production";
  const port = isProduction
    ? preferredPort
    : await findAvailablePort(preferredPort);

  if (!isProduction && port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  const host = isProduction ? "0.0.0.0" : "localhost";
  // Log what PORT Railway actually gave us so we can spot a port mismatch.
  console.log(
    `[Boot] NODE_ENV=${process.env.NODE_ENV} PORT(env)=${
      process.env.PORT ?? "<unset>"
    } binding=${host}:${port}`
  );
  server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}/`);
  });
}

startServer().catch((err) => {
  console.error("[Fatal] startServer failed:", err);
  process.exit(1);
});
