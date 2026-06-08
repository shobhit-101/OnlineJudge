// Verdict → label + Tailwind color (theme tokens from index.css). Shared by the
// workspace result view, the submissions list, and the profile feed.
export const VERDICT_META = {
  AC: { label: "Accepted", cls: "text-easy" },
  WA: { label: "Wrong Answer", cls: "text-hard" },
  TLE: { label: "Time Limit Exceeded", cls: "text-medium" },
  MLE: { label: "Memory Limit Exceeded", cls: "text-medium" },
  RE: { label: "Runtime Error", cls: "text-hard" },
  CE: { label: "Compile Error", cls: "text-medium" },
};

export function verdictMeta(verdict) {
  return VERDICT_META[verdict] || { label: verdict || "—", cls: "text-zinc-300" };
}
