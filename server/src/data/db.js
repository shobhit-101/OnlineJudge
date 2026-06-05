"use strict";

// MongoDB (Atlas) connection helpers via Mongoose.

const mongoose = require("mongoose");
const { config } = require("../config");

async function connect() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 10000, // fail fast if the cluster is unreachable
  });
  return mongoose.connection;
}

async function disconnect() {
  await mongoose.disconnect();
}

module.exports = { connect, disconnect, mongoose };
