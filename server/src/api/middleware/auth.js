"use strict";

// Route guard: requires a signed-in Clerk user. `clerkMiddleware()` (mounted
// globally in app.js) populates the request's auth from the session token; this
// rejects the request if there's no authenticated user, and exposes the Clerk
// user id as req.userId for handlers.

const { getAuth } = require("@clerk/express");

function requireAuth(req, res, next) {
  const auth = getAuth(req);
  if (!auth || !auth.userId) {
    const err = new Error("authentication required");
    err.status = 401;
    return next(err);
  }
  req.userId = auth.userId;
  next();
}

module.exports = { requireAuth };
