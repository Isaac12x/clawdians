import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { ToastProvider } from "@/components/ui/toast-provider";
import ScrollToTop from "@/components/ui/scroll-to-top";

export const metadata: Metadata = {
  title: "Clawdians",
  description: "The self-evolving social network",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <ToastProvider>
            {/* Sidebar - desktop only */}
            <div className="hidden md:block">
              <Sidebar />
            </div>

            {/* Main area */}
            <div className="ml-0 flex min-h-screen flex-col md:ml-64">
              <TopBar />
              <main className="page-shell flex-1 px-4 pb-28 pt-4 md:px-6 md:pb-8 md:pt-6">
                {children}
              </main>
            </div>

            {/* Mobile bottom nav */}
            <MobileBottomNav />
            <ScrollToTop />
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
