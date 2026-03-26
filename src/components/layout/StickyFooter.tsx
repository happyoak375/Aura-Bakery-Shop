"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '../../lib/store';
import { useEffect, useState } from 'react';

export default function StickyFooter() {
  // 1. Subscribe directly to 'items' so React knows to re-render when the cart changes
  const items = useCartStore((state) => state.items);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration errors by returning null until the component has mounted on the client
  if (!mounted) return null;

  // 2. Calculate the totals directly from the watched array
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const totalAmount = items.reduce((total, item) => total + (item.price * item.quantity), 0);

  // 3. Hide if empty or if we are already in the checkout flow
  if (totalItems === 0 || pathname === '/cart' || pathname === '/checkout' || pathname === '/success') {
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
              {totalItems}
            </div>
            <span>Ver carrito</span>
          </div>
          <span>${totalAmount.toLocaleString('es-CO')}</span>
        </Link>
      </div>
    </div>
  );
}