"use strict";

// Registry of all seeded problems. The seed script and the verify tool both read
// this list — adding a problem means adding one require here. C++-first (v1):
// Python/Java starter code is backfilled in Phase 5 (Steps 29/30).
module.exports = [
  require("./two-sum"),
  require("./running-sum"),
  require("./contains-duplicate"),
  require("./single-number"),
  require("./best-time-to-buy-and-sell-stock"),
  require("./fizz-buzz"),
  require("./valid-anagram"),
  require("./move-zeroes"),
  require("./transpose-matrix"),
  require("./maximum-subarray"),
  require("./product-except-self"),
  require("./rotate-array"),
  require("./spiral-matrix"),
  require("./search-in-rotated-sorted-array"),
  require("./trapping-rain-water"),
  require("./edit-distance"),
];
