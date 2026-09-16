"use client";

/**
 * @fileoverview Pantalla de Confirmación y Estado de Pago (SuccessPage) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Confirmación de Pasarela Wompi: Captura los parámetros de consulta devueltos
 *    por el checkout ('status', 'reference', 'amount-in-cents').
 * 2. Analítica y Conversión (Meta Pixel):
 *    - Dispara el evento 'Purchase' únicamente en transacciones aprobadas.
 *    - Normaliza el valor convirtiendo los centavos a pesos colombianos (COP).
 *    - Emplea 'transaction_id' para prevenir duplicidad de eventos si el cliente recarga.
 * 3. Manejo de Errores de Transacción: Despliega una interfaz diferenciada en caso de
 *    estados de error/rechazo ('DECLINED', 'VOIDED', 'ERROR') con opción de reintento.
 * 4. Soporte Omnicanal: Provee un punto de contacto directo por WhatsApp ante dudas
 *    o solicitudes de modificación de la orden.
 */

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, MessageCircle, ArrowLeft, RefreshCcw } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';
import * as fbq from '../../lib/fpixel';

// Tipografía editorial para encabezados de estado
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ['500', '600']
});

/**
 * Componente interno que evalúa los parámetros de la URL y renderiza el estado de la compra.
 */
function SuccessContent() {
  const searchParams = useSearchParams();

  // Parámetros inyectados por la pasarela de pagos o el enrutamiento interno
  const status = searchParams.get('status');
  const orderId = searchParams.get('reference');
  const amountCents = searchParams.get('amount-in-cents');

  // Evaluación de transacciones fallidas o declinadas por el procesador bancario
  const isError = status === 'DECLINED' || status === 'VOIDED' || status === 'ERROR';

  /**
   * TRACKING DE EVENTO: Purchase (Meta Pixel)
   * Se ejecuta al montar si la transacción no fue declinada.
   * Si la compra fue manual vía WhatsApp (sin 'amount-in-cents'), envía undefined
   * para evitar reportar valores en 0.
   */
  useEffect(() => {
    if (!isError) {
      const purchaseValue = amountCents ? Number(amountCents) / 100 : 0;

      fbq.event('Purchase', {
        value: purchaseValue > 0 ? purchaseValue : undefined,
        currency: 'COP',
        transaction_id: orderId || 'pedido_wa', // Previene doble conteo en Meta Pixel
        content_type: 'product'
      });
    }
  }, [isError, orderId, amountCents]);

  // =========================================================================
  // 1. ESTADO DE TRANSACCIÓN RECHAZADA O ERROR
  // =========================================================================
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
          La transacción no fue aprobada por la entidad financiera.
        </p>

        {/* CANAL DE ASISTENCIA */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-10 max-w-sm w-full text-left space-y-3">
          <div className="flex items-start gap-3">
            <MessageCircle size={20} className="text-zinc-400 shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-600 font-light leading-relaxed">
              Si lo deseas puedes intentarlo nuevamente con otro medio de pago, o si necesitas asistencia puedes escribirnos:
              <span className="block mt-1 font-medium text-zinc-900">+57 317 328 5832</span>
            </p>
          </div>
        </div>

        {/* REINTENTO DE CHECKOUT */}
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

  // =========================================================================
  // 2. ESTADO DE PEDIDO CONFIRMADO / RECIBIDO
  // =========================================================================
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-24 h-24 bg-green-50/80 rounded-full flex items-center justify-center mb-8 text-green-500 border border-green-100 shadow-sm">
        <CheckCircle2 size={48} strokeWidth={2} />
      </div>

      <h1 className={`text-4xl md:text-5xl text-zinc-900 mb-4 tracking-tight ${cormorant.className}`}>
        Confirmando tu pedido...
      </h1>

      <p className="text-zinc-500 text-lg mb-8 max-w-sm leading-relaxed font-light">
        Tu pedido está siendo procesado por nuestro equipo. Te enviaremos las actualizaciones al número de contacto registrado.
      </p>

      {/* INFORMACIÓN DE CONTACTO DE SOPORTE */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-10 max-w-sm w-full text-left space-y-3">
        <div className="flex items-start gap-3">
          <MessageCircle size={20} className="text-green-500 shrink-0 mt-0.5" />
          <p className="text-sm text-zinc-600 font-light leading-relaxed">
            Si necesitas hacer algún cambio en los detalles o realizar una solicitud especial, escríbenos directamente a nuestra línea de WhatsApp:
            <span className="block mt-1 font-medium text-zinc-900">+57 317 328 5832</span>
          </p>
        </div>
      </div>

      {/* RETORNO AL CATÁLOGO */}
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

/**
 * Componente principal envuelto en Suspense.
 * Requerido por Next.js App Router para componentes que lean parámetros de búsqueda (useSearchParams).
 */
export default function SuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <p className="text-zinc-400 animate-pulse">Cargando detalles del pedido...</p>
      </main>
    }>
      <SuccessContent />
    </Suspense>
  );
}