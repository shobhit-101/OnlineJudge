import { useParams, Link } from "react-router-dom";

// Placeholder so the library's problem links resolve. The real workspace — split
// layout with the statement, the Monaco editor, a language selector, and the
// Run/Submit console — is built in Step 26 and replaces this stub.
export default function ProblemWorkspacePage() {
  const { slug } = useParams();
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-wide text-zinc-500">Problem</p>
      <h1 className="mt-2 font-mono text-2xl font-semibold text-white">{slug}</h1>
      <p className="mt-3 text-sm text-zinc-400">
        The full workspace (statement + Monaco editor + Run/Submit) arrives in Step 26.
      </p>
      <Link
        to="/problems"
        className="mt-6 inline-block text-sm text-brand hover:underline"
      >
        ← Back to problems
      </Link>
    </div>
  );
}
