/**
 * @fileoverview Global Root Layout
 * This is the top-most component in the Next.js App Router. Every single page 
 * in the application is wrapped by this layout. It injects the global font, 
 * CSS, persistent UI components, and base SEO metadata.
 */
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MessageCircle } from "lucide-react";
import "./globals.css";

import Header from "../components/layout/Header";
import StickyFooter from "../components/layout/StickyFooter";

// ==========================================
// 1. FONTS & SEO CONFIGURATION
// ==========================================

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>

        {/* PERSISTENT HEADER: Remains at the top of the screen across all page navigations */}
        <Header />

        {/* PAGE CONTENT: Next.js injects the specific route's page component here */}
        {children}

        {/* GLOBAL WHATSAPP BUTTON: 
            Accessible from everywhere. Uses z-50 to float above content.
            Positioned slightly higher on mobile (bottom-28) so it doesn't overlap the StickyFooter.
        */}
        <a
          href="https://wa.me/573173285832?text=¡Hola!%20Me%20gustaría%20recibir%20asesoría%20sobre%20Aura%20Bakery."
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-28 md:bottom-6 right-6 z-50 bg-[#25D366] text-white px-4 py-3 rounded-full flex items-center gap-2 shadow-2xl hover:scale-105 hover:bg-[#20bd5a] transition-all"
        >
          <MessageCircle size={32} />
          <span className="font-bold text-sm"></span>
        </a>

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
