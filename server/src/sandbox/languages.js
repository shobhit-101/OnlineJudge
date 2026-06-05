"use strict";

// Per-language execution specs for the sandbox. Each entry describes the only
// language-specific things the sandbox needs: which image to run, what file to
// write the code into, how to compile it (omit for interpreted languages), and
// how to run it. Everything else — isolation, timeouts, outcome classification,
// time/memory capture — is identical across languages and lives in index.js.
//
// Python and Java are added here in Phase 5; today only C++ exists.

const languages = {
  cpp: {
    displayName: "C++",
    image: "oj-cpp-runner:2",
    sourceFile: "main.cpp",
    compile: ["g++", "-O2", "-std=c++17", "-o", "main", "main.cpp"],
    run: ["./main"],
  },
};

module.exports = { languages };
