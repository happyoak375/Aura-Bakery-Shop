import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MessageCircle } from "lucide-react";
import Script from "next/script";
import "./globals.css";

import Header from "../components/layout/Header";
import StickyFooter from "../components/layout/StickyFooter";
import * as fbq from "../lib/fpixel";

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
      <head>
        {/* Meta Pixel Code - AuraTaller App */}
        <Script id="fb-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${fbq.FB_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <Header />
        {children}

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