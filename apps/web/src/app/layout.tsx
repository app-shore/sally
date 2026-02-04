import type { Metadata } from "next";
import { Inter, Space_Grotesk, Sora, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { LayoutClient } from "./layout-client";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

// Font options for SALLY logo
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-space-grotesk",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-sora",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: {
    default: "SALLY - Your Fleet Operations Assistant",
    template: "%s | SALLY",
  },
  description:
    "Stop planning routes. Start preventing violations. The only platform that routes drivers, not trucks.",
  keywords: [
    "fleet management",
    "HOS compliance",
    "route planning",
    "trucking",
    "logistics",
    "dispatch",
  ],
  authors: [{ name: "SALLY" }],
  creator: "SALLY",
  publisher: "SALLY",

  // Favicon and icons
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },

  // Web app manifest
  manifest: "/site.webmanifest",

  // Open Graph (for social sharing)
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sally.com",
    title: "SALLY - Your Fleet Operations Assistant",
    description:
      "Stop planning routes. Start preventing violations. The only platform that routes drivers, not trucks.",
    siteName: "SALLY",
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "SALLY - Your Fleet Operations Assistant",
    description: "Stop planning routes. Start preventing violations.",
    creator: "@sally",
  },

  // Robots
  robots: {
    index: true,
    follow: true,
  },

  // Viewport (for responsive design)
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },

  // Theme color
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#171717" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} ${spaceGrotesk.variable} ${sora.variable} ${outfit.variable}`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <LayoutClient>{children}</LayoutClient>
          </Providers>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
