"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Store, Bike, Clock, CheckCircle2 } from 'lucide-react';
import { useCartStore } from '../../lib/store';
import { mockWindows } from '../../lib/mockData';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotal } = useCartStore();
  const [mounted, setMounted] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [address, setAddress] = useState('');
  const [selectedWindow, setSelectedWindow] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Protect the route: if cart is empty, don't let them stay on checkout
  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-4">Tu carrito está vacío</h1>
        <Link href="/menu" className="bg-black text-white px-6 py-3 rounded-full font-bold">Volver al menú</Link>
      </main>
    );
  }

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    // In Week 3, this is where the Wompi/MercadoPago integration will go.
    // For now, we simulate a successful payment and route to the success page.
    router.push('/success');
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-32 pt-6 px-6">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/cart" className="p-2 -ml-2 text-zinc-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Checkout</h1>
        </div>

        <form onSubmit={handlePayment} className="space-y-8">
          
          {/* 1. DATOS PERSONALES */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Tus Datos</h2>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Nombre completo" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-zinc-900 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all"
              />
              <input 
                type="tel" 
                placeholder="Teléfono (WhatsApp)" 
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-zinc-900 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all"
              />
            </div>
          </section>

          {/* 2. MÉTODO DE ENTREGA */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Método de entrega</h2>
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setMethod('pickup')}
                className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-colors ${
                  method === 'pickup' ? 'border-black bg-zinc-50 text-black' : 'border-gray-100 text-zinc-400 hover:border-gray-200'
                }`}
              >
                <Store size={24} />
                <span className="font-bold text-sm">Pickup</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod('delivery')}
                className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border-2 transition-colors ${
                  method === 'delivery' ? 'border-black bg-zinc-50 text-black' : 'border-gray-100 text-zinc-400 hover:border-gray-200'
                }`}
              >
                <Bike size={24} />
                <span className="font-bold text-sm">Delivery</span>
              </button>
            </div>

            {/* Conditionally show Address field if Delivery is selected */}
            {method === 'delivery' && (
              <input 
                type="text" 
                placeholder="Dirección de entrega" 
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-zinc-900 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all mt-2 animate-in fade-in slide-in-from-top-2"
              />
            )}
          </section>

          {/* 3. VENTANAS DE HORARIO (The Capacity Engine) */}
          <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <Clock size={20} /> Elige tu horario
            </h2>
            <div className="space-y-3">
              {mockWindows.map((window) => {
                const isSoldOut = window.bookedCount >= window.maxCapacity;
                
                return (
                  <label 
                    key={window.id}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSoldOut 
                        ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed' 
                        : selectedWindow === window.id 
                          ? 'border-black bg-zinc-50' 
                          : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedWindow === window.id ? 'border-black' : 'border-gray-300'
                      }`}>
                        {selectedWindow === window.id && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                      </div>
                      <span className={`font-bold ${isSoldOut ? 'text-zinc-400' : 'text-zinc-900'}`}>
                        {window.label}
                      </span>
                    </div>
                    {isSoldOut && (
                      <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-md">
                        Agotado
                      </span>
                    )}
                    {/* Hide the radio input visually but keep it for functionality */}
                    <input 
                      type="radio" 
                      name="deliveryWindow" 
                      value={window.id}
                      disabled={isSoldOut}
                      onChange={(e) => setSelectedWindow(e.target.value)}
                      className="hidden"
                      required
                    />
                  </label>
                );
              })}
            </div>
          </section>

          {/* 4. TOTAL & PAGO */}
          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-black text-white text-xl font-bold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedWindow} // Prevent payment if no window is selected
            >
              Pagar ${(getTotal() + (method === 'delivery' ? 5000 : 0)).toLocaleString('es-CO')}
            </button>
            {method === 'delivery' && (
              <p className="text-center text-zinc-500 text-sm mt-3 font-medium">
                Incluye $5.000 de costo de envío
              </p>
            )}
          </div>

        </form>
      </div>
    </main>
  );
}