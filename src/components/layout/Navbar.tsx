"use client";

/**
 * @fileoverview Barra de Navegación Flotante y Traslúcida (Navbar) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Acceso y Navegación Rápida:
 *    - Acceso directo a la portada (/) mediante el imagotipo principal de Aura.
 *    - Acceso al entorno de equipo y panel administrativo (/admin) mediante el icono de perfil.
 *    - Acceso a la bolsa de compras (/cart) con distintivo de cantidad reactiva.
 * 2. Integración con Zustand (useCartStore):
 *    - Escucha dinámicamente `getTotalItems()` para desplegar la cantidad real de productos agregados.
 * 3. Prevención de Hydration Mismatch:
 *    - Bloquea el renderizado del badge numérico hasta que el componente se monta en el navegador,
 *      garantizando coherencia con el estado persistido.
 * 4. Estilo y Composición Visual:
 *    - Diseñado para superponerse con un degradado sutil (`bg-gradient-to-b from-black/60 to-transparent`)
 *      sobre banners fotográficos de gran tamaño.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, User } from 'lucide-react';
import { useCartStore } from '../../lib/store';

export default function Navbar() {
  // Selector dinámico de ítems en el carrito
  const { getTotalItems } = useCartStore();

  // Bandera de control contra errores de hidratación
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalItems = getTotalItems();

  return (
    <nav className="fixed top-0 w-full z-50 bg-gradient-to-b from-black/60 to-transparent pt-6 pb-10 px-6 font-sans">
      <div className="max-w-6xl mx-auto flex items-center justify-between">

        {/* LOGOTIPO CORPORATIVO */}
        <Link
          href="/"
          className="transition-transform hover:scale-105 active:scale-95"
          aria-label="Ir al inicio de Aura Bakery"
        >
          <Image
            src="/images/logo-aura.png"
            alt="Aura Bakery Logo"
            width={120}
            height={40}
            priority
            className="object-contain"
          />
        </Link>

        {/* ENLACES OPERATIVOS Y DE UTILIDAD */}
        <div className="flex items-center gap-6">

          {/* ACCESO STAFF / PANEL ADMINISTRATIVO */}
          <Link
            href="/admin"
            className="text-white/90 hover:text-white transition-colors"
            aria-label="Acceso al panel de equipo"
          >
            <User size={22} strokeWidth={1.5} />
          </Link>

          {/* ACCESO AL CARRITO CON BADGE REACTIVO */}
          <Link
            href="/cart"
            className="relative p-2 text-white/90 hover:text-white transition-colors"
            aria-label="Ver carrito de compras"
          >
            <ShoppingCart size={22} strokeWidth={1.5} />
            {mounted && totalItems > 0 && (
              <span className="absolute top-0 right-0 bg-white text-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm">
                {totalItems}
              </span>
            )}
          </Link>
        </div>

      </div>
    </nav>
  );
}