"use client";

/**
 * @fileoverview Formulario y Pasarela de Checkout (CheckoutPage) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Detección de Modo de Compra: Soporta flujo regular (carrito completo) o
 *    compra directa express (?type=direct) desde la ficha de producto.
 * 2. Cálculo Inteligente de Fechas (Lead Time): Evalúa las restricciones de
 *    preparación (asap, 24h, 48h, asesor) y los horarios configurados en el sistema.
 * 3. Analítica de Conversión: Dispara el evento 'InitiateCheckout' de Meta Pixel.
 * 4. Integración Omnicanal con Firestore: Procesa la orden a través de `processPOSOrder`,
 *    descontando stock mediante recetas BOM y enrutándola al KDS (Cocina).
 * 5. Doble Ruta de Cobro:
 *    - Wompi: Generación de firma criptográfica y redirección a pasarela bancaria.
 *    - WhatsApp / Asesor: Serialización estructurada de la orden para validación manual.
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MessageCircle,
  MapPin,
  Store,
  Clock,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

import { useCartStore } from '../../lib/store';
import { getWompiSignature } from '../actions/wompi';
import { fetchDeliveryConfig, DeliveryConfig, processPOSOrder } from '../../lib/api';
import { getAvailableDeliveryDates } from '../../lib/deliveryLogic';
import * as fbq from '../../lib/fpixel';

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ['600']
});

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDirect = searchParams.get('type') === 'direct';

  // Acceso al estado global de la bolsa y compra directa
  const {
    items,
    directPurchaseItem,
    getTotal,
    clearCart,
    updateQuantity,
    setDirectPurchaseItem
  } = useCartStore();

  // Si es compra express toma únicamente el ítem aislado; de lo contrario toma el carrito normal
  const checkoutItems = isDirect ? (directPurchaseItem ? [directPurchaseItem] : []) : items;

  const [mounted, setMounted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Información del cliente
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState<string>('');
  const [neighborhood, setNeighborhood] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Método de pago: Pasarela electrónica (Wompi) o Coordinación manual (WhatsApp)
  const [paymentMethod, setPaymentMethod] = useState<'wompi' | 'manual'>('wompi');

  // Parámetros y reglas de entrega dinámica
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig | null>(null);
  const [availableDates, setAvailableDates] = useState<{ dateString: string; display: string }[]>([]);
  const [requiresAdvisor, setRequiresAdvisor] = useState<boolean>(false);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  /**
   * TRACKING DE EVENTO: InitiateCheckout (Meta Pixel)
   * Se detona una sola vez al cargar la página si existen productos en el pedido.
   */
  useEffect(() => {
    setMounted(true);
    if (checkoutItems.length > 0) {
      fbq.event('InitiateCheckout', {
        content_ids: checkoutItems.map(item => item.id),
        content_type: 'product',
        value: getTotal(isDirect),
        currency: 'COP',
        num_items: checkoutItems.reduce((acc, item) => acc + item.quantity, 0)
      });
    }
  }, []);

  /**
   * CÁLCULO DE FECHAS SEGÚN TIEMPOS DE PRODUCCIÓN:
   * Evalúa la configuración del negocio (días de cierre, cortes de horario)
   * y los productos en la orden para determinar la primera fecha hábil.
   */
  useEffect(() => {
    const loadConfigAndDates = async () => {
      try {
        const config = await fetchDeliveryConfig();
        if (config && checkoutItems.length > 0) {
          setDeliveryConfig(config);

          const result = getAvailableDeliveryDates(checkoutItems, config);
          setRequiresAdvisor(result.requiresAdvisor);
          setAvailableDates(result.dates);

          // Preselecciona el primer día hábil sugerido
          if (result.dates.length > 0) {
            setSelectedDate(result.dates[0].dateString);
          }

          // Si requiere asesor (ej. tortas a la medida), fuerza el método de pago asistido
          if (result.requiresAdvisor) {
            setPaymentMethod('manual');
          }
        }
      } catch (error) {
        console.error("Error al calcular fechas de entrega:", error);
      }
    };

    if (checkoutItems.length > 0) {
      loadConfigAndDates();
    }
  }, [checkoutItems]);

  // Totales financieros
  const subTotal = getTotal(isDirect);
  const deliveryFee = deliveryMethod === 'delivery' ? 10000 : 0;
  const finalTotal = subTotal + deliveryFee;

  // Redirección de seguridad si la bolsa queda vacía
  useEffect(() => {
    if (mounted && checkoutItems.length === 0) {
      router.push('/menu');
    }
  }, [mounted, checkoutItems, router]);

  if (!mounted || checkoutItems.length === 0) return null;

  const isWompi = paymentMethod === 'wompi';

  /**
   * PROCESAMIENTO Y ENRUTAMIENTO DE LA ORDEN:
   * 1. Valida campos obligatorios de entrega.
   * 2. Envía la orden al motor unificado `processPOSOrder` para registro y deducción BOM.
   * 3. Enruta a la pasarela Wompi o formatea el mensaje de WhatsApp.
   */
  const handleProcessOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isWompi && !requiresAdvisor && (!selectedDate || !selectedTime)) {
      alert("Por favor selecciona una fecha y jornada de entrega.");
      return;
    }

    setIsSubmitting(true);
    // Abrir ventana en blanco anticipadamente para evitar bloqueos del navegador en redirecciones externas
    const targetTab = window.open('about:blank', '_blank');

    try {
      const deliveryDateString = requiresAdvisor ? 'Definir con asesor' : `${selectedDate} (${selectedTime})`;

      // Formateo de la orden compatible con el motor de base de datos
      const orderData = {
        totalAmount: finalTotal,
        paymentMethod: paymentMethod === 'wompi' ? ('card' as const) : ('transfer' as const),
        status: 'pending' as const,
        source: 'web' as const, // Identifica la orden para la visualización en la comanda de cocina
        customerName: name || 'Sin nombre',
        customerPhone: phone || 'Sin teléfono',
        deliveryMethod,
        address: deliveryMethod === 'delivery' ? address : null,
        neighborhood: deliveryMethod === 'delivery' ? neighborhood : null,
        deliveryDate: deliveryDateString,
        notes,
        subTotal,
        deliveryFee,
        orderStatus: 'NUEVO', // Estado inicial para el tablero de comandas

        items: checkoutItems.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.calculatedPrice,
          name: item.name
        }))
      };

      // Ejecución en backend: deducción atómica de inventario y guardado en Firestore
      const result = await processPOSOrder(orderData);
      const orderId = result.orderId;
      const orderNumber = parseInt(orderId.replace('POS-', '').replace('ORD-', ''), 10) || orderId;

      // Limpieza del estado de compra
      if (isDirect) {
        setDirectPurchaseItem(null);
      } else {
        clearCart();
      }

      // RUTA A: Checkout electrónico vía Wompi
      if (paymentMethod === 'wompi') {
        const amountInCents = Math.round(finalTotal * 100);
        const signature = await getWompiSignature(orderId, amountInCents);
        const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY?.trim() || '';
        const redirectUrl = `${window.location.origin}/success`;

        const params = new URLSearchParams({
          'public-key': publicKey,
          'currency': 'COP',
          'amount-in-cents': amountInCents.toString(),
          'reference': orderId,
          'signature:integrity': signature,
          'redirect-url': redirectUrl,
        });

        const targetUrl = `https://checkout.wompi.co/p/?${params.toString()}`;
        if (targetTab) targetTab.location.href = targetUrl; else window.location.href = targetUrl;
        router.push('/success');

        // RUTA B: Enlace estructurado a WhatsApp
      } else {
        const itemsList = checkoutItems.map(item => {
          let text = `• ${item.quantity}x ${item.name} ($${(item.calculatedPrice * item.quantity).toLocaleString('es-CO')})`;
          if (item.selectedVariant) text += `\n   - ${item.selectedVariant.name}`;
          if (item.selectedPreferences?.length) {
            text += `\n   - ${item.selectedPreferences.map(p => p.name).join(', ')}`;
          }
          return text;
        }).join('\n');

        let message = `¡Hola Aura Bakery! Quisiera que me ayudes a completar mi pedido: \n\n`;
        message += `*ID:* #${orderNumber}\n`;
        message += `*CUÁNDO:* ${deliveryDateString}\n`;
        message += `*MI ORDEN:*\n${itemsList}\n\n`;
        message += `*SUBTOTAL:* $${subTotal.toLocaleString('es-CO')}\n`;
        message += `*DOMICILIO:* $${deliveryFee.toLocaleString('es-CO')}\n`;
        message += `*TOTAL:* $${finalTotal.toLocaleString('es-CO')}\n\n`;
        message += `*DATOS:*\n`;
        if (name) message += `- Nombre: ${name}\n`;
        if (phone) message += `- Teléfono: ${phone}\n`;
        if (notes) message += `\n*NOTAS:* ${notes}`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappNumber = "573173285832";

        const targetUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
        if (targetTab) targetTab.location.href = targetUrl; else window.location.href = targetUrl;
        router.push('/success');
      }

    } catch (error: any) {
      if (targetTab) targetTab.close();
      console.error("Error al procesar la orden:", error);
      alert(error.message || "Hubo un error al procesar tu pedido. Por favor intenta de nuevo.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* BARRA SUPERIOR DE RETORNO */}
      <div className="bg-white sticky top-0 z-20 border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <Link
          href={isDirect ? "/menu" : "/cart"}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Volver atrás"
        >
          <ArrowLeft size={24} className="text-zinc-900" />
        </Link>
        <h1 className={`text-2xl text-zinc-900 ${cormorant.className}`}>
          finalizar pedido
        </h1>
      </div>

      <div className="max-w-xl mx-auto px-6 pt-6 font-sans">
        <form onSubmit={handleProcessOrder} className="space-y-6">

          {/* 1. SELECTOR DE MÉTODO DE PAGO */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-2">
            <button
              type="button"
              disabled={requiresAdvisor}
              onClick={() => setPaymentMethod('wompi')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl font-medium transition-colors ${requiresAdvisor
                  ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400'
                  : paymentMethod === 'wompi'
                    ? 'bg-[#002B56] text-white'
                    : 'text-zinc-500 hover:bg-gray-50'
                }`}
            >
              <CreditCard size={20} />
              <span className="text-xs font-bold">Tarjeta / PSE</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('manual')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl font-medium transition-colors ${paymentMethod === 'manual'
                  ? 'bg-[#25D366] text-white'
                  : 'text-zinc-500 hover:bg-gray-50'
                }`}
            >
              <MessageCircle size={20} />
              <span className="text-xs font-bold">Hablar con asesor</span>
            </button>
          </div>

          {/* 2. SELECTOR DE TIPO DE ENTREGA */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-2">
            <button
              type="button"
              onClick={() => setDeliveryMethod('delivery')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-colors ${deliveryMethod === 'delivery' ? 'bg-black text-white' : 'text-zinc-500 hover:bg-gray-50'
                }`}
            >
              <MapPin size={18} /> Domicilio
            </button>
            <button
              type="button"
              onClick={() => setDeliveryMethod('pickup')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-colors ${deliveryMethod === 'pickup' ? 'bg-black text-white' : 'text-zinc-500 hover:bg-gray-50'
                }`}
            >
              <Store size={18} /> Recoger en tienda
            </button>
          </div>

          {/* 3. SELECTOR DINÁMICO DE FECHA Y FRANJA HORARIA */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={20} className="text-zinc-900" />
              <h2 className="font-bold text-lg text-zinc-900">¿Cuándo lo necesitas?</h2>
            </div>

            {requiresAdvisor ? (
              <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex gap-3">
                <AlertCircle className="text-orange-500 flex-shrink-0" size={20} />
                <p className="text-sm text-orange-800 leading-relaxed">
                  Tu pedido incluye productos personalizados que requieren validación de producción. Por favor completa tus datos y te contactaremos por WhatsApp para coordinar la fecha exacta.
                </p>
              </div>
            ) : (
              <>
                {/* Desplegable de fechas hábiles calculadas */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                    Fecha disponible <span className="text-red-500">*</span>
                  </label>
                  <select
                    required={isWompi}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all cursor-pointer capitalize text-zinc-800"
                  >
                    <option value="" disabled>Selecciona un día...</option>
                    {availableDates.map(date => (
                      <option key={date.dateString} value={date.dateString}>
                        {date.display}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Desplegable de franjas horarias */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                    Jornada de entrega <span className="text-red-500">*</span>
                  </label>
                  <select
                    required={isWompi}
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all cursor-pointer text-zinc-800"
                  >
                    <option value="" disabled>Selecciona una jornada...</option>
                    <option value="Mañana (8:00 AM - 12:00 PM)">Mañana (8:00 AM - 12:00 PM)</option>
                    <option value="Tarde (1:00 PM - 5:00 PM)">Tarde (1:00 PM - 5:00 PM)</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* 4. DATOS DE CONTACTO Y DIRECCIÓN */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="font-bold text-lg text-zinc-900 mb-2">Tus datos</h2>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Nombre completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required={isWompi}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                placeholder="ej. Camila Rojas"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Teléfono (WhatsApp) <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required={isWompi}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                placeholder="+57 300 000 0000"
              />
            </div>

            {deliveryMethod === 'delivery' ? (
              <div className="space-y-4 pt-2 border-t border-gray-50 mt-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                    Dirección de entrega <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={isWompi}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    placeholder="Calle, carrera, apto..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                    Barrio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={isWompi}
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    placeholder="ej. Laureles / El Poblado"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl mt-4">
                <p className="text-sm text-zinc-800">
                  <span className="font-bold flex items-center gap-2 mb-1">
                    <MapPin size={16} /> Punto de recogida:
                  </span>
                  Circular 73B # 39 B - 147, Laureles, Medellín.
                </p>
                <p className="text-xs text-zinc-500 mt-2">No se te cobrará costo de domicilio.</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1 mt-4">
                Notas especiales
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all resize-none h-20"
                placeholder="Indicaciones para el domiciliario o especificaciones..."
              />
            </div>
          </div>

          {/* 5. RESUMEN DEL PEDIDO */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-zinc-900 mb-4">Resumen</h3>

            <div className="space-y-4 mb-6 border-b border-gray-100 pb-4">
              {checkoutItems.map((item) => (
                <div key={item.cartItemId} className="flex justify-between items-center text-sm">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-zinc-900 leading-tight">{item.name}</p>
                    {item.selectedVariant && (
                      <p className="text-xs text-zinc-500 mt-0.5">{item.selectedVariant.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-gray-200 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                        className="px-2.5 py-1 text-zinc-500 hover:bg-gray-100 rounded-l-lg transition-colors"
                        aria-label="Restar cantidad"
                      >
                        -
                      </button>
                      <span className="px-2 font-medium text-zinc-900 min-w-[1.5rem] text-center text-xs">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        className="px-2.5 py-1 text-zinc-500 hover:bg-gray-100 rounded-r-lg transition-colors"
                        aria-label="Sumar cantidad"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-medium text-zinc-900 min-w-[4.5rem] text-right">
                      ${(item.calculatedPrice * item.quantity).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between text-zinc-500 text-sm mb-2">
              <span>Subtotal</span>
              <span>${subTotal.toLocaleString('es-CO')}</span>
            </div>

            <div className="flex justify-between text-zinc-500 text-sm mb-4">
              <span>{deliveryMethod === 'delivery' ? 'Domicilio' : 'Recoger en tienda'}</span>
              <span>{deliveryMethod === 'delivery' ? '+$10.000' : 'Gratis'}</span>
            </div>

            <div className="flex justify-between font-extrabold text-zinc-900 text-xl border-t border-gray-100 pt-4">
              <span>Total</span>
              <span>${finalTotal.toLocaleString('es-CO')}</span>
            </div>
          </div>

          {/* 6. BOTÓN DINÁMICO DE ENVÍO */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full text-white text-lg font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${paymentMethod === 'wompi'
                ? 'bg-[#002B56] hover:bg-[#001f3e] shadow-blue-100'
                : 'bg-[#25D366] hover:bg-[#20bd5a] shadow-green-100'
              }`}
          >
            {isSubmitting
              ? 'Procesando...'
              : paymentMethod === 'wompi'
                ? 'Ir a pagar'
                : 'Contáctanos por WhatsApp'
            }
          </button>
        </form>
      </div>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-gray-50 pb-32 font-sans">
      {/* Se envuelve en Suspense debido al hook de navegación useSearchParams() */}
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-zinc-500 animate-pulse text-sm">Cargando método de pago...</p>
        </div>
      }>
        <CheckoutForm />
      </Suspense>
    </main>
  );
}