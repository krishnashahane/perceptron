import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PERCEPTRON — Public Resource & Integrity Surveillance Matrix",
  description:
    "PERCEPTRON detects fraud, collusion and process violations across government schemes before public money is lost — with explainable, graph-driven integrity intelligence.",
  applicationName: "PERCEPTRON",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#05070a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full antialiased">
        {children}
        <div className="crt-overlay" aria-hidden />
        <div className="vscan-line" aria-hidden />
      </body>
    </html>
  );
}
