import { Outlet } from "react-router-dom";
import Header from "./Header";

/** Main layout wrapper — renders the header and page content. */
export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
