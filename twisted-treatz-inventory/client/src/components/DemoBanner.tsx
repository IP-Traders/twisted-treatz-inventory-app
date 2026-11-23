import type { ReactNode } from "react";

// True only on demo builds (VITE_DEMO_MODE=true at build time). The
// production site never sets it, so this renders nothing there.
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

// Banner that announces the public demo and shows its shared credentials.
// Credentials here are intentionally public — the demo API serves only
// invented data in its own database.
export default function DemoBanner({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  if (!DEMO_MODE) return null;
  return (
    <div
      className={`bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2 text-center rounded-lg ${className}`}
    >
      {children}
    </div>
  );
}
