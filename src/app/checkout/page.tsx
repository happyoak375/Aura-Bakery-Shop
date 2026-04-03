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

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  
  // --- NEW: Payment Method State ---
  const [paymentMethod, setPaymentMethod] = useState<'wompi' | 'manual'>('wompi');

  // Database State
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

  const totalAmount = getTotal();

  useEffect(() => {
    if (mounted && items.length === 0) {
      router.push('/menu');
    }
  }, [mounted, items, router]);

  if (!mounted || items.length === 0) return null;

  const handleProcessOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!timeSlot) {
      alert("Por favor selecciona una ventana de entrega.");
      return;
    }

    setIsSubmitting(true);

    try {
      const timeSlotRef = doc(db, 'time_slots', timeSlot);
      // Generate the new order ID immediately (needed for Wompi reference)
      const newOrderRef = doc(collection(db, 'orders'));
      const orderId = newOrderRef.id;

      await runTransaction(db, async (transaction) => {
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

        transaction.set(newOrderRef, {
          customerName: name,
          customerPhone: phone,
          deliveryMethod,
          address: deliveryMethod === 'delivery' ? address : null,
          neighborhood: deliveryMethod === 'delivery' ? neighborhood : null,
          timeSlotId: timeSlot,
          items: items,
          totalAmount,
          notes,
          paymentMethod, // Guardamos el método seleccionado
          paymentStatus: 'pending', // Siempre inicia pendiente
          createdAt: serverTimestamp()
        });
      });

      // --- NEW: Split Routing Based on Payment Method ---
      clearCart(); // Clear cart for both methods once saved

     if (paymentMethod === 'wompi') {
        // Convert to cents safely
        const amountInCents = Math.round(totalAmount * 100);
        
        // 1. Pedimos al servidor que genere la firma criptográfica en secreto
        const signature = await getWompiSignature(orderId, amountInCents);

        // 2. Construimos la URL agregando el nuevo parámetro 'signature:integrity'
        const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY?.trim() || '';
        const redirectUrl = `${window.location.origin}/success`; 

        const params = new URLSearchParams({
          'public-key': publicKey,
          'currency': 'COP',
          'amount-in-cents': amountInCents.toString(),
          'reference': orderId, 
          'signature:integrity': signature, // ¡Este es el pase VIP de seguridad!
          'redirect-url': redirectUrl,
        });

        // 3. Enviamos al usuario a pagar
        window.location.href = `https://checkout.wompi.co/p/?${params.toString()}`;
      } else {
        // Send user to WhatsApp (Manual Flow)
        // ... (keep the rest of your WhatsApp code exactly as it is) ...
        // Send user to WhatsApp (Manual Flow)
        const itemsList = items.map(item => {
          let text = `• ${item.quantity}x ${item.name} ($${(item.calculatedPrice * item.quantity).toLocaleString('es-CO')})`;
          if (item.selectedVariant) text += `\n  - ${item.selectedVariant.name}`;
          if (item.selectedPreferences?.length) {
            text += `\n  - ${item.selectedPreferences.map(p => p.name).join(', ')}`;
          }
          return text;
        }).join('\n');

        const selectedSlotLabel = dbTimeSlots.find(s => s.id === timeSlot)?.label;

        const message = `*¡Hola Aura Bakery! Quisiera hacer un pedido:* 🥐☕\n\n` +
          `*ID:* ${orderId.substring(0,6).toUpperCase()}\n` +
          `*🕒 VENTANA DE ENTREGA:*\n${selectedSlotLabel?.toUpperCase()}\n\n` +
          `*🛒 MI ORDEN:*\n${itemsList}\n\n` +
          `*💰 TOTAL:* $${totalAmount.toLocaleString('es-CO')}\n\n` +
          `*👤 MIS DATOS:*\n` +
          `- Nombre: ${name}\n` +
          `- Teléfono: ${phone}\n` +
          `- Método: ${deliveryMethod === 'delivery' ? 'Envío a domicilio 🛵' : 'Recoger en tienda 🏪'}\n` +
          (deliveryMethod === 'delivery' ? `- Dirección: ${address}\n- Barrio: ${neighborhood}\n` : '') +
          (notes ? `\n*📝 NOTAS:* ${notes}\n` : '');

        const encodedMessage = encodeURIComponent(message);
        const whatsappNumber = "573173285832"; 
        
        // Abre WhatsApp y redirige la página actual a success
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
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={20} className="text-zinc-900" />
              <h2 className="font-bold text-lg text-zinc-900 lowercase">ventana de entrega</h2>
            </div>
            
            <div className="space-y-3">
              {isLoadingSlots ? (
                <div className="text-zinc-400 text-sm font-light lowercase animate-pulse">cargando horarios...</div>
              ) : dbTimeSlots.length === 0 ? (
                <div className="text-red-500 text-sm font-light lowercase">no hay ventanas disponibles hoy.</div>
              ) : (
                dbTimeSlots.map((slot) => {
                  const isFull = slot.currentOrders >= slot.maxCapacity;
                  const isAvailable = slot.isActive && !isFull;

                  return (
                    <label 
                      key={slot.id}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        !isAvailable ? 'border-gray-50 bg-gray-50 opacity-60 cursor-not-allowed' : 
                        timeSlot === slot.id ? 'border-black bg-zinc-50 cursor-pointer' : 'border-gray-100 hover:border-gray-200 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          name="timeSlot"
                          required
                          value={slot.id}
                          checked={timeSlot === slot.id}
                          onChange={(e) => setTimeSlot(e.target.value)}
                          disabled={!isAvailable}
                          className="w-4 h-4 accent-black disabled:accent-gray-300"
                        />
                        <span className={`font-medium lowercase ${!isAvailable ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>
                          {slot.label}
                        </span>
                      </div>
                      
                      {!isAvailable && (
                        <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded lowercase">agotado</span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-2">
            <button
              type="button"
              onClick={() => setDeliveryMethod('delivery')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-colors lowercase ${
                deliveryMethod === 'delivery' ? 'bg-black text-white' : 'text-zinc-500 hover:bg-gray-50'
              }`}
            >
              <MapPin size={18} /> domicilio
            </button>
            <button
              type="button"
              onClick={() => setDeliveryMethod('pickup')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-colors lowercase ${
                deliveryMethod === 'pickup' ? 'bg-black text-white' : 'text-zinc-500 hover:bg-gray-50'
              }`}
            >
              <Store size={18} /> recoger
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="font-bold text-lg text-zinc-900 mb-2 lowercase">tus datos</h2>
            
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">nombre completo</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all lowercase"
                placeholder="ej. camila rojas"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">teléfono (whatsapp)</label>
              <input 
                type="tel" 
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                placeholder="300 000 0000"
              />
            </div>

            {deliveryMethod === 'delivery' && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">dirección de entrega</label>
                  <input 
                    type="text" 
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all lowercase"
                    placeholder="calle, carrera, apto..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">barrio</label>
                  <input 
                    type="text" 
                    required
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all lowercase"
                    placeholder="ej. el poblado"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">notas (opcional)</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all resize-none h-20 lowercase"
                placeholder="detalles adicionales..."
              />
            </div>
          </div>

          {/* --- NEW: Payment Method Selector --- */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('wompi')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl font-medium transition-colors lowercase ${
                paymentMethod === 'wompi' ? 'bg-[#002B56] text-white' : 'text-zinc-500 hover:bg-gray-50'
              }`}
            >
              <CreditCard size={20} />
              <span className="text-xs">tarjeta / pse</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('manual')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl font-medium transition-colors lowercase ${
                paymentMethod === 'manual' ? 'bg-[#25D366] text-white' : 'text-zinc-500 hover:bg-gray-50'
              }`}
            >
              <MessageCircle size={20} />
              <span className="text-xs">nequi / whatsapp</span>
            </button>
          </div>

          {/* --- UPDATED: Dynamic Submit Button --- */}
          <button 
            type="submit"
            disabled={isSubmitting}
            className={`w-full text-white text-lg font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 mt-8 lowercase disabled:opacity-70 disabled:cursor-not-allowed ${
              paymentMethod === 'wompi' 
                ? 'bg-[#002B56] hover:bg-[#001f3e] shadow-blue-100' 
                : 'bg-[#25D366] hover:bg-[#20bd5a] shadow-green-100'
            }`}
          >
            {isSubmitting ? 'procesando...' : paymentMethod === 'wompi' ? 'pagar con wompi' : 'confirmar por whatsapp'}
          </button>
        </form>
      </div>
    </main>
  );
}