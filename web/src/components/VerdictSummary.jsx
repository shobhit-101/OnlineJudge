import { verdictMeta } from "../lib/verdict.js";
import { fmt, formatInput, formatMemory } from "../lib/format.js";

// Renders a verdict + stats + (CE output | failing case) from a result-shaped
// object — used by both the live Run/Submit result and a past submission's detail.
// `data` carries { verdict, passed, total, stats, failedCase, compileOutput, kind }.
export default function VerdictSummary({ data, signature }) {
  const meta = verdictMeta(data.verdict);

  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`text-base font-semibold ${meta.cls}`}>{meta.label}</span>
        {data.verdict !== "CE" && data.passed != null && (
          <span className="text-zinc-500">
            {data.passed}/{data.total}{" "}
            {data.kind === "run" ? "sample" : "test"} cases passed
          </span>
        )}
      </div>

      {data.verdict !== "CE" && data.stats && (
        <div className="mt-1 text-xs text-zinc-500">
          {data.stats.timeMs != null && <>Time {data.stats.timeMs} ms</>}
          {data.stats.memoryKb != null && (
            <> · Memory {formatMemory(data.stats.memoryKb)}</>
          )}
        </div>
      )}

      {data.verdict === "CE" && data.compileOutput && (
        <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-edge bg-panel p-3 font-mono text-xs text-hard">
          {data.compileOutput}
        </pre>
      )}

      {data.failedCase && (
        <div className="mt-3 space-y-1 rounded-md border border-edge bg-panel p-3 font-mono text-xs text-zinc-300">
          <div>
            <span className="text-zinc-500">Input: </span>
            {formatInput(signature, data.failedCase.input)}
          </div>
          <div>
            <span className="text-zinc-500">Expected: </span>
            {fmt(data.failedCase.expected)}
          </div>
          <div>
            <span className="text-zinc-500">Output: </span>
            {data.failedCase.actual || "(no output)"}
          </div>
        </div>
      )}
    </div>
  );
}
