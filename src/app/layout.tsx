import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";

const basePath = process.env.GITHUB_PAGES_REPO
  ? `/${process.env.GITHUB_PAGES_REPO}`
  : "";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Kalyanam - Wedding Planning Made Beautiful",
  description:
    "Plan your perfect wedding with Kalyanam. Track events, manage budgets, coordinate with family, and celebrate your culture.",
  keywords: [
    "wedding planning",
    "Indian wedding",
    "Telugu wedding",
    "Hindu wedding",
    "Muslim wedding",
    "Christian wedding",
    "wedding budget",
    "guest management",
    "event planning",
  ],
  authors: [{ name: "Kalyanam Team" }],
  creator: "Kalyanam",
  manifest: `${basePath}/manifest.json`,
  icons: {
    icon: `${basePath}/icons/icon.svg`,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kalyanam",
  },
  formatDetection: {
    telephone: true,
    email: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF8F0" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1410" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href={`${basePath}/manifest.json`} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} antialiased min-h-screen bg-background`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

