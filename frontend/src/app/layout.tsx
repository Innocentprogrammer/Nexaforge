import type { Metadata, Viewport } from "next";
import { Poppins, Inter, Playfair_Display, Dancing_Script } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/toast";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Curated invitation-content fonts (not NexaForge brand chrome — see
// components/invitation-canvas.tsx). Users pick these for their invitation's own
// heading; the rest of the product UI stays on Poppins/Inter per Brand Guidelines.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "NexaForge — Engineering the Future of Digital Business",
  description:
    "NexaForge Technologies builds AI-powered SaaS products and digital solutions, starting with NexaInvite — design, share, and track digital invitations in minutes.",
};

// Tints the browser chrome to match the app canvas in both appearances.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1017" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // globals.css sets `scroll-behavior: smooth` for in-page anchor links.
      // Next 16 no longer overrides that during route transitions unless this
      // attribute is present, so without it every navigation smooth-scrolls to
      // the top instead of jumping instantly. See the version-16 upgrade guide.
      data-scroll-behavior="smooth"
      className={`${poppins.variable} ${inter.variable} ${playfair.variable} ${dancingScript.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
