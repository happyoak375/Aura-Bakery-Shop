"use client";

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, MessageCircle, ShoppingBag, Zap } from 'lucide-react';
import { mockProducts, ProductVariant, ProductPreference, AvailabilityType } from '../../../lib/mockData';
import { useCartStore, CartItem } from '../../../lib/store';

const getAvailabilityUI = (type: AvailabilityType) => {
  switch (type) {
    case 'asap':
      return {
        badge: 'Listo para hoy',
        icon: <Zap size={16} className="text-amber-500" />,
        badgeClass: 'bg-amber-100 text-amber-700',
        copy: 'Hecho fresco para ti. Si pides antes de las 12:00 p.m., podemos entregarlo hoy.',
      };
    case '24h':
      return {
        badge: 'Requiere 24h',
        icon: <Clock size={16} className="text-blue-500" />,
        badgeClass: 'bg-blue-100 text-blue-700',
        copy: 'Este producto necesita 24 horas de preparación para entregarse en su mejor punto.',
      };
    case '48h':
      return {
        badge: 'Requiere 48h',
        icon: <Clock size={16} className="text-purple-500" />,
        badgeClass: 'bg-purple-100 text-purple-700',
        copy: 'Este producto se prepara bajo pedido y requiere 48 horas de anticipación.',
      };
    case 'advisor_only':
      return {
        badge: 'Solo por WhatsApp',
        icon: <MessageCircle size={16} className="text-green-500" />,
        badgeClass: 'bg-green-100 text-green-700',
        copy: 'Diseño exclusivo y tiempos personalizados. Nuestro equipo te ayudará a coordinarlo.',
      };
  }
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem, setDirectPurchaseItem } = useCartStore();

  const product = mockProducts.find((p) => p.id === params.id);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product?.variants.length ? product.variants[0] : null
  );
  const [selectedPreferences, setSelectedPreferences] = useState<ProductPreference[]>([]);
  const [addedToast, setAddedToast] = useState(false);

  const currentPrice = useMemo(() => {
    if (!product) return 0;
    const variantDelta = selectedVariant ? selectedVariant.price_delta : 0;
    const prefsDelta = selectedPreferences.reduce((sum, p) => sum + p.price_delta, 0);
    return product.basePrice + variantDelta + prefsDelta;
  }, [product, selectedVariant, selectedPreferences]);

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-2xl font-bold mb-4">Producto no encontrado</h1>
        <Link href="/menu" className="text-blue-500 hover:underline">Volver al menú</Link>
      </div>
    );
  }

  const ui = getAvailabilityUI(product.availabilityType);

  const togglePreference = (pref: ProductPreference) => {
    setSelectedPreferences((prev) =>
      prev.some((p) => p.id === pref.id)
        ? prev.filter((p) => p.id !== pref.id)
        : [...prev, pref]
    );
  };

  const handleAddToCart = () => {
    addItem(product, selectedVariant, selectedPreferences);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  const handleBuyNow = () => {
    if (product.availabilityType === 'advisor_only') {
      const waMsg = encodeURIComponent(`Hola, quiero ayuda con el producto: ${product.name}.`);
      window.open(`https://wa.me/573173285832?text=${waMsg}`, '_blank');
      return;
    }

    addItem(product, selectedVariant, selectedPreferences);

    const variantPart = selectedVariant ? selectedVariant.id : 'novar';
    const prefPart = selectedPreferences.length > 0 ? selectedPreferences.map(p => p.id).sort().join('-') : 'nopref';
    
    const directItem: CartItem = {
      ...product,
      cartItemId: `direct_${product.id}_${variantPart}_${prefPart}`,
      selectedVariant,
      selectedPreferences,
      calculatedPrice: currentPrice,
      quantity: 1
    };

    setDirectPurchaseItem(directItem);
    router.push('/checkout?mode=direct');
  };

  return (
    <main className="min-h-screen bg-white pb-32">
      <div className="relative h-72 w-full md:h-96">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${product.imageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <Link 
          href="/menu" 
          className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm p-3 rounded-full text-zinc-900 shadow-md hover:bg-white transition-colors"
        >
          <ArrowLeft size={24} />
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-8 relative z-10 bg-white rounded-t-3xl pt-8">
        
        <div className="mb-6">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 ${ui.badgeClass}`}>
            {ui.icon} {ui.badge}
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-900 leading-tight mb-2">
            {product.name}
          </h1>
          <p className="text-zinc-500 text-base leading-relaxed mb-4">
            {product.description}
          </p>
          <div className="text-2xl font-extrabold text-zinc-900">
            ${currentPrice.toLocaleString('es-CO')}
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 mb-8 border border-gray-100 flex items-start gap-3">
          <div className="mt-0.5">{ui.icon}</div>
          <p className="text-sm font-medium text-zinc-600 leading-snug">
            {ui.copy}
          </p>
        </div>

        {product.variants.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-zinc-900 mb-3">Elige un tamaño/opción</h3>
            <div className="space-y-3">
              {product.variants.map((variant) => (
                <label 
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedVariant?.id === variant.id ? 'border-black bg-zinc-50' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedVariant?.id === variant.id ? 'border-black' : 'border-gray-300'
                    }`}>
                      {selectedVariant?.id === variant.id && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                    </div>
                    <span className="font-bold text-zinc-900">{variant.name}</span>
                  </div>
                  {variant.price_delta > 0 && (
                    <span className="text-sm font-bold text-zinc-500">+${variant.price_delta.toLocaleString('es-CO')}</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {product.preferences.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-zinc-900 mb-3">Preferencias (Opcional)</h3>
            <div className="space-y-3">
              {product.preferences.map((pref) => {
                const isSelected = selectedPreferences.some(p => p.id === pref.id);
                return (
                  <label 
                    key={pref.id}
                    onClick={() => togglePreference(pref)}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected ? 'border-black bg-zinc-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'border-black bg-black' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                      </div>
                      <span className="font-bold text-zinc-900">{pref.name}</span>
                    </div>
                    {pref.price_delta > 0 && (
                      <span className="text-sm font-bold text-zinc-500">+${pref.price_delta.toLocaleString('es-CO')}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

      </div>

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 pb-6 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          
          <button 
            onClick={handleBuyNow}
            className="w-full bg-black text-white text-lg font-bold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg active:scale-95"
          >
            {product.availabilityType === 'advisor_only' ? (
              <>Hablar con un asesor <MessageCircle size={20} /></>
            ) : (
              'Comprar ahora'
            )}
          </button>

          {product.availabilityType !== 'advisor_only' && (
            <button 
              onClick={handleAddToCart}
              className={`w-full text-lg font-bold py-3.5 rounded-full flex items-center justify-center gap-2 transition-all border-2 active:scale-95 ${
                addedToast ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-zinc-900 hover:border-black'
              }`}
            >
              {addedToast ? '¡Agregado al carrito!' : <><ShoppingBag size={20} /> Agregar al carrito</>}
            </button>
          )}

        </div>
      </div>

    </main>
  );
}