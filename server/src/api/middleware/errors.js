"use strict";

// 404 for any unmatched route.
function notFound(req, res) {
  res.status(404).json({ error: "not found", path: req.path });
}

// Central error handler. Handlers can throw (or pass to next) an Error with an
// optional `.status`; this formats the JSON response. 5xx are logged.
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || "internal server error" });
}

module.exports = { notFound, errorHandler };
