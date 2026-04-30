"use client";

import { getWompiSignature } from '../actions/wompi';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, MapPin, Store, Clock, CreditCard, AlertCircle, CalendarDays } from 'lucide-react';
import { useCartStore } from '../../lib/store';
import { Cormorant_Garamond } from 'next/font/google';

import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DEFAULT_DELIVERY_TIME_SLOTS, generateOrderNumber, fetchDeliveryConfig, DeliveryConfig } from '../../lib/api';
import { getAvailableDeliveryDates } from '../../lib/deliveryLogic';

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ['600'] });

// 1. El componente del Formulario (Sin export default)
function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDirect = searchParams.get('type') === 'direct';

  const { items, directPurchaseItem, getTotal, clearCart, updateQuantity, setDirectPurchaseItem } = useCartStore();
  const checkoutItems = isDirect ? (directPurchaseItem ? [directPurchaseItem] : []) : items;

  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Customer Data State ---
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [notes, setNotes] = useState('');

  // --- Operational State ---
  const [paymentMethod, setPaymentMethod] = useState<'wompi' | 'manual'>('wompi');

  // --- Dynamic Delivery State ---
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig | null>(null);
  const [availableDates, setAvailableDates] = useState<{ dateString: string, display: string }[]>([]);
  const [requiresAdvisor, setRequiresAdvisor] = useState(false);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // NEW: State for Custom Future Date
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState('');

  // FIX: Crear una "foto" del carrito para que React no se confunda y borre las fechas
  const cartDependencies = JSON.stringify(checkoutItems);

  // Load Config & Calculate Dates
  useEffect(() => {
    setMounted(true);

    const loadConfigAndDates = async () => {
      const config = await fetchDeliveryConfig();
      if (config && checkoutItems.length > 0) {
        setDeliveryConfig(config);

        const result = getAvailableDeliveryDates(checkoutItems, config);
        setRequiresAdvisor(result.requiresAdvisor);
        setAvailableDates(result.dates);

        // FIX: Solo asignar la fecha si el usuario no ha escogido una
        if (result.dates.length > 0) {
          setSelectedDate(prev => prev ? prev : result.dates[0].dateString);
        }

        if (result.requiresAdvisor) {
          setPaymentMethod('manual');
        }
      }
    };

    if (checkoutItems.length > 0) {
      loadConfigAndDates();
    }
  }, [cartDependencies]); // Usar la dependencia corregida aquí

  const subTotal = getTotal(isDirect);
  const deliveryFee = deliveryMethod === 'delivery' ? 10000 : 0;
  const finalTotal = subTotal + deliveryFee;

  useEffect(() => {
    if (mounted && checkoutItems.length === 0) {
      router.push('/menu');
    }
  }, [mounted, checkoutItems, router]);

  if (!mounted || checkoutItems.length === 0) return null;

  const isWompi = paymentMethod === 'wompi';
  const deliveryTimeSlots = deliveryConfig?.timeSlots?.length ? deliveryConfig.timeSlots : DEFAULT_DELIVERY_TIME_SLOTS;

  const handleProcessOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // Determine the final date based on what they selected
    const finalSelectedDate = isCustomDate ? customDate : selectedDate;

    if (isWompi && !requiresAdvisor && (!finalSelectedDate || !selectedTime)) {
      alert("Por favor selecciona una fecha y hora de entrega.");
      return;
    }

    setIsSubmitting(true);
    const targetTab = window.open('about:blank', '_blank');

    try {
      const orderNumber = await generateOrderNumber();
      const orderId = `ORD-${orderNumber}`;
      const newOrderRef = doc(db, 'orders', orderId);

      const deliveryDateString = requiresAdvisor ? 'Definir con asesor' : `${finalSelectedDate} (${selectedTime})`;

      await runTransaction(db, async (transaction) => {
        transaction.set(newOrderRef, {
          orderNumber,
          customerName: name || 'Sin nombre',
          customerPhone: phone || 'Sin teléfono',
          deliveryMethod,
          address: deliveryMethod === 'delivery' ? address : null,
          neighborhood: deliveryMethod === 'delivery' ? neighborhood : null,
          deliveryDate: deliveryDateString,
          items: checkoutItems,
          subTotal,
          deliveryFee,
          totalAmount: finalTotal,
          notes,
          paymentMethod,
          paymentStatus: 'PENDIENTE',
          orderStatus: 'NUEVO',
          status: 'pending',
          createdAt: serverTimestamp()
        });
      });

      if (isDirect) setDirectPurchaseItem(null); else clearCart();

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

      } else {
        const itemsList = checkoutItems.map(item => {
          let text = `• ${item.quantity}x ${item.name} ($${(item.calculatedPrice * item.quantity).toLocaleString('es-CO')})`;
          if (item.selectedVariant) text += `\n  - ${item.selectedVariant.name}`;
          if (item.selectedPreferences?.length) {
            text += `\n  - ${item.selectedPreferences.map(p => p.name).join(', ')}`;
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
      console.error("Transaction failed: ", error);
      alert(error.message || "Hubo un error al procesar tu pedido. Por favor intenta de nuevo.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-white sticky top-0 z-20 border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <Link href={isDirect ? "/menu" : "/cart"} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-zinc-900" />
        </Link>
        <h1 className={`text-2xl text-zinc-900 ${cormorant.className}`}>finalizar pedido</h1>
      </div>

      <div className="max-w-xl mx-auto px-6 pt-6">
        <form onSubmit={handleProcessOrder} className="space-y-6">

          {/* 1. Payment Method Selector */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-2">
            <button
              type="button"
              disabled={requiresAdvisor}
              onClick={() => setPaymentMethod('wompi')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl font-medium transition-colors ${requiresAdvisor ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400' :
                paymentMethod === 'wompi' ? 'bg-[#002B56] text-white' : 'text-zinc-500 hover:bg-gray-50'
                }`}
            >
              <CreditCard size={20} />
              <span className="text-xs">tarjeta / pse</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('manual')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl font-medium transition-colors ${paymentMethod === 'manual' ? 'bg-[#25D366] text-white' : 'text-zinc-500 hover:bg-gray-50'
                }`}
            >
              <MessageCircle size={20} />
              <span className="text-xs">hablar con asesor</span>
            </button>
          </div>

          {/* 2. Delivery Method Toggle */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-2">
            <button
              type="button"
              onClick={() => setDeliveryMethod('delivery')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-colors ${deliveryMethod === 'delivery' ? 'bg-black text-white' : 'text-zinc-500 hover:bg-gray-50'
                }`}
            >
              <MapPin size={18} /> domicilio
            </button>
            <button
              type="button"
              onClick={() => setDeliveryMethod('pickup')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-colors ${deliveryMethod === 'pickup' ? 'bg-black text-white' : 'text-zinc-500 hover:bg-gray-50'
                }`}
            >
              <Store size={18} /> recoger
            </button>
          </div>

          {/* 3. Smart Date & Time Picker */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={20} className="text-zinc-900" />
              <h2 className="font-bold text-lg text-zinc-900">¿Cuándo lo necesitas?</h2>
            </div>

            {requiresAdvisor ? (
              <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex gap-3">
                <AlertCircle className="text-orange-500 flex-shrink-0" size={20} />
                <p className="text-sm text-orange-800">
                  Tu pedido incluye productos personalizados que requieren validación. Por favor, completa tus datos y te contactaremos por WhatsApp para coordinar la entrega.
                </p>
              </div>
            ) : (
              <>
                {/* Main Date Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Fecha disponible <span className="text-red-500">*</span></label>
                  <select
                    required={isWompi && !isCustomDate}
                    value={isCustomDate ? 'custom' : selectedDate}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomDate(true);
                      } else {
                        setIsCustomDate(false);
                        setSelectedDate(e.target.value);
                      }
                    }}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all cursor-pointer capitalize"
                  >
                    <option value="" disabled>Selecciona un día...</option>
                    {availableDates.map(date => (
                      <option key={date.dateString} value={date.dateString}>
                        {date.display}
                      </option>
                    ))}
                    <option value="custom">📅 Otra fecha futura...</option>
                  </select>
                </div>

                {/* Custom Date Picker (Shows only if "Otra fecha futura" is selected) */}
                {isCustomDate && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                      <CalendarDays size={14} /> Selecciona tu fecha <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required={isWompi && isCustomDate}
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      min={availableDates.length > 0 ? availableDates[availableDates.length - 1].dateString : undefined}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-zinc-900"
                    />
                  </div>
                )}

                {/* Time Dropdown (Standard Shifts) */}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Jornada <span className="text-red-500">*</span></label>
                  <select
                    required={isWompi}
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all cursor-pointer"
                  >
                    <option value="" disabled>Selecciona una jornada...</option>
                    {deliveryTimeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* 4. User Details Form */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="font-bold text-lg text-zinc-900 mb-2">tus datos</h2>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">nombre completo <span className="text-red-500">*</span></label>
              <input
                type="text" required={isWompi} value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                placeholder="ej. camila rojas"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">teléfono (whatsapp) <span className="text-red-500">*</span></label>
              <input
                type="tel" required={isWompi} value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                placeholder="+57 300 000 0000"
              />
            </div>

            {deliveryMethod === 'delivery' ? (
              <div className="space-y-4 pt-2 border-t border-gray-50 mt-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">dirección de entrega <span className="text-red-500">*</span></label>
                  <input
                    type="text" required={isWompi} value={address} onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    placeholder="calle, carrera, apto..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">barrio <span className="text-red-500">*</span></label>
                  <input
                    type="text" required={isWompi} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    placeholder="ej. el poblado"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl mt-4">
                <p className="text-sm text-zinc-800">
                  <span className="font-bold flex items-center gap-2 mb-1"><MapPin size={16} /> Punto de recogida:</span>
                  Circular 73B # 39 B - 147 Primer parque de Laureles.
                </p>
                <p className="text-xs text-zinc-500 mt-2">No se te cobrará domicilio.</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1 mt-4">notas</label>
              <textarea
                value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all resize-none h-20"
                placeholder="detalles adicionales..."
              />
            </div>
          </div>

          {/* 5. Order Summary */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-zinc-900 mb-4">resumen</h3>

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
                      <button type="button" onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="px-2.5 py-1 text-zinc-500 hover:bg-gray-100 rounded-l-lg transition-colors">-</button>
                      <span className="px-2 font-medium text-zinc-900 min-w-[1.5rem] text-center text-xs">{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="px-2.5 py-1 text-zinc-500 hover:bg-gray-100 rounded-r-lg transition-colors">+</button>
                    </div>
                    <span className="font-medium text-zinc-900 min-w-[4.5rem] text-right">
                      ${(item.calculatedPrice * item.quantity).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between text-zinc-500 text-sm mb-2">
              <span>Subtotal</span><span>${subTotal.toLocaleString('es-CO')}</span>
            </div>

            <div className="flex justify-between text-zinc-500 text-sm mb-4">
              <span>{deliveryMethod === 'delivery' ? 'Domicilio' : 'Recoger en tienda'}</span>
              <span>{deliveryMethod === 'delivery' ? '+$10.000' : 'Gratis'}</span>
            </div>

            <div className="flex justify-between font-extrabold text-zinc-900 text-xl border-t border-gray-100 pt-4">
              <span>Total</span><span>${finalTotal.toLocaleString('es-CO')}</span>
            </div>
          </div>

          {/* 6. Dynamic Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full text-white text-lg font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${paymentMethod === 'wompi'
              ? 'bg-[#002B56] hover:bg-[#001f3e] shadow-blue-100'
              : 'bg-[#25D366] hover:bg-[#20bd5a] shadow-green-100'
              }`}
          >
            {isSubmitting ? 'procesando...' : paymentMethod === 'wompi' ? 'ir a pagar' : 'contáctanos por whatsapp'}
          </button>
        </form>
      </div>
    </>
  );
}

// 2. El export default con Suspense (Esto arregla el error de compilación de Next.js)
export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-gray-50 pb-32 font-sans">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-zinc-500 animate-pulse text-sm">cargando método de pago...</p>
        </div>
      }>
        <CheckoutForm />
      </Suspense>
    </main>
  );
}
