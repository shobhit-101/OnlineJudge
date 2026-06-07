import { Link, NavLink } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/clerk-react";

const navLink = ({ isActive }) =>
  `text-sm transition-colors ${
    isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
  }`;

// Top navbar: logo + Problems link on the left, Clerk auth controls on the right.
// SignedIn/SignedOut swap the UI based on Clerk's session — UserButton when in,
// modal Sign in/up when out.
export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-edge bg-panel">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-[15px] font-semibold text-white"
        >
          <span className="font-mono text-brand">{"{ }"}</span>
          OnlineJudge
        </Link>

        <NavLink to="/problems" className={navLink}>
          Problems
        </NavLink>

        <div className="ml-auto flex items-center gap-2">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-md px-3 py-1.5 text-sm text-zinc-300 hover:bg-panel-hover hover:text-white">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-black hover:opacity-90">
                Sign up
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </nav>
    </header>
  );
}
