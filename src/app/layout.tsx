import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
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
    <html lang="es">
      <body className={inter.className}>
        <Header />
        {children}
        <StickyFooter />
      </body>
    </html>
  );
}