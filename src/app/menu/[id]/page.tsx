/**
 * @fileoverview Dynamic Product Detail Page
 * Renders individual product pages based on the URL parameter (e.g., /menu/prod_selva).
 * Handles user selections for variants and preferences, calculates real-time pricing, 
 * and routes users to either the Cart or the Direct Checkout flow.
 */

"use client";

// ==========================================
// 1. IMPORTS
// ==========================================
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, MessageCircle, ShoppingBag, Zap } from 'lucide-react';
import { mockProducts, ProductVariant, ProductPreference, AvailabilityType } from '../../../lib/mockData';
import { useCartStore, CartItem } from '../../../lib/store';

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

/**
 * Maps the backend 'AvailabilityType' to its corresponding frontend UI configuration.
 * WHY EXTRACT THIS?: Keeping this logic outside the main component prevents it from 
 * being redefined on every render and keeps the JSX tree clean.
 * * @param {AvailabilityType} type - The lead time required for the product.
 * @returns An object containing the badge text, icon, colors, and marketing copy.
 */
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

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
export default function ProductDetailPage() {
  const params = useParams(); // Retrieves the dynamic 'id' from the URL
  const router = useRouter();
  const { addItem, setDirectPurchaseItem } = useCartStore();

  // Find the specific product data. (In production, this would be a Firestore fetch).
  const product = mockProducts.find((p) => p.id === params.id);

  // --- State Management ---
  
  // Variants (Radio button behavior: only one can be selected at a time)
  // We default to the first variant in the array if variants exist.
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product?.variants.length ? product.variants[0] : null
  );
  
  // Preferences (Checkbox behavior: multiple can be selected)
  const [selectedPreferences, setSelectedPreferences] = useState<ProductPreference[]>([]);
  
  // UX State for the Add to Cart button confirmation animation
  const [addedToast, setAddedToast] = useState(false);

  /**
   * PERFORMANCE OPTIMIZATION: `useMemo`
   * Recalculates the total price dynamically whenever the user changes a variant or preference.
   * By wrapping it in useMemo, React caches the result and only recalculates it if 
   * 'product', 'selectedVariant', or 'selectedPreferences' actually change.
   */
  const currentPrice = useMemo(() => {
    if (!product) return 0;
    const variantDelta = selectedVariant ? selectedVariant.price_delta : 0;
    const prefsDelta = selectedPreferences.reduce((sum, p) => sum + p.price_delta, 0);
    return product.basePrice + variantDelta + prefsDelta;
  }, [product, selectedVariant, selectedPreferences]);


  // --- Event Handlers ---

  /**
   * Toggles a preference on or off. 
   * If it exists in the array, remove it. If it doesn't, append it.
   */
  const togglePreference = (pref: ProductPreference) => {
    setSelectedPreferences((prev) =>
      prev.some((p) => p.id === pref.id)
        ? prev.filter((p) => p.id !== pref.id) // Remove
        : [...prev, pref] // Add
    );
  };

  /**
   * Standard Cart Flow: Pushes the item to Zustand and shows a temporary success toast.
   */
  const handleAddToCart = () => {
    addItem(product!, selectedVariant, selectedPreferences);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  /**
   * Direct Purchase Flow ("Buy Now"):
   * Bypasses the main cart to allow a user to instantly buy one specific item 
   * without abandoning or mixing it with their existing cart contents.
   */
  const handleBuyNow = () => {
    if (!product) return;

    // Special Case: Highly custom products route straight to human assistance
    if (product.availabilityType === 'advisor_only') {
      const waMsg = encodeURIComponent(`Hola, quiero ayuda con el producto: ${product.name}.`);
      window.open(`https://wa.me/573173285832?text=${waMsg}`, '_blank');
      return;
    }

    // 1. Generate the unique hash for this specific combination
    const variantPart = selectedVariant ? selectedVariant.id : 'novar';
    const prefPart = selectedPreferences.length > 0 ? selectedPreferences.map(p => p.id).sort().join('-') : 'nopref';
    
    // 2. Construct the single CartItem
    const directItem: CartItem = {
      ...product,
      cartItemId: `direct_${product.id}_${variantPart}_${prefPart}`,
      selectedVariant,
      selectedPreferences,
      calculatedPrice: currentPrice,
      quantity: 1
    };

    // 3. Save to the isolated 'direct purchase' store and redirect
    setDirectPurchaseItem(directItem);
    router.push('/checkout?mode=direct');
  };

  // ==========================================
  // 4. RENDER HELPERS
  // ==========================================

  // Failsafe: If the URL ID doesn't match any product, show a 404-style fallback
  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-2xl font-bold mb-4">Producto no encontrado</h1>
        <Link href="/menu" className="text-blue-500 hover:underline">Volver al menú</Link>
      </div>
    );
  }

  // Generate the dynamic UI components based on the product's lead time
  const ui = getAvailabilityUI(product.availabilityType);

  // ==========================================
  // 5. MAIN RENDER
  // ==========================================
  return (
    <main className="min-h-screen bg-white pb-32">
      
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

        {/* --- VARIANTS SELECTOR (RADIO STYLE) --- */}
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
                    {/* Custom Radio Button UI */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedVariant?.id === variant.id ? 'border-black' : 'border-gray-300'
                    }`}>
                      {selectedVariant?.id === variant.id && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                    </div>
                    <span className="font-bold text-zinc-900">{variant.name}</span>
                  </div>
                  {/* Only show price delta if it modifies the base price */}
                  {variant.price_delta > 0 && (
                    <span className="text-sm font-bold text-zinc-500">+${variant.price_delta.toLocaleString('es-CO')}</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* --- PREFERENCES SELECTOR (CHECKBOX STYLE) --- */}
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
                      {/* Custom Checkbox UI */}
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

      {/* --- STICKY ACTION BUTTONS --- */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 pb-6 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
          
          {/* BUY NOW BUTTON */}
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

          {/* ADD TO CART BUTTON (Hidden if product requires advisor) */}
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