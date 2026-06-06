"use strict";

// API server bootstrap: connect Mongo, start Express, shut down cleanly.
// Run with: npm run -w @oj/server dev   (the worker runs separately: npm run worker)

const { connect, disconnect } = require("./data/db");
const { closeRedis } = require("./queue/redis");
const { createApp } = require("./api/app");
const { config } = require("./config");

async function main() {
  await connect();
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });

  let closing = false;
  const shutdown = async (signal) => {
    if (closing) return;
    closing = true;
    console.log(`\n${signal} — shutting down...`);
    server.close();
    await closeRedis();
    await disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
