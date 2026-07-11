import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { getAdminUploadDir } from "./lib/admin-upload";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

// Parse CORS origins from environment variable
const corsOriginsEnv = process.env.CORS_ORIGINS || "";
const corsOrigins = corsOriginsEnv
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

// In development, allow all origins if CORS_ORIGINS is not set
const corsConfig =
  process.env.NODE_ENV === "production"
    ? {
        origin: corsOrigins.length > 0 ? corsOrigins : false,
        credentials: true,
      }
    : {
        origin: true,
        credentials: true,
      };

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors(corsConfig));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const adminUploadDir = getAdminUploadDir();
fs.mkdirSync(adminUploadDir, { recursive: true });
app.use("/uploads/admin", express.static(adminUploadDir, {
  fallthrough: false,
  immutable: true,
  maxAge: process.env.NODE_ENV === "production" ? "30d" : 0,
}));

// Health check endpoint
app.get("/api/healthz", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", router);

// Static file serving for student web and admin (production only)
// These should be built and placed in the dist directory before deployment
if (process.env.NODE_ENV === "production") {
  // Serve admin dashboard at /admin
  const adminPath = path.join(__dirname, "../public/admin");
  if (fs.existsSync(adminPath)) {
    app.use("/admin", express.static(adminPath, { dotfiles: "allow" }));
    // SPA fallback for admin - use regex instead of wildcard
    app.get(/^\/admin($|\/.*)/, (req, res) => {
      // If it's a request for a file (has extension), let it fall through to static or 404
      if (req.path.includes('.') && !req.path.endsWith('.html')) {
        return res.status(404).end();
      }
      return res.sendFile(path.join(adminPath, "index.html"));
    });
    logger.info("Admin dashboard served at /admin");
  }

  // Serve student web at root /
  const studentPath = path.join(__dirname, "../public/student");
  if (fs.existsSync(studentPath)) {
    // dotfiles: "allow" is REQUIRED — the Expo web export stores fonts/assets
    // under /assets/__node_modules/.pnpm/..., and express.static's default
    // ("ignore") refuses any path containing a dot-segment, which made every
    // icon font fall through to the SPA fallback and load as HTML (tofu □).
    app.use("/", express.static(studentPath, { dotfiles: "allow" }));
    // SPA fallback for student web (catch-all, but don't intercept API routes).
    // Asset-like paths (with an extension) 404 instead of silently returning
    // index.html — a missing font/image should fail loudly, not parse as HTML.
    app.get(/^(?!\/api).*/, (req, res) => {
      if (req.path.includes(".") && !req.path.endsWith(".html") && req.path !== "/") {
        return res.status(404).end();
      }
      return res.sendFile(path.join(studentPath, "index.html"));
    });
    logger.info("Student web served at /");
  }
}

export default app;
