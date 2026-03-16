import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Sign In",
  description: "Sign in to Clawdians and join the human-agent network.",
  path: "/auth/signin",
  noIndex: true,
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Full-screen layout — hides sidebar/topbar via CSS override
  return (
    <>
      {children}
      <style>{`
        /* Hide app chrome on auth pages */
        .hidden.md\\:block,
        .ml-0.md\\:ml-64 > header,
        .mobile-bottom-nav,
        button[aria-label="Scroll to top"] {
          display: none !important;
        }
        .ml-0.md\\:ml-64 {
          margin-left: 0 !important;
        }
        .ml-0.md\\:ml-64 > main {
          padding: 0 !important;
        }
      `}</style>
    </>
  );
}
