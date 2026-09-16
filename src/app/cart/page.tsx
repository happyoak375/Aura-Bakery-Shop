"use client";

/**
 * @fileoverview Vista del Carrito de Compras (CartPage) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Visualización de ítems seleccionados: Lista los productos agregados mediante `useCartStore`.
 * 2. Control de cantidades y bajas: Permite aumentar, disminuir (con eliminación automática al llegar a 0)
 *    o descartar líneas específicas utilizando su `cartItemId` único.
 * 3. Desglose y cálculo de totales: Consulta de forma reactiva `getTotal()` para garantizar precisión matemática.
 * 4. Manejo de estado vacío (Empty State): Presenta un mensaje amigable y llamada a la acción hacia el catálogo.
 * 5. Túnel de checkout: Redirige hacia `/checkout` con la orden completa consolidada.
 */

import Link from 'next/link';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../lib/store';

export default function CartPage() {
  /**
   * SUSCRIPCIÓN AL ESTADO GLOBAL (Zustand):
   * Se extraen las acciones y selectores requeridos para gestionar la bolsa.
   * `getTotal()` calcula la suma de todos los productos multiplicados por su respectiva cantidad.
   */
  const { items, removeItem, updateQuantity, getTotal } = useCartStore();
  const cartTotal = getTotal();

  // =========================================================================
  // 1. ESTADO VACÍO (EMPTY STATE)
  // Si no hay productos en la bolsa, se guía al cliente de regreso al catálogo.
  // =========================================================================
  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6 text-gray-400">
          <ShoppingBag size={40} />
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-900 mb-2">Tu carrito está vacío</h1>
        <p className="text-zinc-500 mb-8 max-w-sm">
          Parece que aún no has agregado ninguna de nuestras delicias. ¡Ve a ver qué hay de nuevo!
        </p>
        <Link
          href="/menu"
          className="bg-black text-white px-8 py-4 rounded-full font-bold hover:bg-zinc-800 transition-colors shadow-md active:scale-95"
        >
          Explorar el Menú
        </Link>
      </main>
    );
  }

  // =========================================================================
  // 2. VISTA PRINCIPAL DEL CARRITO ACTIVO
  // =========================================================================
  return (
    <main className="min-h-screen bg-white pb-44 font-sans">

      {/* BARRA SUPERIOR FIJA DE NAVEGACIÓN */}
      <div className="bg-white sticky top-0 z-20 border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <Link
          href="/menu"
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Volver al menú"
        >
          <ArrowLeft size={24} className="text-zinc-900" />
        </Link>
        <h1 className="text-xl font-extrabold text-zinc-900">Tu Carrito</h1>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-6">

        {/* LISTADO DE ARTÍCULOS EN EL CARRITO */}
        <div className="space-y-6 mb-8">
          {items.map((item) => (
            <div
              key={item.cartItemId}
              className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100"
            >
              {/* Miniatura visual del producto */}
              <div
                className="w-20 h-20 bg-cover bg-center rounded-xl shrink-0 bg-gray-200"
                style={{ backgroundImage: `url(${item.imageUrl})` }}
              />

              {/* Información y especificaciones del producto */}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-zinc-900 leading-tight">{item.name}</h3>
                  <button
                    onClick={() => removeItem(item.cartItemId)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 -mr-1 -mt-1"
                    aria-label={`Eliminar ${item.name}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Resumen de variantes y modificadores seleccionados */}
                <div className="text-sm text-zinc-500 mb-3 space-y-0.5">
                  {item.selectedVariant && <p>• {item.selectedVariant.name}</p>}
                  {item.selectedPreferences?.map((pref) => (
                    <p key={pref.id}>• {pref.name}</p>
                  ))}
                </div>

                {/* Precio acumulado por línea y selector de cantidad */}
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-extrabold text-zinc-900">
                    ${(item.calculatedPrice * item.quantity).toLocaleString('es-CO')}
                  </span>

                  <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm">
                    <button
                      onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors active:scale-90"
                      aria-label="Disminuir cantidad"
                    >
                      <Minus size={14} />
                    </button>

                    <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>

                    <button
                      onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors active:scale-90"
                      aria-label="Aumentar cantidad"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* RESUMEN FINANCIERO DEL PEDIDO */}
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-8">
          <h3 className="font-bold text-lg text-zinc-900 mb-4">Resumen del pedido</h3>
          <div className="flex justify-between font-extrabold text-xl text-zinc-900 mt-2 pt-4 border-t border-gray-200">
            <span>Total</span>
            <span>${cartTotal.toLocaleString('es-CO')}</span>
          </div>
        </div>

      </div>

      {/* BARRA INFERIOR PERSISTENTE DE ACCIÓN */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 pb-6 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">

          {/* BOTÓN PRIMARIO: Paso a la pasarela y formulario de entrega */}
          <Link
            href="/checkout"
            className="w-full bg-black text-white text-lg font-bold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg active:scale-95"
          >
            Ir a Pagar • ${cartTotal.toLocaleString('es-CO')}
          </Link>

          {/* BOTÓN SECUNDARIO: Retorno fluido a la selección de productos */}
          <Link
            href="/menu"
            className="w-full text-lg font-bold py-3.5 rounded-full flex items-center justify-center gap-2 transition-all border-2 bg-white border-gray-200 text-zinc-900 hover:border-black active:scale-95"
          >
            Seguir comprando
          </Link>

        </div>
      </div>

    </main>
  );
}