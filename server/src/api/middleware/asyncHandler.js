"use strict";

// Wrap an async route handler so any rejected promise is forwarded to Express's
// error handler (Express 4 doesn't catch async errors automatically).
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { asyncHandler };
