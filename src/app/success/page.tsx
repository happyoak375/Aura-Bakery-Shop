"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, MessageCircle, ArrowRight } from 'lucide-react';
import { useCartStore } from '../../lib/store';
import { CartItem } from '../../lib/store';

export default function SuccessPage() {
  const { items, getTotal, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  
  // We use local state to "freeze" the order details for the receipt,
  // allowing us to safely clear the global cart in the background.
  const [orderItems, setOrderItems] = useState<CartItem[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);

  useEffect(() => {
    setMounted(true);
    
    // If they arrive with items, save them locally, then wipe the global cart
    if (items.length > 0) {
      setOrderItems([...items]);
      setOrderTotal(getTotal());
      clearCart();
    }
  }, [items, getTotal, clearCart]);

  if (!mounted) return null;

  // Generate a dynamic WhatsApp link pre-filled with a message
  const bakeryPhone = "573000000000"; // Replace with the real Aura Bakery WhatsApp number
  const whatsappMessage = encodeURIComponent(
    `¡Hola! Acabo de realizar un pedido en Aura Bakery por $${orderTotal.toLocaleString('es-CO')}. ¿Me confirman que lo recibieron? 🍰`
  );
  const whatsappUrl = `https://wa.me/${bakeryPhone}?text=${whatsappMessage}`;

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Success Icon & Header */}
        <div className="flex justify-center mb-6">
          <div className="bg-green-50 p-4 rounded-full">
            <CheckCircle2 size={64} className="text-green-500" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-900 mb-2">¡Pedido Confirmado!</h1>
        <p className="text-zinc-500 font-medium mb-8">
          Tu pedido ha sido recibido y ya estamos preparando todo para ti.
        </p>

        {/* Order Summary Card */}
        {orderItems.length > 0 && (
          <div className="bg-gray-50 rounded-3xl p-6 text-left mb-8 border border-gray-100">
            <h2 className="font-bold text-zinc-900 mb-4 border-b border-gray-200 pb-2">Resumen de tu compra</h2>
            <ul className="space-y-3 mb-4">
              {orderItems.map((item) => (
                <li key={item.id} className="flex justify-between text-sm font-medium text-zinc-700">
                  <span>{item.quantity}x {item.name}</span>
                  <span>${(item.price * item.quantity).toLocaleString('es-CO')}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 font-extrabold text-zinc-900 text-lg">
              <span>Total pagado</span>
              <span>${orderTotal.toLocaleString('es-CO')}</span>
            </div>
          </div>
        )}

        {/* WhatsApp Handoff (The MVP Automation) */}
        <a 
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#25D366] text-white text-lg font-bold py-4 rounded-full flex items-center justify-center gap-3 hover:bg-[#20bd5a] transition-colors shadow-lg shadow-green-100 mb-4"
        >
          <MessageCircle size={24} />
          Escribir por WhatsApp
        </a>

        {/* Return to Home */}
        <Link 
          href="/"
          className="inline-flex items-center justify-center gap-2 text-zinc-500 font-bold hover:text-zinc-900 transition-colors py-4"
        >
          Volver al inicio <ArrowRight size={18} />
        </Link>

      </div>
    </main>
  );
}