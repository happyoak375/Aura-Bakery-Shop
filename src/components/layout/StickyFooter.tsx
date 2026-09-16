"use client";

/**
 * @fileoverview Botón Flotante Persistente de Acceso al Carrito (StickyFooter) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Acceso Directo y Sin Fricción:
 *    - Despliega un llamado a la acción flotante en la parte inferior para proceder a la bolsa (/cart).
 * 2. Supresión Contextual de la Interfaz:
 *    - Se oculta si el carrito no tiene artículos (`totalItemsCount === 0`)[cite: 1].
 *    - Se desactiva dentro de las etapas del túnel de compra (/cart, /checkout, /success)[cite: 1].
 *    - Se oculta en vistas individuales de producto (/menu/...) para no colisionar con el botón propio de compra[cite: 1, 4].
 * 3. Paso de Eventos del Puntero (CSS Pointer-Events):
 *    - El contenedor raíz tiene `pointer-events-none` para permitir clics a elementos inferiores,
 *      mientras que la barra interna activa `pointer-events-auto` para capturar la interacción del usuario[cite: 1].
 * 4. Sincronización con el Estado Global:
 *    - Suscrito a `getTotalItems()` y `getTotal()` desde Zustand (`useCartStore`)[cite: 1, 5].
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '../../lib/store';

export default function StickyFooter() {
  const [mounted, setMounted] = useState<boolean>(false);
  const pathname = usePathname();

  // Selectores reactivos de totales desde Zustand
  const totalItemsCount = useCartStore((state) => state.getTotalItems());
  const totalAmount = useCartStore((state) => state.getTotal());

  /**
   * CONTROL DE MONTAJE PARA EVITAR DISCREPANCIAS DE HIDRATACIÓN (SSR):
   * Espera a que el componente esté montado en el cliente antes de mostrar datos locales[cite: 1].
   */
  useEffect(() => {
    if (!mounted) {
      setMounted(true);
    }
  }, [mounted]);

  // Si aún no se monta en el navegador, no renderiza markup inicial[cite: 1]
  if (!mounted) return null;

  // Detección de vista de detalle de producto (ej. /menu/tarta-vasca)[cite: 1]
  const isProductPage = pathname?.startsWith('/menu/');

  // Reglas de visibilidad del botón flotante[cite: 1]
  if (
    totalItemsCount === 0 ||
    pathname === '/cart' ||
    pathname === '/checkout' ||
    pathname === '/success' ||
    isProductPage
  ) {
    return null;
  }

  return (
    /* Contenedor transparente con paso de clics hacia el contenido del fondo */
    <div className="fixed bottom-6 left-0 w-full px-6 z-50 pointer-events-none font-sans">

      {/* Botón flotante con eventos de puntero activos */}
      <div className="max-w-md mx-auto pointer-events-auto">
        <Link
          href="/cart"
          className="w-full bg-black text-white px-6 py-4 rounded-full flex items-center justify-between font-bold hover:bg-zinc-800 transition-colors shadow-2xl active:scale-95"
          aria-label={`Ver carrito con ${totalItemsCount} productos`}
        >
          <div className="flex items-center gap-3">
            {/* Distintivo de cantidad de productos */}
            <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
              {totalItemsCount}
            </div>
            <span>Ver carrito</span>
          </div>

          {/* Monto total liquidado en pesos colombianos */}
          <span>${totalAmount.toLocaleString('es-CO')}</span>
        </Link>
      </div>

    </div>
  );
}