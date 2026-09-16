"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { fetchInventoryItems, InventoryItem, getLocalProductImage } from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import { ShoppingBag, ArrowLeft, Plus, Minus, Trash2, CreditCard, Banknote, CheckCircle2 } from 'lucide-react';

interface PosCartItem {
    product: InventoryItem;
    quantity: number;
}

export default function PointOfSale() {
    const router = useRouter();
    const { isStaffLoggedIn, employeeEmail } = useAuthStore();
    const [isMounted, setIsMounted] = useState(false);

    // Data & Filter State
    const [products, setProducts] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('Todos');

    // Cart State
    const [cart, setCart] = useState<PosCartItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta'>('tarjeta');
    const [successMessage, setSuccessMessage] = useState(false);

    // Advanced Checkout & Discount State
    const [discount, setDiscount] = useState<{ type: 'fixed' | 'percentage', value: number, reason: string } | null>(null);
    const [includeTip, setIncludeTip] = useState(false);
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null);

    // Modal Temporary State
    const [tempDiscountType, setTempDiscountType] = useState<'fixed' | 'percentage'>('percentage');
    const [tempDiscountValue, setTempDiscountValue] = useState('');
    const [tempDiscountReason, setTempDiscountReason] = useState('');

    const handleApplyDiscount = () => {
        const val = parseFloat(tempDiscountValue);
        if (!val || val <= 0 || !tempDiscountReason.trim()) {
            alert("Por favor ingresa un valor válido y un motivo (ej. 'Cortesía familiar').");
            return;
        }
        setDiscount({
            type: tempDiscountType,
            value: val,
            reason: tempDiscountReason
        });
        setShowDiscountModal(false);
        setTempDiscountValue('');
        setTempDiscountReason('');
    };

    // Security Check
    useEffect(() => {
        setIsMounted(true);
        if (!isStaffLoggedIn) {
            router.push('/');
        }
    }, [isStaffLoggedIn, router]);

    // Load POS Products
    useEffect(() => {
        const loadProducts = async () => {
            const allItems = await fetchInventoryItems();
            // Only show finished goods that are authorized for the physical POS
            const posProducts = allItems.filter(
                item => item.type === 'finished_good' && item.salesChannels?.includes('pos')
            );
            setProducts(posProducts);
            setIsLoading(false);
        };
        if (isStaffLoggedIn) loadProducts();
    }, [isStaffLoggedIn]);

    if (!isMounted || !isStaffLoggedIn) return null;

    // --- Dynamic Categories & Filtering ---
    const categories = ['Todos', ...Array.from(new Set(products.map((p) => p.category || 'Otros')))];
    
    const filteredProducts = activeCategory === 'Todos'
        ? products
        : products.filter((p) => (p.category || 'Otros') === activeCategory);

    // --- Cart Logic ---
    const addToCart = (product: InventoryItem) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQuantity = item.quantity + delta;
                return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
            }
            return item;
        }));
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const total = cart.reduce((sum, item) => sum + (item.product.costPerUnit * item.quantity), 0);

    // --- Checkout Logic ---
    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setIsProcessing(true);

        try {
            const orderItems = cart.map(item => ({
                id: item.product.id,
                name: item.product.name,
                price: item.product.costPerUnit,
                quantity: item.quantity
            }));

            const orderData = {
                source: 'pos',
                orderStatus: 'NUEVO',
                paymentStatus: 'PAGADO',
                paymentMethod: paymentMethod,
                customerName: 'Cliente Tienda',
                deliveryMethod: 'pickup',
                totalAmount: total,
                items: orderItems,
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'orders'), orderData);
            
            setSuccessMessage(true);
            setCart([]);
            setTimeout(() => {
                setSuccessMessage(false);
                setIsProcessing(false);
            }, 2000);

        } catch (error) {
            console.error("Error processing order:", error);
            alert("Error procesando el pago. Intenta nuevamente.");
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex font-sans">
            
            {/* --- LEFT SIDE: MENU GRID --- */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="bg-white p-4 shadow-sm border-b border-gray-200 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/admin')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-extrabold text-zinc-900">Aura Caja</h1>
                    </div>
                    <div className="text-sm font-bold text-zinc-500 bg-gray-100 px-4 py-2 rounded-full">
                        Turno Activo
                    </div>
                </header>

                {/* CATEGORY FILTER BAR */}
                <div className="bg-white px-6 pb-3 pt-3 border-b border-gray-200 shrink-0">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {categories.map((cat, idx) => (
                            <button
                                key={`${cat}-${idx}`}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition active:scale-95 ${
                                    activeCategory === cat 
                                        ? 'bg-black text-white shadow-md' 
                                        : 'bg-gray-100 text-zinc-600 hover:bg-gray-200 border border-transparent'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full text-gray-400 font-bold animate-pulse">
                            Cargando menú...
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-zinc-400">
                            No hay productos en esta categoría.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredProducts.map(product => (
                                <button 
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200 hover:border-black hover:shadow-md transition active:scale-95 flex flex-col items-center text-center h-48"
                                >
                                    <div className="w-20 h-20 bg-gray-100 rounded-full overflow-hidden mb-3 shrink-0">
                                        <img 
                                            src={product.imageUrl || getLocalProductImage(product.name)} 
                                            alt={product.name} 
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }}
                                        />
                                    </div>
                                    <h3 className="font-bold text-zinc-900 text-sm leading-tight mb-1 line-clamp-2">{product.name}</h3>
                                    <p className="text-zinc-500 text-sm font-medium mt-auto">${product.costPerUnit.toLocaleString('es-CO')}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* --- RIGHT SIDE: CURRENT TICKET --- */}
            <div className="w-[350px] bg-white border-l border-gray-200 shadow-2xl flex flex-col h-screen shrink-0 z-10">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-extrabold flex items-center gap-2">
                        <ShoppingBag size={20} /> Comanda Actual
                    </h2>
                    <span className="bg-black text-white text-xs font-bold px-2 py-1 rounded-full">{cart.length} items</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                            <ShoppingBag size={48} className="opacity-20" />
                            <p className="font-medium">No hay productos en la cuenta</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.product.id} className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-sm text-zinc-900 leading-tight pr-2">{item.product.name}</span>
                                    <span className="font-bold text-sm text-zinc-900 shrink-0">${(item.product.costPerUnit * item.quantity).toLocaleString('es-CO')}</span>
                                </div>
                                
                                <div className="flex justify-between items-center mt-1">
                                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                        <button onClick={() => updateQuantity(item.product.id!, -1)} className="p-1 hover:bg-white rounded shadow-sm text-zinc-600 transition"><Minus size={14} /></button>
                                        <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.product.id!, 1)} className="p-1 hover:bg-white rounded shadow-sm text-zinc-600 transition"><Plus size={14} /></button>
                                    </div>
                                    <button onClick={() => removeFromCart(item.product.id!)} className="text-red-400 hover:text-red-600 p-2 transition">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-200 shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-500 font-bold">Total a cobrar</span>
                        <span className="text-3xl font-extrabold text-zinc-900">${total.toLocaleString('es-CO')}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <button 
                            onClick={() => setPaymentMethod('tarjeta')}
                            className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition ${paymentMethod === 'tarjeta' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500'}`}
                        >
                            <CreditCard size={18} /> Tarjeta
                        </button>
                        <button 
                            onClick={() => setPaymentMethod('efectivo')}
                            className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition ${paymentMethod === 'efectivo' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500'}`}
                        >
                            <Banknote size={18} /> Efectivo
                        </button>
                    </div>

                    <button 
                        disabled={cart.length === 0 || isProcessing}
                        onClick={handleCheckout}
                        className={`w-full py-5 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-2 transition active:scale-95 shadow-xl ${
                            successMessage 
                                ? 'bg-green-500 text-white' 
                                : cart.length === 0 
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' 
                                    : 'bg-black text-white hover:bg-zinc-800'
                        }`}
                    >
                        {successMessage ? (
                            <><CheckCircle2 size={24} /> ¡Pago Exitoso!</>
                        ) : isProcessing ? (
                            'Procesando...'
                        ) : (
                            'Cobrar Orden'
                        )}
                    </button>
                </div>
            </div>

        </div>
    );
}