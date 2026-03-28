"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { mockProducts } from '../lib/mockData';
import { Dancing_Script } from 'next/font/google';

const dancingScript = Dancing_Script({ subsets: ["latin"] });

export default function Home() {
  // Tomamos solo los dos primeros productos para la sección de destacados
  const featuredProducts = mockProducts.slice(0, 2);

  return (
    <main className="min-h-screen bg-gray-50 pb-32">
      
      {/* Hero Section */}
      <section className="bg-zinc-900 text-white pt-20 pb-24 px-6 rounded-b-[3rem] shadow-xl">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className={`text-6xl md:text-7xl mb-6 text-[#F2E8D5] ${dancingScript.className}`}>
            Aura Bakery
          </h1>
          <p className="text-xl md:text-2xl text-zinc-300 font-medium mb-10 max-w-lg mx-auto leading-relaxed">
            Postres de autor, hechos con intención y entregados en tu puerta.
          </p>
          <Link 
            href="/menu" 
            className="inline-block bg-white text-black px-10 py-4 rounded-full text-lg font-bold hover:bg-zinc-100 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.2)] active:scale-95"
          >
            Ordenar ahora
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-4xl mx-auto px-6 mt-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-extrabold text-zinc-900">Populares hoy</h2>
          <Link href="/menu" className="text-zinc-500 font-bold flex items-center gap-1 hover:text-black transition-colors">
            Ver todo <ArrowRight size={18} />
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
                <h3 className="font-bold text-zinc-900 text-lg leading-tight mb-1">{product.name}</h3>
                <p className="text-zinc-500 text-sm line-clamp-1 mb-2">{product.description}</p>
                {/* AQUÍ ESTÁ EL FIX: Cambiamos product.price por product.basePrice */}
                <div className="font-extrabold text-zinc-900">
                  Desde ${product.basePrice.toLocaleString('es-CO')}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </main>
  );
}