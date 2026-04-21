import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PASO 2 Year Anniversary — Pon Tus Millas",
  description:
    "Celebrate PASO Run Club's 2 Year Anniversary. Dinner, dancing, and community. April 28 at Panorama Restaurant, Flushing NY.",
  openGraph: {
    title: "PASO 2 Year Anniversary — Pon Tus Millas",
    description: "Come eat, dance, and celebrate with us. April 28 · 7PM · Panorama Restaurant",
    siteName: "PASO Run Club",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
