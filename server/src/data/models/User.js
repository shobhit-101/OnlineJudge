"use strict";

// A user, keyed by their Clerk id. Minimal for now — auth is integrated in
// Phase 3; solved/attempted status is derived from submissions.

const { mongoose } = require("../db");
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    clerkId: { type: String, required: true, unique: true },
    email: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
