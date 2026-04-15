/**
 * @fileoverview Floating Cart Action Button (Sticky Footer)
 * A persistent footer that appears when items are in the cart. 
 * It gives users a constant, frictionless way to proceed to checkout 
 * without having to scroll back to the top navigation bar.
 */

"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '../../lib/store';
import { useEffect, useState } from 'react';

export default function StickyFooter() {
  const [mounted, setMounted] = useState(false);
  
  // Next.js hook to get the current URL route (e.g., '/cart' or '/')
  const pathname = usePathname();
  
  // Zustand selectors: Pulling dynamic cart totals to display on the button
  const totalItemsCount = useCartStore((state) => state.getTotalItems());
  const totalAmount = useCartStore((state) => state.getTotal());

  /**
   * HYDRATION FIX:
   * Similar to the Header component, we wait for the client to mount before rendering 
   * data from localStorage. The conditional check prevents infinite re-rendering 
   * and satisfies React's exhaustive-deps linter rules.
   */
  useEffect(() => {
    if (!mounted) {
      setMounted(true);
    }
  }, [mounted]);

  // Prevent SSR hydration mismatch by rendering nothing on the server
  if (!mounted) return null;

  /**
   * ROUTE & STATE VISIBILITY LOGIC:
   * We completely hide this floating button if:
   * 1. The cart is empty (totalItemsCount === 0).
   * 2. The user is already in the checkout pipeline (cart, checkout, or success page).
   * Having a "View Cart" button while already looking at the cart is redundant UX!
   */
  if (totalItemsCount === 0 || pathname === '/cart' || pathname === '/checkout' || pathname === '/success') {
    return null;
  }

  return (
    /* * CSS LAYOUT TRICK: 
     * 'pointer-events-none' on the wrapper allows clicks to pass through the invisible 
     * areas of this fixed div, so users can still tap on products "underneath" it.
     */
    <div className="fixed bottom-6 left-0 w-full px-6 z-50 pointer-events-none">
      
      {/* 'pointer-events-auto' reactivates clicks JUST for the button itself */}
      <div className="max-w-md mx-auto pointer-events-auto">
        <Link 
          href="/cart"
          className="w-full bg-black text-white px-6 py-4 rounded-full flex items-center justify-between font-bold hover:bg-zinc-800 transition-colors shadow-2xl active:scale-95"
        >
          <div className="flex items-center gap-3">
            {/* Item Count Badge */}
            <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
              {totalItemsCount}
            </div>
            <span>Ver carrito</span>
          </div>
          
          {/* Formatted Total Price */}
          <span>${totalAmount.toLocaleString('es-CO')}</span>
        </Link>
      </div>
    </div>
  );
}