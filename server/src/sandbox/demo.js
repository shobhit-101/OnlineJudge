"use strict";

// Manual demo for Step 3: exercises runCpp() against three cases so we can see
// the bare compile/run mechanism work. Run with: npm run -w @oj/server sandbox:demo

const { runCpp } = require("./runCpp");

const SUM = `
#include <iostream>
int main() {
  int a, b;
  std::cin >> a >> b;
  std::cout << a + b << std::endl;
}
`;

const COMPILE_ERROR = `
int main() { this is not valid c++ }
`;

const RUNTIME_CRASH = `
#include <vector>
int main() {
  std::vector<int> v;   // empty
  return v.at(5);       // throws std::out_of_range -> abort (exit 134)
}
`;

const INFINITE_LOOP = `
int main() { while (true) {} }   // never returns -> must be killed by the timeout
`;

const MEMORY_BOMB = `
#include <vector>
int main() {
  std::vector<long> v;
  while (true) v.push_back(1);   // grows past the memory cap -> OOM-killed
}
`;

async function main() {
  console.log("1) normal run, input '3 4'  -> expect OK:");
  console.log(await runCpp({ source: SUM, input: "3 4\n" }));

  console.log("\n2) compile error          -> expect CE:");
  console.log(await runCpp({ source: COMPILE_ERROR }));

  console.log("\n3) runtime crash           -> expect RE:");
  console.log(await runCpp({ source: RUNTIME_CRASH }));

  console.log("\n4) infinite loop           -> expect TLE (~2s, not a hang):");
  console.log(await runCpp({ source: INFINITE_LOOP }));

  console.log("\n5) memory bomb             -> expect MLE:");
  console.log(await runCpp({ source: MEMORY_BOMB }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
