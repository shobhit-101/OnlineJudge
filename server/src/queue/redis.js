"use strict";

// Redis connection + queue constants. We use a Redis Stream as the submission
// queue: the API XADDs jobs (producer, Step 14), workers read them via a consumer
// group (Step 15). A consumer group lets multiple workers share the stream
// without processing the same job twice, and tracks acknowledgements.

const Redis = require("ioredis");
const { config } = require("../config");

const STREAM_KEY = "submissions"; // the stream all submission jobs go on
const GROUP = "judges"; // consumer group the worker pool joins (Step 15)

// A fresh connection. Blocking reads (XREADGROUP BLOCK) need their own client,
// so the worker creates a dedicated one; `maxRetriesPerRequest: null` keeps
// blocking commands from erroring out.
function createRedisClient() {
  return new Redis(config.redisUrl, { maxRetriesPerRequest: null });
}

// Shared client for producing and one-off commands.
let shared;
function getRedis() {
  if (!shared) shared = createRedisClient();
  return shared;
}

async function closeRedis() {
  if (shared) {
    await shared.quit();
    shared = null;
  }
}

module.exports = { STREAM_KEY, GROUP, createRedisClient, getRedis, closeRedis };
