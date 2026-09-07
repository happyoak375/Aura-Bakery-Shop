"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShoppingBag, Clock, CheckCircle2, Lock, X } from 'lucide-react';
import { fetchFeaturedProducts, getLocalProductImage } from '../lib/api';
import { Product } from '../lib/mockData';
import { useAuthStore } from '../lib/store';
import { Cormorant_Garamond } from 'next/font/google';

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ['400', '500', '600']
});

export default function Home() {
  const router = useRouter();
  // const { login } = useAuthStore();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- SECRET ENTRANCE STATE ---
  // const [tapCount, setTapCount] = useState(0);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    const loadFeaturedProducts = async () => {
      const featured = await fetchFeaturedProducts();
      setFeaturedProducts(featured);
      setIsLoading(false);
    };
    loadFeaturedProducts();
  }, []);

  // --- SECRET STAFF ENTRANCE ---
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    if (tapCount >= 3) {
      setTapCount(0);
      // Redirect straight to the new Firebase Login Portal
      router.push('/admin/login');
    }

    const timer = setTimeout(() => setTapCount(0), 2000);
    return () => clearTimeout(timer);
  }, [tapCount, router]);

  // // --- SECRET TRIGGER LOGIC ---
  // useEffect(() => {
  //   if (tapCount >= 3) {
  //     setShowPinModal(true);
  //     setTapCount(0);
  //   }
  //   // Reset taps if they don't tap 3 times fast enough
  //   const timeout = setTimeout(() => setTapCount(0), 1500);
  //   return () => clearTimeout(timeout);
  // }, [tapCount]);

  // const handlePinSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   const success = login(pin);
  //   if (success) {
  //     setShowPinModal(false);
  //     router.push('/admin'); // Redirect to the Central Admin Hub
  //   } else {
  //     setPinError(true);
  //     setPin('');
  //   }
  // };

  return (
    <main className="min-h-screen bg-gray-50 pb-32 font-sans">
      {/* HERO SECTION */}
      <section className="relative pt-32 pb-36 px-6 overflow-hidden min-h-[60vh] flex items-center">
        <img
          src="/images/aura-pasteis-de-nata-banner.jpg"
          alt="Aura Bakery Hero Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className={`text-5xl md:text-6xl mb-4 text-white tracking-wide leading-[1.2] drop-shadow-md ${cormorant.className}`}>
            Del mundo. Hecha a nuestra manera.
          </h1>

          {/* THE SECRET TRIGGER */}
          <p
            onClick={() => setTapCount(prev => prev + 1)}
            className="text-lg text-white/80 font-light mb-10 max-w-lg mx-auto tracking-wide cursor-default select-none transition-opacity active:opacity-50"
          >
            Pastelería + Café
          </p>

          <Link
            href="/menu"
            className="inline-block bg-white text-black px-12 py-4 rounded-full text-lg font-medium tracking-wide hover:bg-zinc-100 transition-all shadow-xl active:scale-95"
          >
            ordenar ahora
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white py-16 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className={`text-3xl text-center mb-10 text-zinc-900 ${cormorant.className}`}>
            ¿Cómo funciona?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-zinc-900"><ShoppingBag size={28} /></div>
              <h3 className="font-medium text-zinc-900 mb-2">1. Pides</h3>
              <p className="text-zinc-500 text-sm font-light">Elige tus postres y selecciona tu ventana de entrega.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-zinc-900"><Clock size={28} /></div>
              <h3 className="font-medium text-zinc-900 mb-2">2. Preparamos</h3>
              <p className="text-zinc-500 text-sm font-light">Horneamos lotes exactos basados en la demanda.</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-zinc-900"><CheckCircle2 size={28} /></div>
              <h3 className="font-medium text-zinc-900 mb-2">3. Recibes</h3>
              <p className="text-zinc-500 text-sm font-light">Disfruta tus postres frescos, hechos para ti.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS PREVIEW */}
      <section className="max-w-4xl mx-auto px-6 mt-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className={`text-3xl text-zinc-900 ${cormorant.className}`}>Populares hoy</h2>
          <Link href="/menu" className="text-zinc-500 font-medium tracking-wide flex items-center gap-1 hover:text-black transition-colors">
            ver todo <ArrowRight size={18} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            <div className="col-span-2 text-center py-8 text-zinc-400 font-light text-sm animate-pulse">cargando populares...</div>
          ) : featuredProducts.length > 0 ? (
            featuredProducts.map((product) => {
              const localImage = getLocalProductImage(product.name);
              return (
                <Link
                  href={`/menu/${product.id}`}
                  key={product.id}
                  className="bg-white rounded-3xl p-4 flex items-center gap-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow active:scale-95"
                >
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
                    <img
                      src={localImage}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-zinc-900 text-lg leading-tight mb-1 tracking-tight">{product.name}</h3>
                    <p className="text-zinc-500/90 text-sm line-clamp-1 mb-2 font-light">{product.description}</p>
                    <div className="font-medium text-zinc-900">Desde ${product.basePrice.toLocaleString('es-CO')}</div>
                  </div>
                  <div className="bg-gray-50 py-1.5 px-3 rounded-full text-zinc-900 hover:bg-black hover:text-white transition-colors border border-gray-200">
                    <span className="text-xs font-medium whitespace-nowrap">+ agregar</span>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="col-span-2 text-center py-8 text-zinc-400 font-light text-sm">No hay productos destacados por el momento.</div>
          )}
        </div>
      </section>

      {/* --- SECRET PIN MODAL ---
      {showPinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => { setShowPinModal(false); setPinError(false); setPin(''); }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-black">
                <Lock size={28} />
              </div>
              <h2 className="text-2xl font-extrabold mb-1">Acceso Restringido</h2>
              <p className="text-gray-500 text-sm mb-6">Ingresa el PIN de seguridad del equipo de Aura Taller.</p>

              <form onSubmit={handlePinSubmit} className="w-full">
                <input
                  type="password"
                  autoFocus
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setPinError(false); }}
                  placeholder="••••"
                  className={`w-full text-center text-3xl tracking-[1em] p-4 rounded-2xl border-2 focus:outline-none transition-colors ${pinError ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200 focus:border-black'}`}
                  maxLength={4}
                />
                {pinError && <p className="text-red-500 text-sm mt-2 font-medium">PIN Incorrecto</p>}

                <button
                  type="submit"
                  className="w-full bg-black text-white font-bold py-4 rounded-full mt-6 hover:bg-zinc-800 transition active:scale-95 shadow-lg"
                >
                  Desbloquear Sistema
                </button>
              </form>
            </div>
          </div>
        </div>
      )} */}
    </main>
  );
}