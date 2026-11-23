const express = require("express");
const path = require("node:path");
const { createAuthRouter } = require("./routes/auth");
const { createUrlRouter } = require("./routes/urls");
const { createAdminRouter } = require("./routes/admin");
const { createAuthMiddleware } = require("./middleware/auth");
const { localCors } = require("./middleware/localCors");
const ShortUrl = require("./models/ShortUrl");
const Click = require("./models/Click");

function createUserApp(config) {
  const app = express();
  app.disable("x-powered-by");
  app.use(localCors([...config.webOrigins, `http://127.0.0.1:${config.userPort}`, `http://localhost:${config.userPort}`]));
  app.use(express.json({ limit: "16kb" }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok", database: "connected" }));
  app.use("/api/auth", createAuthRouter(config.jwtSecret));
  app.use("/api/urls", createAuthMiddleware(config.jwtSecret), createUrlRouter(config.publicUrl));

  // A short code is a public visit: count it, save a small record, then redirect.
  app.get("/:code", async (req, res, next) => {
    try {
      if (!/^[\w-]{4,16}$/.test(req.params.code)) return res.status(404).send("That short link does not exist.");
      const url = await ShortUrl.findOneAndUpdate(
        { shortCode: req.params.code },
        { $inc: { clickCount: 1 } },
        { new: false }
      );
      if (!url) return res.status(404).send("That short link does not exist.");

      const referrer = safeReferrer(req.get("referer"));
      await Click.create({
        shortUrl: url._id,
        referrer,
        userAgent: (req.get("user-agent") || "").slice(0, 300)
      });
      return res.redirect(302, url.originalUrl);
    } catch (error) {
      return next(error);
    }
  });

  if (require("node:fs").existsSync(config.webDistPath)) {
    app.use(express.static(config.webDistPath));
    app.get("/{*path}", (_req, res) => res.sendFile(path.join(config.webDistPath, "index.html")));
  }
  return addErrorHandler(app);
}

function createAdminApp(config) {
  const app = express();
  app.disable("x-powered-by");
  app.use(localCors([...config.webOrigins, `http://127.0.0.1:${config.userPort}`, `http://localhost:${config.userPort}`]));
  app.use(express.json({ limit: "16kb" }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok", database: "connected" }));
  app.use("/api/admin", createAdminRouter(config.jwtSecret, config.publicUrl));
  return addErrorHandler(app);
}

function safeReferrer(value) {
  if (!value) return "Direct";
  try {
    return new URL(value).hostname.slice(0, 253);
  } catch {
    return "Direct";
  }
}

function addErrorHandler(app) {
  app.use((err, _req, res, _next) => {
    console.error("Request failed:", err);
    if (res.headersSent) return;
    return res.status(500).json({ error: "Something went wrong. Check the server log for details." });
  });
  return app;
}

module.exports = { createAdminApp, createUserApp };

