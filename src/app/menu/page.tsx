/**
 * @fileoverview Main Menu & Catalog Page
 * Displays the full grid of bakery products. Features dynamic category filtering
 * and responsive grid layouts. Acts as the primary discovery page for customers.
 */

"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Zap, MessageCircle } from 'lucide-react';
import { mockProducts, AvailabilityType } from '../../lib/mockData';

// ==========================================
// 1. HELPER FUNCTIONS
// ==========================================

/**
 * Maps the product's availability lead time to a compact visual badge.
 * WHY DO THIS HERE?: Extracting this from the main loop keeps the JSX incredibly 
 * clean and prevents cluttering the grid rendering logic with UI conditional statements.
 * @param {AvailabilityType} type - The lead time requirement.
 * @returns An object containing the icon, short text, and Tailwind CSS classes.
 */
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
  }
};

// ==========================================
// 2. MAIN COMPONENT
// ==========================================
export default function MenuPage() {
  // --- State ---
  // Tracks which category filter is currently active
  const [activeCategory, setActiveCategory] = useState('Todos');

  /**
   * DYNAMIC CATEGORY GENERATION:
   * By mapping through all products and passing them into a `Set`, we automatically 
   * strip out duplicates. This creates a dynamic, data-driven category list. 
   * If a new category is added to the database, it instantly appears in the UI.
   */
  const categories = ['Todos', ...Array.from(new Set(mockProducts.map((p) => p.category)))];

  /**
   * FILTER LOGIC:
   * If 'Todos' is selected, show the raw array. Otherwise, filter it down.
   */
  const filteredProducts = activeCategory === 'Todos' 
    ? mockProducts 
    : mockProducts.filter((p) => p.category === activeCategory);

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

        {/* --- CATEGORY NAVIGATION (MOBILE OPTIMIZED) --- */}
        {/* 'overflow-x-auto' and 'scrollbar-hide' allow users to smoothly swipe 
             horizontally through categories on small screens without an ugly scrollbar. */}
        <div className="flex overflow-x-auto gap-3 pb-4 mb-4 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 ${
                activeCategory === category
                  ? 'bg-black text-white shadow-md'
                  : 'bg-white text-zinc-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* --- PRODUCT GRID --- */}
        {/* 2 columns on mobile, 3 on desktop */}
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
                {/* 'aspect-square' forces the container into a perfect box, preventing layout shifts */}
                <div className="relative aspect-square bg-gray-100 w-full overflow-hidden">
                  
                  {/* Floating Mini-Badge */}
                  <div className={`absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold shadow-sm ${badge.style}`}>
                    {badge.icon} {badge.text}
                  </div>
                  
                  {/* NEXT.JS IMAGE OPTIMIZATION: 
                      'fill' tells Next to expand the image to the parent container bounds.
                      'sizes' prevents downloading massive desktop images on mobile devices. */}
                  <Image 
                    src={product.imageUrl} 
                    alt={product.name} 
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>

                {/* --- PRODUCT INFO --- */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-zinc-900 text-sm leading-tight mb-1">
                    {product.name}
                  </h3>
                  
                  {/* CSS TRICK: 'line-clamp-2' 
                      Forces descriptions to truncate with an ellipsis (...) after 2 lines. 
                      This guarantees every card is exactly the same height, keeping the grid perfect. */}
                  <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
                    {product.description}
                  </p>
                  
                  {/* Pushes the price and button to the very bottom of the card, 
                      even if the title is short. */}
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

      </div>
    </main>
  );
}