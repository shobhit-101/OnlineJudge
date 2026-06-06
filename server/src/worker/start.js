"use strict";

// Production worker entry point — runs a pool of judges + a reclaim loop.
// Run with: npm run -w @oj/server worker   (set WORKER_CONCURRENCY to size it)

const { connect } = require("../data/db");
const { startPool } = require("./index.js");
const { config } = require("../config");

async function main() {
  await connect();
  await startPool({ size: config.workerConcurrency });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
