"use client";

/**
 * @fileoverview Encabezado Global Persistente (Header) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Navegación Principal:
 *    - Acceso directo al catálogo general (/menu) mediante el icono de tienda (Store).
 *    - Acceso a la portada (/) mediante el imagotipo centralizado de Aura Bakery.
 *    - Acceso a la bolsa de compras (/cart) con badge numérico reactivo.
 * 2. Suscripción al Carrito (Zustand):
 *    - Consulta en tiempo real `getTotalItems()` para reflejar la cantidad total de productos.
 * 3. Prevención de Hydration Mismatch:
 *    - Espera al montaje en el cliente (`mounted`) antes de desplegar el contador del carrito,
 *      evitando diferencias entre el HTML del servidor y los datos persistidos en localStorage.
 * 4. Optimización Estética y de Rendimiento:
 *    - Barra fija (sticky) con desenfoque de fondo (`backdrop-blur-sm`).
 *    - Prioridad de precarga (`priority`) para el logotipo institucional.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Store } from 'lucide-react';
import { useCartStore } from '../../lib/store';

export default function Header() {
  // Selector reactivo de cantidad de ítems en la bolsa
  const { getTotalItems } = useCartStore();

  // Bandera de control para evitar discrepancias de hidratación en SSR
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalItemsCount = getTotalItems();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 font-sans">
      <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between relative">

        {/* BOTÓN AL MENÚ / TIENDA */}
        <Link
          href="/menu"
          className="relative p-2.5 -ml-2.5 text-zinc-900 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center active:scale-95"
          aria-label="Explorar el menú"
        >
          <Store size={24} />
        </Link>

        {/* LOGOTIPO CENTRAL PERSISTENTE */}
        <Link
          href="/"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity"
          aria-label="Ir a la portada de Aura Bakery"
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

        {/* ACCESO AL CARRITO CON BADGE DINÁMICO */}
        <Link
          href="/cart"
          className="relative p-2.5 -mr-2.5 text-zinc-900 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center active:scale-95"
          aria-label="Ver bolsa de compras"
        >
          <ShoppingBag size={24} />

          {/* Insignia numérica: Solo se muestra si el componente ya montó y hay ítems */}
          {mounted && totalItemsCount > 0 && (
            <span className="absolute top-0 right-0 translate-x-1 -translate-y-1 bg-black text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {totalItemsCount}
            </span>
          )}
        </Link>

      </div>
    </header>
  );
}