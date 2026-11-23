require("dotenv").config();
const config = require("./config");
const { createUserApp } = require("./app");
const { connectDatabase } = require("./db");

async function start() {
  await connectDatabase(config.mongoUri);
  createUserApp(config).listen(config.userPort, "127.0.0.1", () => {
    console.log(`User app listening at ${config.publicUrl}`);
  });
}

start().catch((error) => {
  console.error("Could not start user server:", error.message);
  process.exitCode = 1;
});

