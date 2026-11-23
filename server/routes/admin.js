const express = require("express");
const Click = require("../models/Click");
const ShortUrl = require("../models/ShortUrl");
const User = require("../models/User");
const { createAuthMiddleware } = require("../middleware/auth");

function createAdminRouter(secret, publicUrl) {
  const router = express.Router();
  const authenticate = createAuthMiddleware(secret);

  // Signing in is not enough here; these routes also require the admin role.
  router.use(authenticate, (req, res, next) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "This area is for admins." });
    return next();
  });

  router.get("/overview", async (_req, res, next) => {
    try {
      const [users, links, clicks, latestUsers, latestLinks] = await Promise.all([
        User.countDocuments({ role: "user" }),
        ShortUrl.countDocuments(),
        Click.countDocuments(),
        User.find({ role: "user" }).sort({ createdAt: -1 }).limit(8).select("name email createdAt").lean(),
        ShortUrl.find().sort({ createdAt: -1 }).limit(8).populate("owner", "name email").lean()
      ]);
      return res.json({
        totals: { users, links, clicks },
        latestUsers,
        latestLinks: latestLinks.map((url) => ({ ...url, shortUrl: `${publicUrl}/${url.shortCode}` }))
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/users", async (_req, res, next) => {
    try {
      const users = await User.aggregate([
        { $match: { role: "user" } },
        {
          $lookup: {
            from: ShortUrl.collection.name,
            localField: "_id",
            foreignField: "owner",
            as: "links"
          }
        },
        {
          $project: {
            name: 1,
            email: 1,
            createdAt: 1,
            linkCount: { $size: "$links" },
            clickCount: { $sum: "$links.clickCount" }
          }
        },
        { $sort: { createdAt: -1 } },
        { $limit: 100 }
      ]);
      return res.json({ users });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createAdminRouter };

