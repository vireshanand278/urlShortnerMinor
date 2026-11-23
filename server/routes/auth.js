const bcrypt = require("bcryptjs");
const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { createAuthMiddleware } = require("../middleware/auth");

function createAuthRouter(secret) {
  const router = express.Router();
  const authenticate = createAuthMiddleware(secret);

  router.post("/register", async (req, res, next) => {
    try {
      const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
      const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const password = typeof req.body.password === "string" ? req.body.password : "";
      if (name.length < 1 || name.length > 60 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Add your name and a valid email address." });
      }
      if (password.length < 8 || password.length > 72) {
        return res.status(400).json({ error: "Your password needs 8–72 characters." });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email, passwordHash });
      return res.status(201).json({ token: signToken(user, secret), user: publicUser(user) });
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: "An account with that email already exists." });
      return next(error);
    }
  });

  router.post("/login", async (req, res, next) => {
    try {
      const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const password = typeof req.body.password === "string" ? req.body.password : "";
      const user = await User.findOne({ email }).select("+passwordHash");
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: "That email and password don’t match." });
      }
      return res.json({ token: signToken(user, secret), user: publicUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/me", authenticate, (req, res) => res.json({ user: req.user }));
  return router;
}

function signToken(user, secret) {
  return jwt.sign({ sub: user.id }, secret, { expiresIn: "7d" });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

module.exports = { createAuthRouter };

