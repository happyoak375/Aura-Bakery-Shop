/**
 * @fileoverview Global Header Component
 */

"use client";

import Link from 'next/link';
import Image from 'next/image';
// Updated icon import to Store
import { ShoppingBag, Store } from 'lucide-react';
import { useCartStore } from '../../lib/store';
import { useEffect, useState } from 'react';

export default function Header() {
  const { getTotalItems } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalItemsCount = getTotalItems();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between relative">

        {/* Menu/Store Button */}
        <Link
          href="/menu"
          className="relative p-2.5 -ml-2.5 text-zinc-900 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
          aria-label="Volver al menú"
        >
          {/* Changed from <Menu /> to <Store /> */}
          <Store size={24} />
        </Link>

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
            priority
          />
        </Link>

        {/* Cart Icon & Dynamic Badge */}
        <Link
          href="/cart"
          className="relative p-2.5 -mr-2.5 text-zinc-900 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
          aria-label="Ver carrito"
        >
          <ShoppingBag size={24} />
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