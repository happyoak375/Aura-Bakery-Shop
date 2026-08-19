'use client';

import React, { useState, useEffect } from 'react';
// import { fetchInventoryByType, processPOSOrder, InventoryItem, seedInitialMenu, seedRawMaterialsAndBOM } from '@/lib/api';
import { fetchInventoryByType, processPOSOrder, InventoryItem, seedInitialMenu } from '@/lib/api';

const CATEGORIES = ['Todos', 'Clásicos', 'Cookies', 'Café', 'Bebidas'];

// --- NEW: Image Mapping Helper ---
// This function looks at the Firestore product name and returns the correct local image path.
const getProductImage = (name: string) => {

    if (!name) return null;

    const lowerName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (lowerName.includes('pasteis') || lowerName.includes('nata')) return '/products/pasteis-de-nata.jpg';
    if (lowerName.includes('vasca')) return '/products/tarta-vasca.jpg';
    if (lowerName.includes('latte')) return '/products/latte.png';
    if (lowerName.includes('doble chocolate')) return '/products/cookie-chocolate.jpg';
    if (lowerName.includes('red velvet')) return '/products/cookie-red.jpg';
    if (lowerName.includes('aura') && lowerName.includes('cookie')) return '/products/cookie-aura.jpg';
    if (lowerName.includes('cruller')) return '/products/cruller.jpg';
    if (lowerName.includes('maracuya') || lowerName.includes('passion')) return '/products/entremet-passion.jpg';
    if (lowerName.includes('dark') || lowerName.includes('entremet')) return '/products/entremet-chocolate.jpg';
    if (lowerName.includes('selva')) return '/products/selva-negra.jpg';
    if (lowerName.includes('tiramisu')) return '/products/tiramisu.jpg';
    if (lowerName.includes('brownie')) return '/products/brownie.jpg';
    if (lowerName.includes('smothie') || lowerName.includes('smoothie')) return '/products/smothie.png';
    if (lowerName.includes('cafe') || lowerName.includes('espresso') || lowerName.includes('americano')) return '/products/coffee-drinks.png';

    // Fallback if no match is found (creates a clean colored circle with the first letter)
    return null;
};

export default function POSPage() {
    // --- STATE ---
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [products, setProducts] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [cart, setCart] = useState<Array<{ id: string, name: string, price: number, quantity: number }>>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('card');

    // --- EFFECT: LOAD LIVE DATA ---
    useEffect(() => {
        const loadProducts = async () => {
            try {
                setIsLoading(true);
                const liveData = await fetchInventoryByType('finished_good');
                setProducts(liveData);
            } catch (error) {
                console.error("Failed to load products:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadProducts();
    }, []);

    // --- LOGIC ---
    const filteredProducts = activeCategory === 'Todos'
        ? products
        : products.filter((p: any) => p.category === activeCategory);

    const addToCart = (product: InventoryItem) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { id: product.id!, name: product.name, price: product.costPerUnit, quantity: 1 }];
        });
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        try {
            setIsProcessing(true);

            const orderData = {
                totalAmount: cartTotal,
                paymentMethod: paymentMethod,
                status: 'completed' as const,
                source: 'pos' as const,
                items: cart.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    price: item.price
                }))
            };

            const result = await processPOSOrder(orderData);

            if (result && result.success) {
                alert(`¡Venta Exitosa! Orden #${result.orderId} pagada con ${paymentMethod}`);
                setCart([]);
                setPaymentMethod('card');

                const freshData = await fetchInventoryByType('finished_good');
                setProducts(freshData);
            }

        } catch (error: any) {
            alert("Error procesando la venta: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- JSX (THE UI) ---
    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">

            {/* LEFT SIDE: Menu & Products */}
            <div className="w-2/3 flex flex-col h-full border-r border-gray-200 bg-white">

                <button onClick={seedInitialMenu} className="bg-blue-500 text-white p-2">Actualizar Canales</button>

                {/* Header & Categories */}
                <div className="p-6 border-b border-gray-100 shadow-sm z-10">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6 tracking-tight">Aura POS</h1>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-6 py-3 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${activeCategory === cat
                                    ? 'bg-black text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500 font-medium">
                            Cargando menú desde Firestore...
                        </div>
                    ) : products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <p>No hay productos listos para la venta.</p>
                            <p className="text-sm mt-2">Asegúrate de tener items marcados como "finished_good" en Firestore.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-5">
                            {filteredProducts.map(product => {
                                // SAFETY CHECKS: Assign default values if Firestore is missing fields
                                const safeName = product.name || 'Producto Sin Nombre';
                                const safePrice = product.costPerUnit || 0;
                                const imgPath = getProductImage(safeName);

                                return (
                                    <button
                                        key={product.id || Math.random()}
                                        onClick={() => addToCart({ ...product, name: safeName, costPerUnit: safePrice })}
                                        className="bg-white rounded-3xl p-5 h-40 flex flex-col items-center justify-center text-center shadow-sm border border-gray-100 hover:shadow-md hover:border-black active:scale-95 transition-all group"
                                    >
                                        {imgPath ? (
                                            <div className="w-16 h-16 mb-3 relative rounded-full overflow-hidden shadow-sm border border-gray-100 group-hover:scale-105 transition-transform">
                                                <img
                                                    src={imgPath}
                                                    alt={safeName}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-100 rounded-full mb-3 flex items-center justify-center text-gray-400 font-bold text-xl group-hover:scale-105 transition-transform">
                                                {safeName.charAt(0).toUpperCase()}
                                            </div>
                                        )}

                                        <span className="font-bold text-gray-800 text-sm leading-tight">{safeName}</span>
                                        <span className="text-gray-500 text-xs mt-1">${safePrice.toFixed(2)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT SIDE: Cart & Checkout */}
            <div className="w-1/3 flex flex-col h-full bg-white">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">Orden Actual</h2>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400 italic">
                            El carrito está vacío
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                                    <p className="text-xs text-gray-500">${item.price.toFixed(2)} x {item.quantity}</p>
                                </div>
                                <p className="font-bold text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                        ))
                    )}
                </div>

                {/* Checkout Footer */}
                <div className="p-6 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">

                    {/* Payment Method Toggles */}
                    <div className="mb-6">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Método de Pago</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${paymentMethod === 'cash' ? 'bg-black text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                                Efectivo
                            </button>
                            <button
                                onClick={() => setPaymentMethod('card')}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${paymentMethod === 'card' ? 'bg-black text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                                Tarjeta
                            </button>
                            <button
                                onClick={() => setPaymentMethod('transfer')}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${paymentMethod === 'transfer' ? 'bg-black text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                                Transfer
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-6">
                        <span className="text-lg text-gray-500 font-medium">Total</span>
                        <span className="text-3xl font-black text-gray-900">${cartTotal.toFixed(2)}</span>
                    </div>

                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0 || isProcessing}
                        className="w-full bg-black text-white text-xl font-bold py-5 rounded-2xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? 'Procesando...' : 'Cobrar Orden'}
                    </button>
                    {/* <button onClick={seedRawMaterialsAndBOM} className="bg-green-600 text-white p-2 rounded text-xs ml-4">
                        CARGAR INSUMOS Y RECETAS
                    </button>
                    <button onClick={seedInitialMenu} className="bg-blue-500 text-white p-2 rounded text-xs ml-4">CARGAR MENÚ A FIREBASE</button> */}
                </div>
            </div>

        </div>
    );
}