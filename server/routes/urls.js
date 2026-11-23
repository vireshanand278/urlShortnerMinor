const express = require("express");
const Click = require("../models/Click");
const ShortUrl = require("../models/ShortUrl");
const { createShortCode, normalizeHttpUrl } = require("../utils/url");

function createUrlRouter(publicUrl) {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    try {
      // Only return links owned by the signed-in person.
      const urls = await ShortUrl.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean();
      return res.json({
        urls: urls.map((url) => ({ ...url, shortUrl: `${publicUrl}/${url.shortCode}` }))
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const originalUrl = normalizeHttpUrl(req.body.url);
      if (!originalUrl) return res.status(400).json({ error: "Enter a valid http or https link." });

      let url;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          url = await ShortUrl.create({ shortCode: createShortCode(), originalUrl, owner: req.user._id });
          break;
        } catch (error) {
          if (error.code !== 11000 || attempt === 2) throw error;
        }
      }
      return res.status(201).json({
        url: { ...url.toObject(), shortUrl: `${publicUrl}/${url.shortCode}` }
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/:id/analytics", async (req, res, next) => {
    try {
      const url = await ShortUrl.findOne({ _id: req.params.id, owner: req.user._id }).lean();
      if (!url) return res.status(404).json({ error: "That link could not be found." });

      const since = new Date();
      since.setDate(since.getDate() - 6);
      since.setHours(0, 0, 0, 0);
      // Group the chart by day and fetch the latest visits at the same time.
      const [daily, recent] = await Promise.all([
        Click.aggregate([
          { $match: { shortUrl: url._id, clickedAt: { $gte: since } } },
          {
            $group: {
              _id: { $dateToString: { date: "$clickedAt", format: "%Y-%m-%d" } },
              clicks: { $sum: 1 }
            }
          }
        ]),
        Click.find({ shortUrl: url._id }).sort({ clickedAt: -1 }).limit(10).select("clickedAt referrer").lean()
      ]);
      const dailyTotals = new Map(daily.map((item) => [item._id, item.clicks]));
      const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(since);
        date.setDate(since.getDate() + index);
        const key = date.toISOString().slice(0, 10);
        return { date: key, clicks: dailyTotals.get(key) || 0 };
      });
      return res.json({ totalClicks: url.clickCount, lastSevenDays, recent });
    } catch (error) {
      return next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const url = await ShortUrl.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
      if (!url) return res.status(404).json({ error: "That link could not be found." });
      await Click.deleteMany({ shortUrl: url._id });
      return res.sendStatus(204);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createUrlRouter };

