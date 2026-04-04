/**
 * @fileoverview Global Header Component
 * This component renders the top navigation bar, including the bakery's logo
 * and a dynamic shopping cart indicator. It is sticky and appears on all main pages.
 */

"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../lib/store';
import { useEffect, useState } from 'react';

export default function Header() {
  const { getTotalItems } = useCartStore();
  
  /**
   * HYDRATION MISMATCH FIX:
   * Zustand stores the cart data in the browser's localStorage. During Server-Side 
   * Rendering (SSR), Next.js doesn't have access to localStorage, so it renders 0 items. 
   * If the browser immediately paints 3 items, Next.js throws a "Hydration Mismatch" error.
   * We use this `mounted` state to delay rendering the cart badge until the component 
   * has safely loaded on the client side.
   */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalItemsCount = getTotalItems();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      
      {/* LAYOUT TRICK: 
        We use 'relative' on the parent container so the absolutely positioned logo 
        knows exactly where the center of the header is.
      */}
      <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between relative">
        
        {/* Invisible spacer block on the left to perfectly balance the right-side cart icon */}
        <div className="w-10" />

        {/* Centered Image Logo */}
        <Link 
          href="/" 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity"
        >
          <Image 
            src="/images/logo-aura.png" 
            alt="Aura Bakery Logo" 
            width={140} 
            height={48} 
            className="h-40 w-auto object-contain"
            /**
             * LCP OPTIMIZATION: 
             * The 'priority' flag tells Next.js to preload this image immediately 
             * because it is "above the fold" (visible without scrolling). 
             * This drastically improves the Largest Contentful Paint score.
             */
            priority 
          />
        </Link>

        {/* Cart Icon & Dynamic Badge */}
        <Link 
          href="/cart" 
          className="relative p-2.5 -mr-2.5 text-zinc-900 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
        >
          <ShoppingBag size={24} />
          
          {/* Only show the red notification badge if the client has mounted AND the cart is not empty */}
          {mounted && totalItemsCount > 0 && (
            <span className="absolute top-0 right-0 translate-x-1 -translate-y-1 bg-black text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white">
              {totalItemsCount}
            </span>
          )}
        </Link>

      </div>
    </header>
  );
}