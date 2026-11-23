require("dotenv").config();
const config = require("./config");
const { createAdminApp } = require("./app");
const { connectDatabase } = require("./db");

async function start() {
  await connectDatabase(config.mongoUri);
  createAdminApp(config).listen(config.adminPort, "127.0.0.1", () => {
    console.log(`Admin API listening at http://127.0.0.1:${config.adminPort}`);
  });
}

start().catch((error) => {
  console.error("Could not start admin server:", error.message);
  process.exitCode = 1;
});

