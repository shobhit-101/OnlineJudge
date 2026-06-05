"use strict";

// Step 7 — malicious-submission suite. Runs each attack fixture through the
// hardened sandbox and asserts it is contained. This is the demo/interview
// centerpiece: every defense, exercised by a real attack.
//
// Run with: npm run -w @oj/server sandbox:attacks

const fs = require("node:fs");
const path = require("node:path");
const { runCpp } = require("../runCpp");

const read = (file) => fs.readFileSync(path.join(__dirname, file), "utf8");

const attacks = [
  {
    name: "Infinite loop",
    file: "infinite_loop.cpp",
    expect: "TLE (wall-clock timeout)",
    check: (r) => r.outcome === "TLE",
  },
  {
    name: "Memory bomb",
    file: "memory_bomb.cpp",
    expect: "MLE (memory cap + OOM kill)",
    check: (r) => r.outcome === "MLE",
  },
  {
    name: "Fork bomb",
    file: "fork_bomb.cpp",
    expect: "contained by --pids-limit, then stopped",
    check: (r) => r.outcome === "TLE" || r.outcome === "RE",
  },
  {
    name: "Read /etc/shadow",
    file: "file_read.cpp",
    expect: "read denied (non-root, no host fs)",
    check: (r) => r.stdout.includes("BLOCKED") && !r.stdout.includes("LEAKED"),
  },
  {
    name: "Outbound network",
    file: "network.cpp",
    expect: "blocked (seccomp + --network none)",
    check: (r) => r.stdout.includes("BLOCKED") && !r.stdout.includes("CONNECTED"),
  },
];

(async () => {
  console.log("Malicious-submission suite — running each attack through the sandbox:\n");
  let passed = 0;

  for (const a of attacks) {
    const r = await runCpp({ source: read(a.file) });
    const ok = a.check(r);
    if (ok) passed++;

    console.log(`${ok ? "PASS" : "FAIL"}  ${a.name}`);
    console.log(`      expected: ${a.expect}`);
    console.log(
      `      got:      outcome=${r.outcome} time=${r.timeMs}ms mem=${r.memoryKb ?? "-"}kb`
    );
    const out = r.stdout.trim();
    if (out) console.log(`      stdout:   ${out.replace(/\n/g, " | ")}`);
    console.log();
  }

  console.log(`Result: ${passed}/${attacks.length} attacks contained.`);
  process.exit(passed === attacks.length ? 0 : 1);
})();
