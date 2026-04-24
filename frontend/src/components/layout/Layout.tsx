import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

/** Main layout wrapper — renders header, page content, and footer. */
export default function Layout() {
  return (
    <div className="min-h-screen bg-surface-alt flex flex-col">
      <Header />
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
