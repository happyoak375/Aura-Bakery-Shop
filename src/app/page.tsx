"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ShoppingBag, Clock, CheckCircle2 } from 'lucide-react';
import { mockProducts } from '../lib/mockData';
import { Cormorant_Garamond } from 'next/font/google';

// 1. Configuramos la fuente Cormorant Garamond solicitada por el cliente
const cormorant = Cormorant_Garamond({ 
  subsets: ["latin"],
  weight: ['400', '500', '600']
});

export default function Home() {
  const featuredProducts = mockProducts.slice(0, 2);

  return (
    <main className="min-h-screen bg-gray-50 pb-32 font-sans">
      
      {/* Hero Section */}
      <section 
        className="relative pt-32 pb-36 px-6 bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: "url('/images/aura-pasteis-de-nata-banner.png')" }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          
          {/* Main Title - Cormorant Garamond, tracking abierto, line-height 1.2 */}
          <h1 className={`text-5xl md:text-6xl mb-4 text-white tracking-wide leading-[1.2] drop-shadow-md ${cormorant.className}`}>
            Del mundo. Hecha a nuestra manera.
          </h1>
          
          {/* Microcopy Primario - Inter, opacity 90%, weight 300/400 */}
          <p className="text-xl md:text-2xl text-white/90 font-light mb-2 max-w-lg mx-auto leading-relaxed drop-shadow-md">
            Postres por capas. Hechos bajo pedido.
          </p>

          <p className="text-lg text-white/80 font-light mb-10 max-w-lg mx-auto tracking-wide">
            Pastelería + Café
          </p>
          
          {/* CTA - Minúsculas, font-medium, tracking leve */}
          <Link 
            href="/menu" 
            className="inline-block bg-white text-black px-12 py-4 rounded-full text-lg font-medium tracking-wide hover:bg-zinc-100 transition-all shadow-xl active:scale-95 lowercase"
          >
            ordenar ahora
          </Link>
        </div>
      </section>

      {/* NUEVA SECCIÓN: Cómo funciona */}
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

      {/* Featured Products */}
      <section className="max-w-4xl mx-auto px-6 mt-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className={`text-3xl text-zinc-900 ${cormorant.className}`}>
            Populares hoy
          </h2>
          <Link href="/menu" className="text-zinc-500 font-medium lowercase tracking-wide flex items-center gap-1 hover:text-black transition-colors">
            ver todo <ArrowRight size={18} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featuredProducts.map((product) => (
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
              
              {/* Nuevo Botón de compra rápida (+ agregar) */}
              <div className="bg-gray-50 py-1.5 px-3 rounded-full text-zinc-900 hover:bg-black hover:text-white transition-colors border border-gray-200">
                <span className="text-xs font-medium lowercase whitespace-nowrap">+ agregar</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </main>
  );
}