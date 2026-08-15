import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import { WebSentry } from "@/components/WebSentry";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono-loaded",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "AI-Growth-OS",
  description: "Your website’s relentless AI-driven growth engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable}`}
      // Browser extensions often inject attrs (e.g. crxlauncher) onto <html>
      // before hydration; ignore those mismatches.
      suppressHydrationWarning
    >
      <body
        style={{ fontFamily: "var(--font-sans-loaded), var(--font-sans)" }}
        suppressHydrationWarning
      >
        <WebSentry />
        {children}
      </body>
    </html>
  );
}
