import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");

  const indexPath = path.resolve(distPath, "index.html");
  const hasBuild = fs.existsSync(distPath);
  const hasIndex = fs.existsSync(indexPath);

  console.log(
    `[Static] distPath=${distPath} hasBuild=${hasBuild} hasIndex=${hasIndex}`
  );

  if (!hasBuild || !hasIndex) {
    console.error(
      `[Static] Build artifacts missing at ${distPath}. ` +
        `Make sure to run \`vite build\` before \`node dist/index.js\`.`
    );
  }

  if (hasBuild) {
    app.use(express.static(distPath));
  }

  // SPA fallback. We must NEVER throw out of this handler, or Railway's proxy
  // will see a dropped connection and return 502 with no body.
  app.use("*", (req, res) => {
    if (!hasIndex) {
      // Return a real HTTP response so the proxy can forward it as-is.
      res.status(503).type("text/plain").send(
        "Service Unavailable: client build is missing on the server."
      );
      return;
    }

    res.sendFile(indexPath, (err) => {
      if (!err) return;
      console.error(
        `[Static] sendFile failed for ${req.originalUrl}:`,
        err
      );
      if (!res.headersSent) {
        res.status(500).type("text/plain").send("Internal Server Error");
      }
    });
  });
}
