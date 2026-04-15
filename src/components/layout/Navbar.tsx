// src/components/layout/Navbar.tsx
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, User } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-gradient-to-b from-black/60 to-transparent pt-6 pb-10 px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between">

        {/* THE LOGO: Using your optimized web-ready PNG */}
        <Link href="/" className="transition-transform hover:scale-105 active:scale-95">
          <Image
            src="/images/logo-aura.png"
            alt="Aura Bakery Logo"
            width={120}   // Adjust based on your logo's shape
            height={40}   // This maintains the aspect ratio
            priority      // Crucial: Loads the logo immediately
            className="object-contain"
          />
        </Link>

        {/* UTILITY LINKS: Keeping it clean and functional */}
        <div className="flex items-center gap-6">
          {/* Admin Access */}
          <Link href="/admin" className="text-white/90 hover:text-white transition-colors">
            <User size={22} strokeWidth={1.5} />
          </Link>

          {/* Cart: The only redundant but necessary element */}
          <Link href="/cart" className="relative p-2 text-white/90 hover:text-white transition-colors">
            <ShoppingCart size={22} strokeWidth={1.5} />
            <span className="absolute top-0 right-0 bg-white text-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm">
              0
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}