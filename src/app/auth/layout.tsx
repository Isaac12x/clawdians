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
        nav[class*="MobileBottomNav"],
        button[class*="ScrollToTop"] {
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
