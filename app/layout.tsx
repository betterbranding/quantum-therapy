import type { Metadata, Viewport } from "next";
import { Rajdhani, Orbitron, Outfit, JetBrains_Mono } from "next/font/google";
import { TabBar } from "@/components/TabBar";
import { Onboarding } from "@/components/Onboarding";
import "./globals.css";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-rajdhani",
  display: "swap",
});
const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-orbitron",
  display: "swap",
});
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});
const jet = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jet",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quantumtherapy.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Quantum Therapy: Rife Frequency Protocols",
    template: "%s · Quantum Therapy",
  },
  description:
    "Search 1,395 Rife frequency protocols from the Consolidated Annotated Frequency List and play them as binaural beat sessions with ambient soundscapes.",
  keywords: [
    "rife frequencies",
    "rife machine",
    "binaural beats",
    "CAFL",
    "frequency healing",
    "solfeggio frequencies",
    "isochronic tones",
  ],
  applicationName: "Quantum Therapy",
  authors: [{ name: "Better Branding LLC" }],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Quantum Therapy",
    title: "Your body runs on frequency",
    description:
      "1,395 Rife protocols. Binaural beat sessions. Ambient soundscapes. Search any ailment and start a session in seconds.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Your body runs on frequency",
    description: "1,395 Rife protocols, played as binaural beat sessions.",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#060a17",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${rajdhani.variable} ${orbitron.variable} ${outfit.variable} ${jet.variable}`}
    >
      <body className="field min-h-dvh antialiased">
        <div className="field-aurora" aria-hidden />
        <div className="field-grid" aria-hidden />
        <div className="field-grain" aria-hidden />
        <main className="pb-tabs mx-auto w-full max-w-[520px] lg:max-w-3xl">{children}</main>
        <Onboarding />
        <TabBar />
      </body>
    </html>
  );
}
