import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MessageCircle } from "lucide-react";
import { Suspense } from "react";
import "./globals.css";

import FacebookPixel from "@/components/FacebookPixel";
import Header from "../components/layout/Header";
import StickyFooter from "../components/layout/StickyFooter";

/**
 * Tipografía principal para la interfaz y cuerpo de la aplicación.
 */
const inter = Inter({ subsets: ["latin"] });

/**
 * Metadatos globales SEO para el sitio web y la plataforma.
 */
export const metadata: Metadata = {
  title: "Aura Bakery Shop",
  description: "Postres por capas. Hechos bajo pedido.",
};

/**
 * Layout Raíz Global (RootLayout)
 * 
 * En Next.js App Router, este componente envuelve a todas las páginas y rutas de la aplicación.
 * 
 * Responsabilidades:
 * - Inyectar clases base de CSS global y tipografía base.
 * - Mantener el encabezado de navegación persistente (`<Header />`).
 * - Inicializar el rastreador de analítica de Meta (`<FacebookPixel />`) dentro de un 
 *   límite de <Suspense> para permitir la lectura dinámica de rutas sin romper el SSR.
 * - Ofrecer canal directo de atención al cliente mediante un botón flotante de WhatsApp.
 * - Desplegar la barra de acción inferior persistente (`<StickyFooter />`) para checkout rápido.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        {/* 
          RASTREADOR META PIXEL:
          Se envuelve en <Suspense> porque utiliza 'useSearchParams()' para detectar cambios
          de ruta en cliente. Sin Suspense, Next.js deshabilitaría el renderizado estático/SSR.
        */}
        <Suspense fallback={null}>
          <FacebookPixel />
        </Suspense>

        {/* Barra de navegación superior fija en toda la aplicación */}
        <Header />

        {/* Inyección del contenido dinámico de cada página según la ruta activa */}
        {children}

        {/* 
          BOTÓN FLOTANTE DE WHATSAPP:
          Canal de asistencia inmediata para clientes. 
          Usa bottom-28 en móviles para situarse por encima del StickyFooter y no bloquearlo.
        */}
        <a
          href="https://wa.me/573173285832?text=¡Hola!%20Me%20gustaría%20recibir%20asesoría%20sobre%20Aura%20Bakery."
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-28 md:bottom-6 right-6 z-50 bg-[#25D366] text-white px-4 py-3 rounded-full flex items-center gap-2 shadow-2xl hover:scale-105 hover:bg-[#20bd5a] transition-all"
          aria-label="Contactar por WhatsApp"
        >
          <MessageCircle size={32} />
        </a>

        {/* Barra flotante inferior de resumen de compra (se activa reactivamente si hay items) */}
        <StickyFooter />
      </body>
    </html>
  );
}