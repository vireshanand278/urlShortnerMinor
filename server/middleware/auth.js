const jwt = require("jsonwebtoken");
const User = require("../models/User");

function createAuthMiddleware(secret) {
  return async function authenticate(req, res, next) {
    const token = req.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return res.status(401).json({ error: "Please sign in to continue." });

    try {
      const payload = jwt.verify(token, secret);
      const user = await User.findById(payload.sub).select("_id name email role").lean();
      if (!user) return res.status(401).json({ error: "Your session is no longer valid." });
      req.user = user;
      return next();
    } catch (error) {
      if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Your session has expired. Please sign in again." });
      }
      return next(error);
    }
  };
}

module.exports = { createAuthMiddleware };

