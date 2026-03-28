"use client";

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Store, CreditCard, MessageCircle, AlertTriangle } from 'lucide-react';
import { useCartStore } from '../../lib/store';
import { MOCK_GLOBAL_CONFIG, mockWindows } from '../../lib/mockData';

// Componente interno que maneja la lógica (separado para usar Suspense con useSearchParams)
function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 1. LECTURA DEL MODO DIRECTO (El requerimiento de tu cliente)
  const isDirectMode = searchParams.get('mode') === 'direct';
  
  const { items, directPurchaseItem, getTotal, getMostRestrictiveAvailability } = useCartStore();

  // Definimos qué productos vamos a cobrar (los del carrito o el directo)
  const checkoutItems = isDirectMode 
    ? (directPurchaseItem ? [directPurchaseItem] : []) 
    : items;
  
  const subtotal = getTotal(isDirectMode);
  const restrictiveType = getMostRestrictiveAvailability(isDirectMode);

  // ESTADOS DEL FORMULARIO
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [city, setCity] = useState(MOCK_GLOBAL_CONFIG.areaMetropolitanaDropdown[0]);
  const [address, setAddress] = useState('');
  
  // 2. REGLA DE COBRO DE ENVÍO
  const shippingFee = deliveryMethod === 'delivery' ? MOCK_GLOBAL_CONFIG.flat_delivery_fee : 0;
  const total = subtotal + shippingFee;

  // 3. REGLA DEL ÁREA METROPOLITANA
  const isOutOfBounds = deliveryMethod === 'delivery' && city === 'Otra ciudad (Fuera de cobertura)';

  // Si recargan la página en modo directo y se borró el estado temporal, los devolvemos al menú
  if (checkoutItems.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">No hay productos para procesar</h2>
        <Link href="/menu" className="text-blue-600 underline">Volver al menú</Link>
      </div>
    );
  }

  // Generador de mensaje de WhatsApp para casos especiales
  const getWhatsAppLink = (reason: string) => {
    const msg = encodeURIComponent(`Hola, estaba intentando comprar en la web pero ${reason}. ¿Me pueden ayudar con mi pedido?`);
    return `https://wa.me/${MOCK_GLOBAL_CONFIG.whatsapp_number}?text=${msg}`;
  };

  const handleSimulatePayment = () => {
    // En el futuro real, aquí abrimos el widget de Wompi. Por ahora, vamos a success.
    router.push('/success');
  };

  return (
    <div className="max-w-2xl mx-auto pb-32">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-zinc-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Checkout</h1>
      </div>

      {/* Resumen Rápido */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 className="font-bold text-zinc-900 mb-4 border-b border-gray-100 pb-2">Resumen de compra</h2>
        <ul className="space-y-2 mb-4">
          {checkoutItems.map(item => (
            <li key={item.cartItemId} className="flex justify-between text-sm text-zinc-600 font-medium">
              <span>{item.quantity}x {item.name} {item.selectedVariant ? `(${item.selectedVariant.name})` : ''}</span>
              <span>${(item.calculatedPrice * item.quantity).toLocaleString('es-CO')}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between text-sm font-bold text-zinc-500 mb-1">
          <span>Subtotal</span>
          <span>${subtotal.toLocaleString('es-CO')}</span>
        </div>
        {deliveryMethod === 'delivery' && (
          <div className="flex justify-between text-sm font-bold text-zinc-500 mb-3">
            <span>Domicilio (Tarifa Fija)</span>
            <span>${shippingFee.toLocaleString('es-CO')}</span>
          </div>
        )}
        <div className="flex justify-between text-xl font-extrabold text-zinc-900 pt-3 border-t border-gray-100">
          <span>Total a pagar</span>
          <span>${total.toLocaleString('es-CO')}</span>
        </div>
      </div>

      {/* Método de Entrega */}
      <div className="mb-6">
        <h2 className="font-bold text-zinc-900 mb-3 ml-1">¿Cómo deseas recibirlo?</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setDeliveryMethod('delivery')}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
              deliveryMethod === 'delivery' ? 'border-black bg-zinc-50' : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <MapPin size={24} className={`mb-2 ${deliveryMethod === 'delivery' ? 'text-black' : 'text-zinc-400'}`} />
            <span className={`font-bold ${deliveryMethod === 'delivery' ? 'text-black' : 'text-zinc-500'}`}>Domicilio</span>
            <span className="text-xs font-bold text-zinc-400">+$8.900</span>
          </button>
          
          <button
            onClick={() => setDeliveryMethod('pickup')}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
              deliveryMethod === 'pickup' ? 'border-black bg-zinc-50' : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <Store size={24} className={`mb-2 ${deliveryMethod === 'pickup' ? 'text-black' : 'text-zinc-400'}`} />
            <span className={`font-bold ${deliveryMethod === 'pickup' ? 'text-black' : 'text-zinc-500'}`}>Recoger en tienda</span>
            <span className="text-xs font-bold text-green-500">Gratis</span>
          </button>
        </div>
      </div>

      {/* Formulario de Dirección (Solo si es Delivery) */}
      {deliveryMethod === 'delivery' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6 animate-in fade-in slide-in-from-top-4">
          <h2 className="font-bold text-zinc-900 mb-4">Datos de entrega</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1">Ciudad / Municipio</label>
              <select 
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-black"
              >
                {MOCK_GLOBAL_CONFIG.areaMetropolitanaDropdown.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="Otra ciudad (Fuera de cobertura)">Otra ciudad (Fuera de cobertura)</option>
              </select>
            </div>

            {!isOutOfBounds && (
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Dirección completa</label>
                <input 
                  type="text" 
                  placeholder="Ej: Carrera 43A # 1-50, Apto 201"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bloqueador de Fuera de Cobertura */}
      {isOutOfBounds ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center animate-in fade-in zoom-in-95">
          <AlertTriangle size={32} className="text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-amber-900 mb-2">Fuera del Área Metropolitana</h3>
          <p className="text-amber-800 text-sm mb-6 font-medium">
            Por ahora nuestras entregas normales están disponibles solo en el Área Metropolitana. Si quieres, nuestro equipo puede ayudarte a revisar una opción especial de envío.
          </p>
          <a 
            href={getWhatsAppLink('mi dirección está fuera del Área Metropolitana')}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-amber-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors shadow-md"
          >
            <MessageCircle size={20} /> Hablar con un asesor
          </a>
        </div>
      ) : (
        /* Botonera de Pago Normal */
        <div className="space-y-3">
          <button 
            onClick={handleSimulatePayment}
            className="w-full bg-black text-white text-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg active:scale-95"
          >
            <CreditCard size={20} /> Pagar online con Wompi
          </button>
          
          <a 
            href={getWhatsAppLink(`prefiero confirmar el pago por transferencia de mi pedido de $${total}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-white text-zinc-700 border-2 border-gray-200 text-base font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:border-black transition-colors active:scale-95"
          >
            <MessageCircle size={18} /> Pagar con transferencia (Asesor)
          </a>
        </div>
      )}

    </div>
  );
}

// Exportamos la página envuelta en Suspense (Requisito estricto de Next.js para usar useSearchParams)
export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-gray-50 pt-6 px-6">
      <Suspense fallback={<div className="text-center py-20 font-bold">Cargando tu orden...</div>}>
        <CheckoutForm />
      </Suspense>
    </main>
  );
}