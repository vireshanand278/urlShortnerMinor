const mongoose = require("mongoose");

// The counter is quick to show; individual visits live in the Click collection.
const shortUrlSchema = new mongoose.Schema(
  {
    shortCode: { type: String, required: true, unique: true, index: true },
    originalUrl: { type: String, required: true, maxlength: 2048 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    clickCount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShortUrl", shortUrlSchema);

