/**
 * @fileoverview Global Root Layout
 * This is the top-most component in the Next.js App Router. Every single page 
 * in the application is wrapped by this layout. It injects the global font, 
 * CSS, persistent UI components, and base SEO metadata.
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import Header from "../components/layout/Header";
import StickyFooter from "../components/layout/StickyFooter";

// ==========================================
// 1. FONTS & SEO CONFIGURATION
// ==========================================

/**
 * Global Font Initialization:
 * Next.js automatically optimizes this font at build time and serves it locally.
 * This prevents layout shifts (CLS) and removes the need for external network 
 * requests to Google Fonts.
 */
const inter = Inter({ subsets: ["latin"] });

/**
 * Global SEO Metadata:
 * Next.js uses this object to automatically generate the <title> and <meta> tags 
 * inside the HTML <head>. This improves search engine ranking and social media sharing.
 */
export const metadata: Metadata = {
  title: "Aura Bakery Shop",
  description: "Postres por capas. Hechos bajo pedido.",
};

// ==========================================
// 2. MAIN COMPONENT
// ==========================================

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>

        {/* PERSISTENT HEADER: Remains at the top of the screen across all page navigations */}
        <Header />

        {/* PAGE CONTENT: Next.js injects the specific route's page component here */}
        {children}

        {/* PERSISTENT FOOTER: 
            Since the hydration logic (checking if the cart exists) is handled securely 
            inside the StickyFooter component itself, we can use a standard import 
            here without breaking Server-Side Rendering (SSR).
        */}
        <StickyFooter />

      </body>
    </html>
  );
}