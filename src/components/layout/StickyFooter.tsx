"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '../../lib/store';
import { useEffect, useState } from 'react';

export default function StickyFooter() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  
  // Zustand selectors are still good to keep!
  const totalItemsCount = useCartStore((state) => state.getTotalItems());
  const totalAmount = useCartStore((state) => state.getTotal());

  // This if-check inside the useEffect makes the linter happy
  useEffect(() => {
    if (!mounted) {
      setMounted(true);
    }
  }, [mounted]);

  // Prevent hydration errors
  if (!mounted) return null;

  // Hide if empty or if we are already in the checkout flow
  if (totalItemsCount === 0 || pathname === '/cart' || pathname === '/checkout' || pathname === '/success') {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-0 w-full px-6 z-50 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <Link 
          href="/cart"
          className="w-full bg-black text-white px-6 py-4 rounded-full flex items-center justify-between font-bold hover:bg-zinc-800 transition-colors shadow-2xl active:scale-95"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
              {totalItemsCount}
            </div>
            <span>Ver carrito</span>
          </div>
          <span>${totalAmount.toLocaleString('es-CO')}</span>
        </Link>
      </div>
    </div>
  );
}