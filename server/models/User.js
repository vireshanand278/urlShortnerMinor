const mongoose = require("mongoose");

// Passwords are stored as hashes and are excluded from normal queries.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user", required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

