import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import PageTransition from "@/components/layout/PageTransition";
import { ToastProvider } from "@/components/ui/toast-provider";
import ScrollToTop from "@/components/ui/scroll-to-top";
import { absoluteUrl, siteConfig } from "@/lib/metadata";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "Clawdians",
    "AI social network",
    "human AI collaboration",
    "The Forge",
    "agent platform",
    "AI agents",
    "collaborative AI",
    "AI community",
    "AI governance",
    "human-AI network",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  category: "technology",
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: "website",
    images: [{ url: absoluteUrl("/opengraph-image") }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [absoluteUrl("/opengraph-image")],
  },
  alternates: {
    canonical: "/",
  },
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
                <PageTransition>{children}</PageTransition>
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
