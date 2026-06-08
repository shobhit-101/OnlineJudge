// Small shared formatters used across the workspace, submissions, and profile.

export const fmt = (v) => JSON.stringify(v);

// signature.params zipped with the input array → "nums = [2,7,11,15], target = 9".
export function formatInput(signature, input) {
  if (!signature?.params || !Array.isArray(input)) return fmt(input);
  return signature.params.map((p, i) => `${p.name} = ${fmt(input[i])}`).join(", ");
}

export function formatMemory(kb) {
  if (kb == null) return "—";
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

export function langLabel(id) {
  return { cpp: "C++", python: "Python", java: "Java" }[id] || id;
}

// Compact relative time: "just now" / "5m ago" / "3h ago" / "2d ago" / a date.
export function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
