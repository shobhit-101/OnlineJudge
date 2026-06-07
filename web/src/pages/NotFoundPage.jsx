import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 text-center">
      <p className="text-5xl font-bold text-brand">404</p>
      <p className="mt-3 text-zinc-400">That page doesn’t exist.</p>
      <Link
        to="/problems"
        className="mt-6 inline-block text-sm text-brand hover:underline"
      >
        ← Back to problems
      </Link>
    </div>
  );
}
