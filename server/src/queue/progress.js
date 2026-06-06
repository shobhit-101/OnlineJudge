"use strict";

// Live progress bridge (DECISIONS 009). The worker PUBLISHes progress events to a
// per-submission Redis channel; the API SUBSCRIBEs to it for an open SSE stream
// and relays each event to the browser. Pub/sub (not the stream) because these
// are ephemeral notifications between two separate processes.

const { getRedis } = require("./redis");

function channelFor(submissionId) {
  return `submission:${submissionId}`;
}

// Fire-and-forget publish (uses the shared, non-subscribe client).
async function publishProgress(submissionId, event) {
  return getRedis().publish(channelFor(submissionId), JSON.stringify(event));
}

module.exports = { channelFor, publishProgress };
