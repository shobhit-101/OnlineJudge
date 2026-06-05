"use strict";

// C++ harness strategy: turn a user's `Solution` class + a problem signature into
// a complete program that reads arguments from stdin (the shared wire format),
// calls the function, and prints the result (the shared canonical format).
//
// The program reads from stdin rather than baking values in, so we compile ONCE
// and run every test case by feeding different stdin (Step 12).

const { isArrayType, elementType } = require("../types");

const CPP_BASE = {
  int: "int",
  long: "long long",
  bool: "bool",
  string: "string",
};

// v1 type string -> C++ value type. "int[]" -> "vector<int>", "int[][]" ->
// "vector<vector<int>>", etc.
function cppType(type) {
  if (isArrayType(type)) return `vector<${cppType(elementType(type))}>`;
  const base = CPP_BASE[type];
  if (!base) throw new Error(`unsupported C++ type: ${type}`);
  return base;
}

// Fixed I/O helpers compiled into every harness. `rd` reads the wire format; `wr`
// prints the canonical format. The vector templates recurse, so they cover both
// 1D and 2D automatically.
const HELPERS = `// ---- harness I/O (reads wire format, prints canonical format) ----
static void rd(int& x){ cin >> x; }
static void rd(long long& x){ cin >> x; }
static void rd(bool& x){ int t; cin >> t; x = (t != 0); }
static void rd(string& s){ cin >> s; }
template<class T> static void rd(vector<T>& v){ int n; cin >> n; v.resize(n); for (auto& e : v) rd(e); }
static void wr(int x){ cout << x; }
static void wr(long long x){ cout << x; }
static void wr(bool x){ cout << (x ? "true" : "false"); }
static void wr(const string& s){ cout << s; }
template<class T> static void wr(const vector<T>& v){ cout << "["; for (size_t i = 0; i < v.size(); ++i){ if (i) cout << ","; wr(v[i]); } cout << "]"; }`;

function buildHarness({ signature, code }) {
  const { functionName, params } = signature;

  const decls = params
    .map((p) => `  ${cppType(p.type)} ${p.name}; rd(${p.name});`)
    .join("\n");
  const args = params.map((p) => p.name).join(", ");

  return [
    "#include <bits/stdc++.h>",
    "using namespace std;",
    "",
    "// ---- user code ----",
    code.trim(),
    "// ---- end user code ----",
    "",
    HELPERS,
    "",
    "int main(){",
    "  ios::sync_with_stdio(false);",
    decls,
    "  Solution __sol;",
    `  auto __ans = __sol.${functionName}(${args});`,
    "  wr(__ans);",
    '  cout << "\\n";',
    "  return 0;",
    "}",
    "",
  ].join("\n");
}

module.exports = { buildHarness, cppType };
