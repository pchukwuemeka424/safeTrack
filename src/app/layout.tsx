import type { Metadata } from "next";
import { Outfit, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OALS — Online Authorised Location & Safeguarding",
    template: "%s | OALS",
  },
  description:
    "Create controlled evidence links, collect consent-based location information, and manage investigation events from one secure platform.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL &&
      !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")
      ? process.env.NEXT_PUBLIC_APP_URL
      : "https://www.mylos.cyou",
  ),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
