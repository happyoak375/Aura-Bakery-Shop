"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useCartStore } from '../../lib/store';

export default function CartPage() {
  const { items, updateQuantity } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) return null;

  // Calculate the total price directly from the store items
  const totalAmount = items.reduce((total, item) => total + (item.price * item.quantity), 0);

  // EMPTY STATE: If they navigate here with an empty cart
  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-12 flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-extrabold text-zinc-900 mb-4">Tu carrito está vacío</h1>
        <p className="text-zinc-500 mb-8 font-medium">Aún no has agregado ningún postre delicioso.</p>
        <Link 
          href="/menu"
          className="bg-black text-white px-8 py-4 rounded-full font-bold hover:bg-zinc-800 transition-colors"
        >
          Ir al menú
        </Link>
      </main>
    );
  }

  // ACTIVE CART STATE
  return (
    <main className="min-h-screen bg-gray-50 pb-32 pt-6 px-6">
      <div className="max-w-2xl mx-auto">
        
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/menu" className="p-2 -ml-2 text-zinc-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
            Tu Carrito
          </h1>
        </div>

        {/* Cart Items List */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.id} className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                
                <div className="flex-1">
                  <h3 className="font-bold text-zinc-900 text-lg leading-tight">{item.name}</h3>
                  <p className="font-extrabold text-zinc-900 mt-1 text-lg">
                    ${(item.price * item.quantity).toLocaleString('es-CO')}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-4 bg-gray-50 rounded-full p-1.5 border border-gray-200">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-2 text-zinc-500 hover:text-black transition-colors active:scale-90"
                  >
                    {/* If quantity is 1, show a trash can instead of a minus sign to indicate removal */}
                    {item.quantity === 1 ? <Trash2 size={18} /> : <Minus size={18} />}
                  </button>
                  <span className="font-bold w-6 text-center text-zinc-900">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-2 text-zinc-500 hover:text-black transition-colors active:scale-90"
                  >
                    <Plus size={18} />
                  </button>
                </div>

              </li>
            ))}
          </ul>
        </div>

        {/* Subtotal Summary */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8 flex justify-between items-center text-xl font-extrabold text-zinc-900">
          <span>Subtotal</span>
          <span>${totalAmount.toLocaleString('es-CO')}</span>
        </div>

        {/* Checkout CTA */}
        <Link 
          href="/checkout"
          className="w-full block text-center bg-black text-white text-xl font-bold py-4 rounded-full hover:bg-zinc-800 transition-colors shadow-lg active:scale-95"
        >
          Continuar pedido
        </Link>

      </div>
    </main>
  );
}