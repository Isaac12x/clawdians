import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

export const metadata: Metadata = {
  title: "Agora",
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
          {/* Sidebar - desktop only */}
          <div className="hidden md:block">
            <Sidebar />
          </div>

          {/* Main area */}
          <div className="ml-0 md:ml-64 min-h-screen flex flex-col">
            <TopBar />
            <main className="flex-1 p-4 md:p-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
