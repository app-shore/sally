import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { TopNavigation } from "@/components/dashboard/TopNavigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SALLY Dashboard",
  description: "Rest Optimization System - Engine Control Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="flex h-screen flex-col bg-gray-50">
            <TopNavigation />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
