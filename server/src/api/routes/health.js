"use strict";

// Liveness/readiness probe — reports whether Mongo and Redis are reachable.

const { Router } = require("express");
const mongoose = require("mongoose");
const { getRedis } = require("../../queue/redis");
const { asyncHandler } = require("../middleware/asyncHandler");

const healthRouter = Router();

healthRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const mongo = mongoose.connection.readyState === 1; // 1 = connected
    let redis = false;
    try {
      redis = (await getRedis().ping()) === "PONG";
    } catch {
      redis = false;
    }
    const ok = mongo && redis;
    res.status(ok ? 200 : 503).json({
      status: ok ? "ok" : "degraded",
      mongo,
      redis,
      uptime: Math.round(process.uptime()),
    });
  })
);

module.exports = { healthRouter };
