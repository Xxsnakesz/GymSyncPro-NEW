import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = process.cwd();

const app = express();
// Enable gzip compression for all responses (production and dev)
app.use(compression({ level: 6 }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Serve uploaded files statically with reasonable caching
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  immutable: false,
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Ensure unknown /api routes return JSON 404 instead of falling through to Vite (which would return index.html)
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ message: 'Endpoint tidak ditemukan' });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Heuristic: map common DB connectivity errors to 503
    const msg: string = String(err?.message || "");
    const looksLikeDbDown = /ECONNREFUSED|ENOTFOUND|timeout|terminat|TLS|connection|neon/i.test(msg);
    const status = err.status || err.statusCode || (looksLikeDbDown ? 503 : 500);
    const message = err.message || (status === 503 ? "Service Unavailable" : "Internal Server Error");

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    // For dev visibility, still log the error stack, but don't crash the server on known 503 cases
    if (status === 503) {
      console.warn("Handled 503 error:", err?.message);
      return;
    }
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  const nodeEnv = (process.env.NODE_ENV || app.get("env") || "development").toLowerCase();
  log(`NODE_ENV detected: ${nodeEnv}`);

  if (nodeEnv !== "production") {
    await setupVite(app, server);
  } else {
    try {
      serveStatic(app);
    } catch (e) {
      // If static build is missing (e.g., local dev without client build), fall back to Vite middleware
      log("Static build not found, falling back to Vite dev middleware");
      await setupVite(app, server);
    }
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);

  // Helpful error message if port is already in use
  server.on('error', (err: any) => {
    if (err && (err.code === 'EADDRINUSE' || err.code === 'EACCES')) {
      console.error(`\nPort ${port} is already in use. Close the existing process or run with a different port.\n` +
        `Tips (PowerShell):\n` +
        `  netstat -ano | findstr :${port}\n` +
        `  taskkill /PID <PID> /F\n` +
        `Or run on another port:\n` +
        `  $env:PORT=${port + 1}; npm run dev\n`);
      process.exit(1);
    }
  });

  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    // Log basic integrations status (no secrets)
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);
  const fromEmailDefault = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const fromEmailAdmin = process.env.RESEND_FROM_EMAIL_ADMIN || fromEmailDefault;
  const fromEmailVerification = process.env.RESEND_FROM_EMAIL_VERIFICATION || fromEmailDefault;
  const adminKey = Boolean(process.env.RESEND_API_KEY_ADMIN);
  const verifKey = Boolean(process.env.RESEND_API_KEY_VERIFICATION);
  log(`Resend configured: ${resendConfigured ? 'yes' : 'no'}; default.from=${fromEmailDefault}`);
  log(`Resend streams -> admin.from=${fromEmailAdmin} ${adminKey ? '(own key)' : ''}; verification.from=${fromEmailVerification} ${verifKey ? '(own key)' : ''}`);
    
    setInterval(async () => {
      try {
        const checkedOutCount = await storage.autoCheckoutExpiredSessions();
        if (checkedOutCount > 0) {
          log(`Auto-checkout job: ${checkedOutCount} member(s) automatically checked out`);
        }
      } catch (error) {
        console.error("Error in auto-checkout job:", error);
      }
    }, 60000);
    
    log("Auto-checkout job started - runs every 1 minute");
    
    // Inactivity reminder job - runs once every 24 hours
    setInterval(async () => {
      try {
        const reminderCount = await storage.sendInactivityReminders(7);
        if (reminderCount > 0) {
          log(`Inactivity reminder job: ${reminderCount} reminder(s) sent to inactive members`);
        }
      } catch (error) {
        console.error("Error in inactivity reminder job:", error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
    
    log("Inactivity reminder job started - runs every 24 hours");
  });
})();
