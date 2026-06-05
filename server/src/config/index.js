"use strict";

// Central config. Loads server/.env (regardless of the process's cwd) and
// exposes typed config values. Anything secret lives in server/.env, never code.

const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name} — set it in server/.env`);
  }
  return value;
}

const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: required("MONGODB_URI"),
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
};

module.exports = { config };
