"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function TopNav() {
  const pathname = usePathname();

  // Next.js <Link> is a no-op when href === current route (component doesn't remount).
  // Fall back to a hard navigation so the page state resets.
  const handleClick = (href: string, e: React.MouseEvent) => {
    if (pathname.startsWith(href)) {
      e.preventDefault();
      window.location.href = href;
    }
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-gray-900/70 backdrop-blur-lg">
      <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <span className="text-white font-extrabold text-lg">🍽️ YAWYE</span>

        {/* Nav links + logout */}
        <div className="flex items-center gap-6">
          <Link
            href="/scan"
            onClick={(e) => handleClick("/scan", e)}
            className={`text-sm font-semibold transition-colors ${
              pathname.startsWith("/scan")
                ? "text-violet-400"
                : "text-gray-500 hover:text-white"
            }`}
          >
            Scan
          </Link>
          <Link
            href="/history"
            onClick={(e) => handleClick("/history", e)}
            className={`text-sm font-semibold transition-colors ${
              pathname.startsWith("/history")
                ? "text-violet-400"
                : "text-gray-500 hover:text-white"
            }`}
          >
            History
          </Link>
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
