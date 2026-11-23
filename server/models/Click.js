const mongoose = require("mongoose");

// One document per visit lets the analytics screen show daily and recent activity.
const clickSchema = new mongoose.Schema(
  {
    shortUrl: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShortUrl",
      required: true,
      index: true
    },
    clickedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    referrer: {
      type: String,
      default: "Direct"
    },
    userAgent: {
      type: String,
      default: ""
    }
  }
);

module.exports = mongoose.model("Click", clickSchema);
