"use client";

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, MessageCircle, ArrowLeft, RefreshCcw } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ['500', '600']
});

export default function SuccessPage() {
  const searchParams = useSearchParams();

  /**
   * Wompi Redirection Logic:
   * We look for the 'status' or 'id' parameter. If the status is DECLINED, 
   * VOIDED, or ERROR, we trigger the failure UI.
   */
  const status = searchParams.get('status');
  const isError = status === 'DECLINED' || status === 'VOIDED' || status === 'ERROR';

  if (isError) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center font-sans">

        {/* --- ERROR ICON --- */}
        <div className="w-24 h-24 bg-red-50/80 rounded-full flex items-center justify-center mb-8 text-red-500 border border-red-100 shadow-sm">
          <XCircle size={48} strokeWidth={2} />
        </div>

        <h1 className={`text-4xl md:text-5xl text-zinc-900 mb-4 tracking-tight ${cormorant.className}`}>
          No se pudo completar el pago.
        </h1>

        <p className="text-zinc-500 text-lg mb-8 max-w-sm leading-relaxed font-light">
          La transacción no fue aprobada.
        </p>

        {/* --- HELP BOX --- */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-10 max-w-sm w-full text-left space-y-3">
          <div className="flex items-start gap-3">
            <MessageCircle size={20} className="text-zinc-400 shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-600 font-light leading-relaxed">
              Si lo deseas puedes intentarlo nuevamente, o si necesitas ayuda puedes escribirnos:
              <span className="block mt-1 font-medium text-zinc-900">+57 317 328 5832</span>
            </p>
          </div>
        </div>

        {/* --- CTA --- */}
        <Link
          href="/checkout"
          className="w-full max-w-sm bg-black text-white px-8 py-4 rounded-full font-medium tracking-wide flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg active:scale-95 lowercase"
        >
          <RefreshCcw size={18} />
          Intentar nuevamente
        </Link>
      </main>
    );
  }

  // --- ORIGINAL SUCCESS UI ---
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-24 h-24 bg-green-50/80 rounded-full flex items-center justify-center mb-8 text-green-500 border border-green-100 shadow-sm">
        <CheckCircle2 size={48} strokeWidth={2} />
      </div>

      <h1 className={`text-4xl md:text-5xl text-zinc-900 mb-4 tracking-tight ${cormorant.className}`}>
        ¡Pedido confirmado!
      </h1>

      <p className="text-zinc-500 text-lg mb-8 max-w-sm leading-relaxed font-light">
        Tu pedido está siendo procesado por nuestro equipo. Te enviaremos los detalles al WhatsApp registrado.
      </p>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-10 max-w-sm w-full text-left space-y-3">
        <div className="flex items-start gap-3">
          <MessageCircle size={20} className="text-green-500 shrink-0 mt-0.5" />
          <p className="text-sm text-zinc-600 font-light leading-relaxed">
            Si necesitas hacer algún cambio o solicitud especial, puedes escribirnos al WhatsApp: +57 317 328 5832
          </p>
        </div>
      </div>

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