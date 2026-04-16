/**
 * @fileoverview Secure Checkout & Order Processing
 */

"use client";

import { getWompiSignature } from '../actions/wompi';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, MapPin, Store, Clock, CreditCard } from 'lucide-react';
import { useCartStore } from '../../lib/store';
import { Cormorant_Garamond } from 'next/font/google';

import { collection, getDocs, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ['600']
});

interface TimeSlot {
  id: string;
  label: string;
  maxCapacity: number;
  currentOrders: number;
  isActive: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotal, clearCart } = useCartStore();

  const [mounted, setMounted] = useState(false);

  // --- Customer Data State ---
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [notes, setNotes] = useState('');

  // --- Operational State ---
  const [timeSlot, setTimeSlot] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'wompi' | 'manual'>('wompi');

  // --- Database & Loading State ---
  const [dbTimeSlots, setDbTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchTimeSlots = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'time_slots'));
        const slotsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TimeSlot[];
        setDbTimeSlots(slotsData);
      } catch (error) {
        console.error("Error fetching time slots:", error);
      } finally {
        setIsLoadingSlots(false);
      }
    };
    fetchTimeSlots();
  }, []);

  const subTotal = getTotal();
  const deliveryFee = deliveryMethod === 'delivery' ? 10000 : 0;
  const finalTotal = subTotal + deliveryFee;

  useEffect(() => {
    if (mounted && items.length === 0) {
      router.push('/menu');
    }
  }, [mounted, items, router]);

  if (!mounted || items.length === 0) return null;

  // Determinar si los campos son obligatorios basado en el método de pago
  const isWompi = paymentMethod === 'wompi';

  const handleProcessOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar horario SOLO si es por Wompi
    if (isWompi && !timeSlot) {
      alert("Por favor selecciona una ventana de entrega para tu pago.");
      return;
    }

    setIsSubmitting(true);

    try {
      const newOrderRef = doc(collection(db, 'orders'));
      const orderId = newOrderRef.id;

      await runTransaction(db, async (transaction) => {
        // Solo verificamos y actualizamos la capacidad del horario si el usuario seleccionó uno
        if (timeSlot) {
          const timeSlotRef = doc(db, 'time_slots', timeSlot);
          const timeSlotDoc = await transaction.get(timeSlotRef);

          if (!timeSlotDoc.exists()) {
            throw new Error("El horario no existe.");
          }

          const currentData = timeSlotDoc.data() as TimeSlot;

          if (currentData.currentOrders >= currentData.maxCapacity) {
            throw new Error("Lo sentimos, este horario se acaba de llenar.");
          }

          transaction.update(timeSlotRef, {
            currentOrders: currentData.currentOrders + 1
          });
        }

        // Guardamos la orden, independientemente de si hay horario o no
        transaction.set(newOrderRef, {
          customerName: name || 'Sin nombre',
          customerPhone: phone || 'Sin teléfono',
          deliveryMethod,
          address: deliveryMethod === 'delivery' ? address : null,
          neighborhood: deliveryMethod === 'delivery' ? neighborhood : null,
          timeSlotId: timeSlot || 'Por definir con asesor',
          items: items,
          subTotal,
          deliveryFee,
          totalAmount: finalTotal,
          notes,
          paymentMethod,
          paymentStatus: 'PENDIENTE',
          orderStatus: 'NUEVO',
          createdAt: serverTimestamp()
        });
      });

      clearCart();

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

        window.location.href = `https://checkout.wompi.co/p/?${params.toString()}`;

      } else {
        // --- MANUAL FALLBACK (WHATSAPP) ---
        const itemsList = items.map(item => {
          let text = `• ${item.quantity}x ${item.name} ($${(item.calculatedPrice * item.quantity).toLocaleString('es-CO')})`;
          if (item.selectedVariant) text += `\n  - ${item.selectedVariant.name}`;
          if (item.selectedPreferences?.length) {
            text += `\n  - ${item.selectedPreferences.map(p => p.name).join(', ')}`;
          }
          return text;
        }).join('\n');

        const selectedSlotLabel = dbTimeSlots.find(s => s.id === timeSlot)?.label;

        let message = `¡Hola Aura Bakery! Quisiera que me ayudes a completar mi pedido: \n\n`;
        message += `*ID:* ${orderId.substring(0, 6).toUpperCase()}\n`;
        message += `*VENTANA:* ${selectedSlotLabel?.toUpperCase() || 'Por definir con asesor'}\n\n`;
        message += `*MI ORDEN:*\n${itemsList}\n\n`;
        message += `*SUBTOTAL:* $${subTotal.toLocaleString('es-CO')}\n`;
        message += `*DOMICILIO:* $${deliveryFee.toLocaleString('es-CO')}\n`;
        message += `*TOTAL:* $${finalTotal.toLocaleString('es-CO')}\n\n`;

        message += `*DATOS:*\n`;
        if (name) message += `- Nombre: ${name}\n`;
        if (phone) message += `- Teléfono: ${phone}\n`;
        message += `- Método: ${deliveryMethod === 'delivery' ? 'Domicilio' : 'Recoger'}\n`;
        if (deliveryMethod === 'delivery' && address) message += `- Dirección: ${address}\n`;
        if (deliveryMethod === 'delivery' && neighborhood) message += `- Barrio: ${neighborhood}\n`;
        if (notes) message += `\n*NOTAS:* ${notes}`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappNumber = "573173285832";

        window.location.href = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
      }

    } catch (error: any) {
      console.error("Transaction failed: ", error);
      alert(error.message || "Hubo un error al procesar tu pedido. Por favor intenta de nuevo.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-32 font-sans">

      <div className="bg-white sticky top-0 z-20 border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <Link href="/cart" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-zinc-900" />
        </Link>
        <h1 className={`text-2xl text-zinc-900 ${cormorant.className}`}>finalizar pedido</h1>
      </div>

      <div className="max-w-xl mx-auto px-6 pt-6">
        <form onSubmit={handleProcessOrder} className="space-y-6">

          {/* Time Slot Selector */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={20} className="text-zinc-900" />
              <h2 className="font-bold text-lg text-zinc-900">
                ventana de entrega {isWompi && <span className="text-red-500">*</span>}
              </h2>
            </div>

            <div className="space-y-3">
              {isLoadingSlots ? (
                <div className="text-zinc-400 text-sm font-light animate-pulse">cargando horarios...</div>
              ) : dbTimeSlots.length === 0 ? (
                <div className="text-red-500 text-sm font-light">no hay ventanas disponibles hoy.</div>
              ) : (
                dbTimeSlots.map((slot) => {
                  const isFull = slot.currentOrders >= slot.maxCapacity;
                  const isAvailable = slot.isActive && !isFull;

                  return (
                    <label
                      key={slot.id}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${!isAvailable ? 'border-gray-50 bg-gray-50 opacity-60 cursor-not-allowed' :
                        timeSlot === slot.id ? 'border-black bg-zinc-50 cursor-pointer' : 'border-gray-100 hover:border-gray-200 cursor-pointer'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="timeSlot"
                          required={isWompi}
                          value={slot.id}
                          checked={timeSlot === slot.id}
                          onChange={(e) => setTimeSlot(e.target.value)}
                          disabled={!isAvailable}
                          className="w-4 h-4 accent-black disabled:accent-gray-300"
                        />
                        <span className={`font-medium ${!isAvailable ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>
                          {slot.label}
                        </span>
                      </div>

                      {!isAvailable && (
                        <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">agotado</span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('wompi')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl font-medium transition-colors ${paymentMethod === 'wompi' ? 'bg-[#002B56] text-white' : 'text-zinc-500 hover:bg-gray-50'
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

          {/* Delivery Method Toggle */}
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

          {/* User Details Form */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="font-bold text-lg text-zinc-900 mb-2">tus datos</h2>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                nombre completo {isWompi && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                required={isWompi}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                placeholder="ej. camila rojas"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                teléfono (whatsapp) {isWompi && <span className="text-red-500">*</span>}
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
                    dirección de entrega {isWompi && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={isWompi}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    placeholder="calle, carrera, apto..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                    barrio {isWompi && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={isWompi}
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all resize-none h-20"
                placeholder="detalles adicionales..."
              />
            </div>
          </div>

          {/* Resumen de la Orden */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-zinc-900 mb-4">resumen</h3>
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

          {/* Dynamic Submit Button */}
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
    </main>
  );
}