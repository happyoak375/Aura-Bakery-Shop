"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '../../lib/store';
import { useEffect, useState } from 'react';

export default function StickyFooter() {
  // 1. Grab items (to trigger re-renders) AND your helper functions!
  const { items, getTotal, getTotalItems } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration errors by returning null until the component has mounted on the client
  if (!mounted) return null;

  // 2. Use your store's built-in math instead of doing it manually
  const totalItemsCount = getTotalItems();
  const totalAmount = getTotal();

  // 3. Hide if empty or if we are already in the checkout flow
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