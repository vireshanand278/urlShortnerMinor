require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const { connectDatabase } = require("../db");

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters in .env.");
  }

  await connectDatabase(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/urlshortener");
  const passwordHash = await bcrypt.hash(password, 12);
  // Upsert makes this command safe to rerun when you need to change the admin password.
  await User.findOneAndUpdate(
    { email },
    { $set: { name: "Administrator", email, passwordHash, role: "admin" } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  console.log(`Admin account ready for ${email}`);
}

seedAdmin()
  .catch((error) => {
    console.error("Could not seed admin:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());

