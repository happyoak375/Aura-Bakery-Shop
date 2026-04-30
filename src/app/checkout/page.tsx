"use client";

import { getWompiSignature } from '../actions/wompi';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, MapPin, Store, Clock, CreditCard, AlertCircle, CalendarDays } from 'lucide-react';
import { useCartStore } from '../../lib/store';
import { Cormorant_Garamond } from 'next/font/google';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DEFAULT_DELIVERY_TIME_SLOTS, generateOrderNumber, fetchDeliveryConfig, DeliveryConfig } from '../../lib/api';
import { getAvailableDeliveryDates } from '../../lib/deliveryLogic';
import * as fbq from '../../lib/fpixel';

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ['600'] });

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDirect = searchParams.get('type') === 'direct';
  const { items, directPurchaseItem, getTotal, clearCart, setDirectPurchaseItem } = useCartStore();

  const checkoutItems = isDirect ? (directPurchaseItem ? [directPurchaseItem] : []) : items;
  const cartIdString = useMemo(() => JSON.stringify(checkoutItems), [checkoutItems]);

  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'wompi' | 'manual'>('wompi');

  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig | null>(null);
  const [availableDates, setAvailableDates] = useState<{ dateString: string, display: string }[]>([]);
  const [requiresAdvisor, setRequiresAdvisor] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState('');

  // PIXEL: Evento InitiateCheckout
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
  }, []); // Se ejecuta una sola vez al cargar la página

  useEffect(() => {
    setMounted(true);
    const loadConfig = async () => {
      const config = await fetchDeliveryConfig();
      if (config && checkoutItems.length > 0) {
        setDeliveryConfig(config);
        const result = getAvailableDeliveryDates(checkoutItems, config);
        setRequiresAdvisor(result.requiresAdvisor);
        setAvailableDates(result.dates);

        if (result.dates.length > 0) {
          setSelectedDate(prev => prev || result.dates[0].dateString);
        }
        if (result.requiresAdvisor) setPaymentMethod('manual');
      }
    };
    loadConfig();
  }, [cartIdString]);

  const finalTotal = getTotal(isDirect) + (deliveryMethod === 'delivery' ? 10000 : 0);

  const handleProcessOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDate = isCustomDate ? customDate : selectedDate;
    if (paymentMethod === 'wompi' && !requiresAdvisor && (!finalDate || !selectedTime)) {
      alert("Por favor selecciona una fecha y hora."); return;
    }

    setIsSubmitting(true);
    const targetTab = window.open('about:blank', '_blank');
    try {
      const orderNumber = await generateOrderNumber();
      const orderId = `ORD-${orderNumber}`;
      const deliveryDateString = requiresAdvisor ? 'Definir con asesor' : `${finalDate} (${selectedTime})`;

      await runTransaction(db, async (t) => {
        t.set(doc(db, 'orders', orderId), {
          orderNumber, customerName: name || 'Sin nombre', customerPhone: phone || 'Sin teléfono',
          deliveryMethod, address: deliveryMethod === 'delivery' ? address : null,
          deliveryDate: deliveryDateString, items: checkoutItems, totalAmount: finalTotal,
          paymentMethod, status: 'pending', createdAt: serverTimestamp()
        });
      });

      if (isDirect) setDirectPurchaseItem(null); else clearCart();

      if (paymentMethod === 'wompi') {
        const amountInCents = Math.round(finalTotal * 100);
        const signature = await getWompiSignature(orderId, amountInCents);
        const params = new URLSearchParams({
          'public-key': process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '',
          'currency': 'COP', 'amount-in-cents': amountInCents.toString(),
          'reference': orderId, 'signature:integrity': signature,
          'redirect-url': `${window.location.origin}/success`
        });
        const url = `https://checkout.wompi.co/p/?${params.toString()}`;
        if (targetTab) targetTab.location.href = url; else window.location.href = url;
      } else {
        if (targetTab) targetTab.close();
        router.push('/success');
      }
    } catch (err) {
      if (targetTab) targetTab.close();
      setIsSubmitting(false);
    }
  };

  if (!mounted || checkoutItems.length === 0) return null;

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <h1 className={`text-2xl mb-8 ${cormorant.className}`}>Finalizar pedido</h1>
      <form onSubmit={handleProcessOrder} className="space-y-6">
        {/* Date Dropdown */}
        <div>
          <label className="text-xs font-bold lowercase mb-2 block">Fecha de entrega</label>
          <select
            value={isCustomDate ? 'custom' : selectedDate}
            onChange={(e) => {
              if (e.target.value === 'custom') setIsCustomDate(true);
              else { setIsCustomDate(false); setSelectedDate(e.target.value); }
            }}
            className="w-full bg-gray-50 p-4 rounded-xl border border-gray-100 outline-none"
          >
            {availableDates.map(d => <option key={d.dateString} value={d.dateString}>{d.display}</option>)}
            <option value="custom">📅 Otra fecha futura...</option>
          </select>
        </div>

        {/* DYNAMIC TIME DROPDOWN */}
        {!requiresAdvisor && (
          <div>
            <label className="text-xs font-bold lowercase mb-2 block">Jornada</label>
            <select
              required
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full bg-gray-50 p-4 rounded-xl border border-gray-100 outline-none"
            >
              <option value="">Selecciona una jornada...</option>
              {deliveryConfig?.deliveryWindows.map(win => (
                <option key={win} value={win}>{win}</option>
              ))}
            </select>
          </div>
        )}

        {/* Submit Button */}
        <button type="submit" disabled={isSubmitting} className="w-full bg-black text-white py-4 rounded-full font-bold">
          {isSubmitting ? 'procesando...' : 'confirmar pedido'}
        </button>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return <Suspense fallback={<p>Cargando...</p>}><CheckoutForm /></Suspense>;
}