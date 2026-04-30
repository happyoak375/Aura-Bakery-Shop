/**
 * @fileoverview Main Menu & Catalog Page
 * Displays the full grid of bakery products. Features dynamic category filtering
 * and responsive grid layouts. Acts as the primary discovery page for customers.
 */

"use client";

// 1. Add useEffect to your React imports
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Zap, MessageCircle } from 'lucide-react';
// 2. Import the new fetch function and the Product type
import { AvailabilityType, Product } from '../../lib/mockData';
import { fetchProducts } from '../../lib/api';

// ==========================================
// 1. HELPER FUNCTIONS
// ==========================================

const getMiniBadge = (type: AvailabilityType) => {
  switch (type) {
    case 'asap':
      return { icon: <Zap size={12} />, text: 'Para hoy', style: 'bg-amber-100 text-amber-700' };
    case '24h':
      return { icon: <Clock size={12} />, text: '24h', style: 'bg-blue-100 text-blue-700' };
    case '48h':
      return { icon: <Clock size={12} />, text: '48h', style: 'bg-purple-100 text-purple-700' };
    case 'advisor_only':
      return { icon: <MessageCircle size={12} />, text: 'Asesor', style: 'bg-green-100 text-green-700' };
    default:
      // Fallback just in case
      return { icon: <Clock size={12} />, text: 'Consultar', style: 'bg-gray-100 text-gray-700' };
  }
};

// ==========================================
// 2. MAIN COMPONENT
// ==========================================
export default function MenuPage() {
  // --- State ---
  const [activeCategory, setActiveCategory] = useState('Todos');

  // 3. Add state to hold the Firebase data and a loading indicator
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 4. Fetch the data when the component mounts
  useEffect(() => {
    const loadCatalog = async () => {
      const liveData = await fetchProducts();
      setProducts(liveData);
      setIsLoading(false);
    };

    loadCatalog();
  }, []);

  /**
   * DYNAMIC CATEGORY GENERATION:
   * Now it maps over the dynamic `products` state instead of the static mockData.
   */
  const categories = ['Todos', ...Array.from(new Set(products.map((p) => p.category)))];

  /**
   * FILTER LOGIC:
   */
  const filteredProducts = activeCategory === 'Todos'
    ? products
    : products.filter((p) => p.category === activeCategory);

  // ==========================================
  // 3. MAIN RENDER
  // ==========================================
  return (
    <main className="min-h-screen bg-gray-50 pb-32 pt-6 px-6">
      <div className="max-w-4xl mx-auto">

        {/* --- HEADER --- */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight mb-2">Nuestro Menú</h1>
          <p className="text-zinc-500 font-medium text-sm">Postres artesanales, hechos sobre pedido para ti.</p>
        </div>

        {/* 5. Show a loading state while fetching from Firebase */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-zinc-500 font-medium animate-pulse">Cargando el horno...</p>
          </div>
        ) : (
          <>
            {/* --- CATEGORY NAVIGATION --- */}
            <div className="flex overflow-x-auto gap-3 pb-4 mb-4 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 ${activeCategory === category ? 'bg-black text-white shadow-md' : 'bg-white text-zinc-600 border border-gray-200 hover:border-gray-300' }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* --- PRODUCT GRID --- */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const badge = getMiniBadge(product.availabilityType);

                return (
                  <Link
                    href={`/menu/${product.id}`}
                    key={product.id}
                    className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow active:scale-95"
                  >
                    {/* --- IMAGE & BADGE --- */}
                    <div className="relative aspect-square bg-gray-100 w-full overflow-hidden">
                      <div className={`absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold shadow-sm ${badge.style}`}>
                        {badge.icon} {badge.text}
                      </div>

                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        priority
                        unoptimized
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>

                    {/* --- PRODUCT INFO --- */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-bold text-zinc-900 text-sm leading-tight mb-1">
                        {product.name}
                      </h3>

                      <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
                        {product.description}
                      </p>

                      <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-50">
                        <span className="font-extrabold text-zinc-900 text-sm">
                          ${product.basePrice.toLocaleString('es-CO')}
                        </span>
                        <div className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-lg leading-none pb-0.5 shadow-sm">
                          +
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Fallback if the database is empty */}
            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                No hay productos disponibles en esta categoría.
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}