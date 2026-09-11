import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";

import { basePath, siteUrl } from "@/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  // metadataBase lets every page declare a relative canonical and still emit
  // an absolute URL. Without it Google saw the same title on every route and
  // had no canonical to anchor to.
  metadataBase: new URL(siteUrl),
  title: {
    default: "Kalyanam - Free Indian Wedding Planner with Cultural Ritual Templates",
    template: "%s | Kalyanam",
  },
  description:
    "Plan your perfect wedding with Kalyanam. Track events, manage budgets, coordinate with family, and celebrate your culture.",
  keywords: [
    "Indian wedding planner",
    "wedding planning app",
    "Telugu wedding rituals",
    "Telugu Brahmin wedding",
    "Hindu wedding ceremony checklist",
    "South Indian wedding rituals",
    "North Indian wedding rituals",
    "Muslim nikah ceremony",
    "Christian wedding ceremony",
    "wedding budget tracker",
    "wedding guest list RSVP",
    "wedding vendor management",
    "free offline wedding planner",
  ],
  authors: [
    { name: "Harini Amperayani", url: "https://harini-amperayani.com" },
    { name: "Madan Gopal Ongole", url: "https://www.linkedin.com/in/ongolemadangopal/" },
  ],
  creator: "Harini Amperayani and Madan Gopal Ongole",
  publisher: "Kalyanam",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Kalyanam",
    locale: "en_GB",
    url: siteUrl,
    title: "Kalyanam - Free Indian Wedding Planner with Cultural Ritual Templates",
    description:
      "Ready-made ceremony checklists for Telugu Brahmin, South Indian, North Indian, Muslim and Christian weddings. Track events, guests, budget and vendors - free, private and offline.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kalyanam - Free Indian Wedding Planner",
    description:
      "Ready-made ceremony checklists for Indian weddings. Track events, guests, budget and vendors - free, private and offline.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
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
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebApplication",
                name: "Kalyanam",
                url: siteUrl,
                applicationCategory: "LifestyleApplication",
                operatingSystem: "Any (web browser)",
                offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
                description:
                  "A culturally-aware wedding planner with ready-made ritual templates for Indian weddings. Data stays on your own device.",
                featureList: [
                  "Cultural ceremony templates",
                  "Guest list and RSVP tracking",
                  "Budget and installment tracking",
                  "Vendor management",
                  "Shared task lists and reminders",
                  "Works offline",
                ],
                author: [
                  {
                  "@type": "Person",
                  name: "Harini Amperayani",
                  url: "https://harini-amperayani.com",
                  sameAs: ["https://harini-amperayani.com"],
                },
                  {
                  "@type": "Person",
                  name: "Madan Gopal Ongole",
                  url: "https://www.linkedin.com/in/ongolemadangopal/",
                  sameAs: [
                    "https://www.linkedin.com/in/ongolemadangopal/",
                    "https://github.com/omgr",
                  ],
                },
                ],
              }),
            }}
          />
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

