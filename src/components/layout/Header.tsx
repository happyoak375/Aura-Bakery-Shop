"use client";

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../lib/store';
import { useEffect, useState } from 'react';
import { Dancing_Script } from 'next/font/google';

// 1. Initialize the cursive font
const dancingScript = Dancing_Script({ 
  subsets: ['latin'],
  weight: ['700'] // Bold weight makes it pop as a logo
});
export default function Header() {
  // Subscribe directly to the items array here as well
  const items = useCartStore((state) => state.items);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate total items
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
        
        <Link href="/" className={`text-3xl text-zinc-900 ${dancingScript.className}`}>
          Aura Bakery
        </Link>

        <Link 
          href="/cart" 
          className="relative p-2 -mr-2 text-zinc-900 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
        >
          <ShoppingBag size={24} />
          
          {mounted && totalItems > 0 && (
            <span className="absolute top-0 right-0 translate-x-1 -translate-y-1 bg-black text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white">
              {totalItems}
            </span>
          )}
        </Link>

      </div>
    </header>
  );
}