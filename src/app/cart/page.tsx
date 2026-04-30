/**
 * @fileoverview Shopping Cart Page
 * Displays the user's selected items, calculates the subtotal, and provides
 * quantity controls. It also handles the "Empty Cart" fallback state to guide
 * users back to the catalog.
 */

"use client";

import Link from 'next/link';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../lib/store';

export default function CartPage() {
  /**
   * STATE SUBSCRIPTION:
   * We destructure exactly the properties and methods we need from Zustand.
   * By using the getTotal() method from the store, we ensure the UI always
   * displays the mathematically correct sum, preventing front-end pricing bugs.
   */
  const { items, removeItem, updateQuantity, getTotal } = useCartStore();
  const cartTotal = getTotal();

  // ==========================================
  // 1. EMPTY STATE RENDER
  // ==========================================

  // UX Best Practice: Never leave the user at a dead end. If the cart is empty,
  // provide a clear call-to-action (CTA) to send them back to the menu.
  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6 text-gray-400">
          <ShoppingBag size={40} />
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-900 mb-2">Tu carrito está vacío</h1>
        <p className="text-zinc-500 mb-8 max-w-sm">
          Parece que aún no has agregado ninguna de nuestras delicias. ¡Ve a ver qué hay de nuevo!
        </p>
        <Link
          href="/menu"
          className="bg-black text-white px-8 py-4 rounded-full font-bold hover:bg-zinc-800 transition-colors shadow-md"
        >
          Explorar el Menú
        </Link>
      </main>
    );
  }

  // ==========================================
  // 2. ACTIVE CART RENDER
  // ==========================================
  return (
    <main className="min-h-screen bg-white pb-44">

      {/* --- TOP HEADER --- */}
      <div className="bg-white sticky top-0 z-20 border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <Link href="/menu" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-zinc-900" />
        </Link>
        <h1 className="text-xl font-extrabold text-zinc-900">Tu Carrito</h1>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-6">

        {/* --- ITEMS LIST --- */}
        <div className="space-y-6 mb-8">
          {items.map((item) => (
            <div key={item.cartItemId} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">

              {/* Image Thumbnail */}
              <div
                className="w-20 h-20 bg-cover bg-center rounded-xl shrink-0 bg-gray-200"
                style={{ backgroundImage: `url(${item.imageUrl})` }}
              />

              {/* Item Details */}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-zinc-900 leading-tight">{item.name}</h3>
                  <button
                    onClick={() => removeItem(item.cartItemId)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 -mr-1 -mt-1"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Variants & Preferences Summary */}
                <div className="text-sm text-zinc-500 mb-3">
                  {item.selectedVariant && <p>• {item.selectedVariant.name}</p>}
                  {item.selectedPreferences?.map(pref => (
                    <p key={pref.id}>• {pref.name}</p>
                  ))}
                </div>

                {/* Price and Quantity Controls */}
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-extrabold text-zinc-900">
                    ${(item.calculatedPrice * item.quantity).toLocaleString('es-CO')}
                  </span>

                  <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-sm">
                    <button
                      onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <Minus size={14} />
                    </button>

                    <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>

                    <button
                      onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* --- ORDER SUMMARY --- */}
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-8">
          <h3 className="font-bold text-lg text-zinc-900 mb-4">Resumen del pedido</h3>
          <div className="flex justify-between font-extrabold text-xl text-zinc-900 mt-2 pt-4 border-t border-gray-200">
            <span>Total</span>
            <span>${cartTotal.toLocaleString('es-CO')}</span>
          </div>
        </div>
      </div>

      {/* --- STICKY ACTION BUTTONS --- */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 pb-6 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">

          {/* BOTÓN PRINCIPAL: Ir a Pagar */}
          <Link
            href="/checkout"
            className="w-full bg-black text-white text-lg font-bold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg active:scale-95"
          >
            Ir a Pagar • ${cartTotal.toLocaleString('es-CO')}
          </Link>

          {/* BOTÓN SECUNDARIO: Seguir comprando */}
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