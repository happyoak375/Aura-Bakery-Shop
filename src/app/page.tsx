/**
 * @fileoverview Application Homepage (Landing Page)
 * This is the front door of the e-commerce platform. It features a hero banner, 
 * an explanation of the bakery's operational model ("How it works"), and a 
 * dynamic preview of featured products to drive immediate conversions.
 */

"use client";

// ==========================================
// 1. IMPORTS
// ==========================================
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ShoppingBag, Clock, CheckCircle2 } from 'lucide-react';
import { fetchProducts } from '../lib/api';
import { Product } from '../lib/mockData';
import { Cormorant_Garamond } from 'next/font/google';

// ==========================================
// 2. FONTS & CONFIGURATION
// ==========================================

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ['400', '500', '600']
});

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
export default function Home() {
  // --- State Management for Firebase Data ---
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFeaturedProducts = async () => {
      const allProducts = await fetchProducts();
      // Tomamos solo los 2 primeros productos para la sección de destacados
      setFeaturedProducts(allProducts.slice(0, 2));
      setIsLoading(false);
    };

    loadFeaturedProducts();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 pb-32 font-sans">

      {/* ==========================================
          HERO SECTION (Optimized)
          ========================================== */}
      <section className="relative pt-32 pb-36 px-6 overflow-hidden min-h-[60vh] flex items-center">
        <Image
          src="/images/aura-pasteis-de-nata-banner.jpg"
          alt="Aura Bakery Hero Background"
          fill
          priority
          className="object-cover"
        />

        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className={`text-5xl md:text-6xl mb-4 text-white tracking-wide leading-[1.2] drop-shadow-md ${cormorant.className}`}>
            Del mundo. Hecha a nuestra manera.
          </h1>

          <p className="hidden text-xl md:text-2xl text-white/90 font-light mb-2 max-w-lg mx-auto leading-relaxed drop-shadow-md">
            Postres por capas. Hechos bajo pedido.
          </p>

          <p className="text-lg text-white/80 font-light mb-10 max-w-lg mx-auto tracking-wide">
            Pastelería + Café
          </p>

          <Link
            href="/menu"
            className="inline-block bg-white text-black px-12 py-4 rounded-full text-lg font-medium tracking-wide hover:bg-zinc-100 transition-all shadow-xl active:scale-95 lowercase"
          >
            ordenar ahora
          </Link>
        </div>
      </section>

      {/* ==========================================
          EDUCATIONAL SECTION: "HOW IT WORKS"
          ========================================== */}
      <section className="bg-white py-16 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className={`text-3xl text-center mb-10 text-zinc-900 ${cormorant.className}`}>
            ¿Cómo funciona?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-zinc-900">
                <ShoppingBag size={28} />
              </div>
              <h3 className="font-medium text-zinc-900 mb-2">1. Pides</h3>
              <p className="text-zinc-500 text-sm font-light">Elige tus postres y selecciona tu ventana de entrega.</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-zinc-900">
                <Clock size={28} />
              </div>
              <h3 className="font-medium text-zinc-900 mb-2">2. Preparamos</h3>
              <p className="text-zinc-500 text-sm font-light">Horneamos lotes exactos basados en la demanda.</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-zinc-900">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="font-medium text-zinc-900 mb-2">3. Recibes</h3>
              <p className="text-zinc-500 text-sm font-light">Disfruta tus postres frescos, hechos exclusivamente para ti.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================
          FEATURED PRODUCTS PREVIEW
          ========================================== */}
      <section className="max-w-4xl mx-auto px-6 mt-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className={`text-3xl text-zinc-900 ${cormorant.className}`}>
            Populares hoy
          </h2>
          <Link href="/menu" className="text-zinc-500 font-medium lowercase tracking-wide flex items-center gap-1 hover:text-black transition-colors">
            ver todo <ArrowRight size={18} />
          </Link>
        </div>

        {/* Dynamic Firebase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            // Skeleton Loading State
            <>
              <div className="bg-white rounded-3xl p-4 h-32 border border-gray-100 animate-pulse flex gap-4">
                <div className="w-24 h-24 bg-gray-200 rounded-2xl"></div>
                <div className="flex-1 py-2"><div className="h-4 bg-gray-200 w-3/4 mb-3 rounded"></div><div className="h-3 bg-gray-200 w-1/2 rounded"></div></div>
              </div>
              <div className="bg-white rounded-3xl p-4 h-32 border border-gray-100 animate-pulse hidden md:flex gap-4">
                <div className="w-24 h-24 bg-gray-200 rounded-2xl"></div>
                <div className="flex-1 py-2"><div className="h-4 bg-gray-200 w-3/4 mb-3 rounded"></div><div className="h-3 bg-gray-200 w-1/2 rounded"></div></div>
              </div>
            </>
          ) : featuredProducts.length > 0 ? (
            featuredProducts.map((product) => (
              <Link
                href={`/menu/${product.id}`}
                key={product.id}
                className="bg-white rounded-3xl p-4 flex items-center gap-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow active:scale-95"
              >
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>

                <div className="flex-1">
                  <h3 className="font-medium text-zinc-900 text-lg leading-tight mb-1 tracking-tight">{product.name}</h3>
                  <p className="text-zinc-500/90 text-sm line-clamp-1 mb-2 font-light">{product.description}</p>
                  <div className="font-medium text-zinc-900">
                    Desde ${product.basePrice.toLocaleString('es-CO')}
                  </div>
                </div>

                <div className="bg-gray-50 py-1.5 px-3 rounded-full text-zinc-900 hover:bg-black hover:text-white transition-colors border border-gray-200">
                  <span className="text-xs font-medium lowercase whitespace-nowrap">+ agregar</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-2 text-center py-8 text-zinc-400 font-light text-sm">
              No hay productos destacados por el momento.
            </div>
          )}
        </div>

      </section>

    </main>
  );
}