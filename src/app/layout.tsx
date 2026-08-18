import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter, JetBrains_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const NO_FLASH = `(function(){try{var t=localStorage.getItem('perceptron-theme');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

const sans = Inter({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });
const display = IBM_Plex_Sans({
  variable: "--font-display",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://perceptron-ai-tau.vercel.app"),
  title: {
    default: "PERCEPTRON — Government Integrity Surveillance",
    template: "%s · PERCEPTRON",
  },
  description:
    "PERCEPTRON detects fraud, collusion and process violations across government schemes before public money is lost — with explainable, graph-driven integrity intelligence.",
  applicationName: "PERCEPTRON",
  robots: { index: false, follow: false },
  openGraph: {
    title: "PERCEPTRON — Government Integrity Surveillance",
    description: "Explainable, graph-driven fraud & collusion detection for government schemes.",
    siteName: "PERCEPTRON",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0f10",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${display.variable} h-full`} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body className="min-h-full antialiased">
        {children}
        <div className="crt-overlay" aria-hidden />
        <div className="vscan-line" aria-hidden />
      </body>
    </html>
  );
}
