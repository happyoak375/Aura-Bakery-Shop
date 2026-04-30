/**
 * @fileoverview Dynamic Product Detail Page
 */

"use client";

// ==========================================
// 1. IMPORTS
// ==========================================
import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, MessageCircle, ShoppingBag, Zap } from 'lucide-react';
import { ProductVariant, ProductPreference, AvailabilityType, Product } from '../../../lib/mockData';
import { useCartStore } from '../../../lib/store';
import { fetchProductById } from '../../../lib/api';

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

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
    default:
      return {
        badge: 'Consultar',
        icon: <Clock size={16} className="text-gray-500" />,
        badgeClass: 'bg-gray-100 text-gray-700',
        copy: 'Consulta disponibilidad.',
      };
  }
};

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();

  // EXTRAEMOS LAS DOS FUNCIONES DEL STORE
  const { addItem, setDirectPurchaseItem } = useCartStore();

  // --- State Management ---
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedPreferences, setSelectedPreferences] = useState<ProductPreference[]>([]);

  // UX State
  const [addedToast, setAddedToast] = useState(false);
  const [localItemCount, setLocalItemCount] = useState(0);

  useEffect(() => {
    const loadProduct = async () => {
      if (!params.id) return;

      const fetchedProduct = await fetchProductById(params.id as string);

      if (fetchedProduct) {
        setProduct(fetchedProduct);
        if (fetchedProduct.variants && fetchedProduct.variants.length > 0) {
          setSelectedVariant(fetchedProduct.variants[0]);
        }
      }
      setIsLoading(false);
    };

    loadProduct();
  }, [params.id]);


  const currentPrice = useMemo(() => {
    if (!product) return 0;
    const variantDelta = selectedVariant ? selectedVariant.price_delta : 0;
    const prefsDelta = selectedPreferences.reduce((sum, p) => sum + p.price_delta, 0);
    return product.basePrice + variantDelta + prefsDelta;
  }, [product, selectedVariant, selectedPreferences]);


  // --- Event Handlers ---

  const togglePreference = (pref: ProductPreference) => {
    setSelectedPreferences((prev) =>
      prev.some((p) => p.id === pref.id)
        ? prev.filter((p) => p.id !== pref.id)
        : [...prev, pref]
    );
  };

  const handleAddToCart = () => {
    addItem(product!, selectedVariant, selectedPreferences);
    setAddedToast(true);
    setLocalItemCount(prevCount => prevCount + 1);
    setTimeout(() => setAddedToast(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product) return;

    if (product.availabilityType === 'advisor_only') {
      const waMsg = encodeURIComponent(`Hola, quiero ayuda con el producto: ${product.name}.`);
      window.open(`https://wa.me/573173285832?text=${waMsg}`, '_blank');
      return;
    }

    // Calculamos el precio exacto
    const variantDelta = selectedVariant ? selectedVariant.price_delta : 0;
    const prefsDelta = selectedPreferences.reduce((sum, p) => sum + p.price_delta, 0);
    const calculatedPrice = product.basePrice + variantDelta + prefsDelta;

    // Creamos el objeto temporal para compra directa
    const tempItem = {
      ...product,
      cartItemId: 'direct_purchase',
      selectedVariant,
      selectedPreferences,
      calculatedPrice,
      quantity: localItemCount > 0 ? localItemCount : 1,
    };

    // Lo guardamos en el espacio aislado y vamos al checkout
    setDirectPurchaseItem(tempItem as any);
    router.push('/checkout?type=direct');
  };

  // ==========================================
  // 4. RENDER HELPERS
  // ==========================================

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-500 font-medium animate-pulse">Preparando detalles...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-2xl font-bold mb-4">Producto no encontrado</h1>
        <Link href="/menu" className="text-blue-500 hover:underline">Volver al menú</Link>
      </div>
    );
  }

  const ui = getAvailabilityUI(product.availabilityType);

  // ==========================================
  // 5. MAIN RENDER
  // ==========================================
  return (
    <main className="min-h-screen bg-white pb-38">

      {/* --- HERO IMAGE & BACK BUTTON --- */}
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

        {/* --- PRODUCT HEADER --- */}
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

        {/* --- AVAILABILITY EXPLANATION BANNER --- */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-8 border border-gray-100 flex items-start gap-3">
          <div className="mt-0.5">{ui.icon}</div>
          <p className="text-sm font-medium text-zinc-600 leading-snug">
            {ui.copy}
          </p>
        </div>

        {/* --- VARIANTS SELECTOR --- */}
        {product.variants.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-zinc-900 mb-3">Elige un tamaño/opción</h3>
            <div className="space-y-3">
              {product.variants.map((variant) => (
                <label
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedVariant?.id === variant.id ? 'border-black bg-zinc-50' : 'border-gray-100 hover:border-gray-200' }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedVariant?.id === variant.id ? 'border-black' : 'border-gray-300' }`}>
                      {selectedVariant?.id === variant.id && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                    </div>
                    <span className="font-bold text-zinc-900">{variant.name}</span>
                  </div>
                  {variant.price_delta > 0 && (
                    <span className="hidden text-sm font-bold text-zinc-500">+${variant.price_delta.toLocaleString('es-CO')}</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* --- PREFERENCES SELECTOR --- */}
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
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-black bg-zinc-50' : 'border-gray-100 hover:border-gray-200' }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'border-black bg-black' : 'border-gray-300' }`}>
                        {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                      </div>
                      <span className="font-bold text-zinc-900">{pref.name}</span>
                    </div>
                    {pref.price_delta > 0 && (
                      <span className="hidden text-sm font-bold text-zinc-500">+${pref.price_delta.toLocaleString('es-CO')}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* --- STICKY ACTION BUTTONS --- */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 pb-6 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className={`max-w-2xl mx-auto flex flex-col gap-3 ${localItemCount > 0 ? 'flex-col-reverse' : ''}`}>

          {/* BUY NOW / CHECKOUT BUTTON */}
          <button
            onClick={handleBuyNow}
            className="w-full bg-black text-white text-lg font-bold py-4 rounded-full flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg active:scale-95"
          >
            {product.availabilityType === 'advisor_only' ? (
              <>Hablar con un asesor <MessageCircle size={20} /></>
            ) : localItemCount > 0 ? (
              'Ir a pagar'
            ) : (
              'Comprar ahora'
            )}
          </button>

          {/* ADD TO CART BUTTON */}
          {product.availabilityType !== 'advisor_only' && (
            <button
              onClick={handleAddToCart}
              className={`w-full text-lg font-bold py-3.5 rounded-full flex items-center justify-center gap-2 transition-all border-2 active:scale-95 ${addedToast ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-zinc-900 hover:border-black' }`}
            >
              {addedToast ? (
                '¡Agregado al carrito!'
              ) : (
                <>
                  <ShoppingBag size={20} />
                  Agregar al carrito
                  {localItemCount > 0 && (
                    <span className="ml-1 bg-zinc-200 text-zinc-800 text-xs font-extrabold px-2 py-0.5 rounded-full">
                      {localItemCount}
                    </span>
                  )}
                </>
              )}
            </button>
          )}

        </div>
      </div>

    </main>
  );
}