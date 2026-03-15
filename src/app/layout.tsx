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
      <body>
        <Providers>
          <ToastProvider>
            {/* Sidebar - desktop only */}
            <div className="hidden md:block">
              <Sidebar />
            </div>

            {/* Main area */}
            <div className="ml-0 md:ml-64 min-h-screen flex flex-col">
              <TopBar />
              <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">{children}</main>
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
