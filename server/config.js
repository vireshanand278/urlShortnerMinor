const path = require("node:path");

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  adminPort: Number(process.env.ADMIN_PORT || 5001),
  jwtSecret: requiredEnv("JWT_SECRET"),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/urlshortener",
  publicUrl: process.env.PUBLIC_URL || "http://127.0.0.1:5000",
  userPort: Number(process.env.USER_PORT || 5000),
  webOrigins: (process.env.WEB_ORIGINS || "http://127.0.0.1:5173,http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  webDistPath: path.join(__dirname, "..", "client", "dist")
};
