const { randomBytes } = require("node:crypto");

function normalizeHttpUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return null;

  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function createShortCode() {
  return randomBytes(5).toString("base64url");
}

module.exports = { createShortCode, normalizeHttpUrl };

