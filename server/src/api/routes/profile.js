"use strict";

const { Router } = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { getUserDashboard } = require("../../data/profile");

const profileRouter = Router();

// GET /api/profile — the signed-in user's dashboard aggregates.
profileRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const dashboard = await getUserDashboard(req.userId);
    res.json({ dashboard });
  })
);

module.exports = { profileRouter };
