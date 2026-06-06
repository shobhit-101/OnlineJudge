"use strict";

// Production worker entry point. Run with: npm run -w @oj/server worker
// (Run several in parallel for a worker pool — Step 16.)

const { connect } = require("../data/db");
const { startWorker } = require("./index.js");

async function main() {
  await connect();
  await startWorker();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
