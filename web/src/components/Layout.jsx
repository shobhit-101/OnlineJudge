import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";

// App shell: persistent top navbar + the routed page below it.
export default function Layout() {
  return (
    <div className="flex min-h-full flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
