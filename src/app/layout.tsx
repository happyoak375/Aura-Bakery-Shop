import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MessageCircle } from "lucide-react";
import "./globals.css";

import FacebookPixel from "@/components/FacebookPixel";
import { Suspense } from "react";

import Header from "../components/layout/Header";
import StickyFooter from "../components/layout/StickyFooter";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aura Bakery Shop",
  description: "Postres por capas. Hechos bajo pedido.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Meta Pixel Component - Tracks PageViews dynamically on route changes */}
        <Suspense fallback={null}>
          <FacebookPixel />
        </Suspense>

        <Header />

        {children}

        {/* WhatsApp Floating Button */}
        <a
          href="https://wa.me/573173285832?text=¡Hola!%20Me%20gustaría%20recibir%20asesoría%20sobre%20Aura%20Bakery."
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-28 md:bottom-6 right-6 z-50 bg-[#25D366] text-white px-4 py-3 rounded-full flex items-center gap-2 shadow-2xl hover:scale-105 hover:bg-[#20bd5a] transition-all"
        >
          <MessageCircle size={32} />
        </a>

        <StickyFooter />
      </body>
    </html>
  );
}