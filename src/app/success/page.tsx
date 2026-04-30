"use client";

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, MessageCircle, ArrowLeft, RefreshCcw } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';
import * as fbq from '../../lib/fpixel';

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ['500', '600']
});

// 2. Move your logic into a separate internal component
function SuccessContent() {
  const searchParams = useSearchParams();

  const status = searchParams.get('status');
  const orderId = searchParams.get('reference');
  const amountCents = searchParams.get('amount-in-cents');
  const isError = status === 'DECLINED' || status === 'VOIDED' || status === 'ERROR';

  useEffect(() => {
    if (!isError) {
      fbq.event('Purchase', {
        value: amountCents ? Number(amountCents) / 100 : 0,
        currency: 'COP',
        transaction_id: orderId || 'manual_order',
        content_type: 'product'
      });
    }
  }, [isError, orderId, amountCents]);

  if (isError) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-24 h-24 bg-red-50/80 rounded-full flex items-center justify-center mb-8 text-red-500 border border-red-100 shadow-sm">
          <XCircle size={48} strokeWidth={2} />
        </div>

        <h1 className={`text-4xl md:text-5xl text-zinc-900 mb-4 tracking-tight ${cormorant.className}`}>
          No se pudo completar el pago.
        </h1>

        <p className="text-zinc-500 text-lg mb-8 max-w-sm leading-relaxed font-light">
          La transacción no fue aprobada.
        </p>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-10 max-w-sm w-full text-left space-y-3">
          <div className="flex items-start gap-3">
            <MessageCircle size={20} className="text-zinc-400 shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-600 font-light leading-relaxed">
              Si lo deseas puedes intentarlo nuevamente, o si necesitas ayuda puedes escribirnos:
              <span className="block mt-1 font-medium text-zinc-900">+57 317 328 5832</span>
            </p>
          </div>
        </div>

        <Link
          href="/checkout"
          className="w-full max-w-sm bg-black text-white px-8 py-4 rounded-full font-medium tracking-wide flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg active:scale-95"
        >
          <RefreshCcw size={18} />
          Intentar nuevamente
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-24 h-24 bg-green-50/80 rounded-full flex items-center justify-center mb-8 text-green-500 border border-green-100 shadow-sm">
        <CheckCircle2 size={48} strokeWidth={2} />
      </div>

      <h1 className={`text-4xl md:text-5xl text-zinc-900 mb-4 tracking-tight ${cormorant.className}`}>
        Confirmando tu pedido...
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
        className="w-full max-w-sm bg-black text-white px-8 py-4 rounded-full font-medium tracking-wide flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg active:scale-95"
      >
        <ArrowLeft size={18} />
        Volver al menú
      </Link>
    </main>
  );
}

// 3. The default export wraps the content in Suspense
export default function SuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-zinc-400 animate-pulse">Cargando detalles...</p>
      </main>
    }>
      <SuccessContent />
    </Suspense>
  );
}