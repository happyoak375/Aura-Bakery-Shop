"use client";

import Link from 'next/link';
import { CheckCircle2, MessageCircle, ArrowLeft } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

const cormorant = Cormorant_Garamond({ 
  subsets: ["latin"],
  weight: ['500', '600']
});

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      
      {/* Success Icon Animation */}
      <div className="w-24 h-24 bg-green-50/80 rounded-full flex items-center justify-center mb-8 text-green-500 border border-green-100 shadow-sm">
        <CheckCircle2 size={48} strokeWidth={2} />
      </div>

      <h1 className={`text-4xl md:text-5xl text-zinc-900 mb-4 tracking-tight lowercase ${cormorant.className}`}>
        ¡pedido enviado!
      </h1>
      
      <p className="text-zinc-500 text-lg mb-8 max-w-sm leading-relaxed font-light">
        Tu orden ha sido transferida a WhatsApp. Nuestro equipo te responderá en breve para confirmar el pago y la entrega.
      </p>

      {/* Helpful Info Box */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-10 max-w-sm w-full text-left space-y-3">
        <div className="flex items-start gap-3">
          <MessageCircle size={20} className="text-green-500 shrink-0 mt-0.5" />
          <p className="text-sm text-zinc-600 font-light leading-relaxed">
            Si cerraste WhatsApp por accidente, no te preocupes. Vuelve a armar tu carrito rápidamente en el menú.
          </p>
        </div>
      </div>

      {/* Return to Shop Button - Lowercase and medium weight */}
      <Link 
        href="/menu" 
        className="w-full max-w-sm bg-black text-white px-8 py-4 rounded-full font-medium tracking-wide flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg active:scale-95 lowercase"
      >
        <ArrowLeft size={18} />
        volver al menú
      </Link>
      
    </main>
  );
}