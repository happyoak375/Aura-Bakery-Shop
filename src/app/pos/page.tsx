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

    // Data State
    const [products, setProducts] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Cart State
    const [cart, setCart] = useState<PosCartItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta'>('tarjeta');
    const [successMessage, setSuccessMessage] = useState(false);

    // --- Advanced Checkout & Discount State ---
    const [discount, setDiscount] = useState<{ type: 'fixed' | 'percentage', value: number, reason: string } | null>(null);
    const [includeTip, setIncludeTip] = useState(false);
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [receiptData, setReceiptData] = useState<any>(null); // MOVED INSIDE THE COMPONENT!

    // --- Modal Temporary State ---
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

    // --- Checkout Calculations ---
    const subTotal = cart.reduce((sum, item) => sum + (item.product.costPerUnit * item.quantity), 0);

    const discountAmount = discount
        ? (discount.type === 'percentage' ? subTotal * (discount.value / 100) : discount.value)
        : 0;

    const subTotalAfterDiscount = Math.max(0, subTotal - discountAmount);

    // 10% Suggested Service Tip
    const tipAmount = includeTip ? subTotalAfterDiscount * 0.10 : 0;

    const finalTotal = subTotalAfterDiscount + tipAmount;

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
                totalAmount: finalTotal, // From advanced checkout
                items: orderItems,
                createdAt: serverTimestamp(),
                processedBy: employeeEmail || 'Desconocido',
            };

            const docRef = await addDoc(collection(db, 'orders'), orderData);

            // Inject the generated ID for the receipt
            const completeOrderData = { ...orderData, orderNumber: docRef.id.substring(0, 6).toUpperCase() };

            // 1. Set the data for the CSS Print Template
            setReceiptData(completeOrderData);

            // 2. Trigger the browser print dialog after giving React 100ms to render the hidden div
            setTimeout(() => {
                window.print();
            }, 100);

            // Success animation & Reset
            setSuccessMessage(true);
            setCart([]);
            setDiscount(null);
            setIncludeTip(false);

            setTimeout(() => {
                setSuccessMessage(false);
                setIsProcessing(false);
                setReceiptData(null); // Clear receipt after printing
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
                        Turno Activo: {employeeEmail || 'Staff'}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full text-gray-400 font-bold animate-pulse">
                            Cargando menú...
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {products.map(product => (
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
                                            onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo-aura.png' }}
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

                {/* Cart Items */}
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

                {/* Checkout Footer (UPGRADED UI WITH DISCOUNTS) */}
                <div className="p-6 bg-gray-50 border-t border-gray-200 shrink-0">

                    {/* Discount & Tip Controls */}
                    <div className="space-y-3 mb-4 border-b border-gray-200 pb-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-500">Subtotal</span>
                            <span className="font-bold text-zinc-900">${subTotal.toLocaleString('es-CO')}</span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <button
                                onClick={() => setShowDiscountModal(true)}
                                className="text-blue-600 font-bold hover:underline"
                            >
                                {discount ? `Descuento (${discount.reason})` : '+ Agregar Descuento'}
                            </button>
                            {discount && (
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-red-500">-${discountAmount.toLocaleString('es-CO')}</span>
                                    <button onClick={() => setDiscount(null)} className="text-zinc-400 hover:text-red-500">×</button>
                                </div>
                            )}
                        </div>

                        <label className="flex justify-between items-center text-sm cursor-pointer group">
                            <span className="text-zinc-500 group-hover:text-zinc-900 transition">Propina Sugerida (10%)</span>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-zinc-900">${(subTotalAfterDiscount * 0.10).toLocaleString('es-CO')}</span>
                                <input
                                    type="checkbox"
                                    checked={includeTip}
                                    onChange={(e) => setIncludeTip(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                                />
                            </div>
                        </label>
                    </div>

                    {/* Final Total */}
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-gray-500 font-bold text-lg">Total a cobrar</span>
                        <span className="text-4xl font-black text-zinc-900">${finalTotal.toLocaleString('es-CO')}</span>
                    </div>

                    {/* Payment Methods */}
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
                        className={`w-full py-5 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-2 transition active:scale-95 shadow-xl ${successMessage
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

            {/* --- DISCOUNT MODAL OVERLAY --- */}
            {showDiscountModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-extrabold text-zinc-900 mb-1">Aplicar Descuento</h3>
                        <p className="text-sm text-gray-500 mb-6">Autoriza una cortesía o descuento manual.</p>

                        <div className="space-y-4">
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setTempDiscountType('percentage')}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${tempDiscountType === 'percentage' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
                                >
                                    Porcentaje (%)
                                </button>
                                <button
                                    onClick={() => setTempDiscountType('fixed')}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${tempDiscountType === 'fixed' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
                                >
                                    Fijo ($)
                                </button>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Valor</label>
                                <input
                                    type="number"
                                    value={tempDiscountValue}
                                    onChange={(e) => setTempDiscountValue(e.target.value)}
                                    placeholder={tempDiscountType === 'percentage' ? 'Ej. 10' : 'Ej. 5000'}
                                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-black font-medium"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Motivo (Obligatorio)</label>
                                <input
                                    type="text"
                                    value={tempDiscountReason}
                                    onChange={(e) => setTempDiscountReason(e.target.value)}
                                    placeholder="Ej. Cortesía staff, Cliente frecuente..."
                                    className="w-full p-3 rounded-xl border border-gray-200 focus:outline-none focus:border-black font-medium"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowDiscountModal(false)}
                                className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleApplyDiscount}
                                className="flex-1 py-3 rounded-xl font-bold text-white bg-black hover:bg-zinc-800 transition"
                            >
                                Aplicar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- HIDDEN 58mm THERMAL RECEIPT --- */}
            <div id="printable-receipt" className="hidden print:block p-2">
                {receiptData && (
                    <div className="text-center w-full">
                        <h2 className="font-bold text-lg mb-1">AURA BAKERY</h2>
                        <p className="text-xs mb-1">NIT: XXXXXXXXX</p>
                        <p className="text-xs mb-3">Medellín, Colombia</p>

                        <div className="border-t border-dashed border-black my-2"></div>
                        <p className="text-xs text-left mb-1">Ticket: #{receiptData.orderNumber}</p>
                        <p className="text-xs text-left mb-1">Fecha: {new Date().toLocaleDateString()}</p>
                        <p className="text-xs text-left mb-2">Cajero: {employeeEmail || 'Turno'}</p>
                        <div className="border-t border-dashed border-black my-2"></div>

                        <table className="w-full text-xs text-left mb-2">
                            <thead>
                                <tr>
                                    <th className="w-2/3">Cant Prod</th>
                                    <th className="w-1/3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {receiptData.items.map((item: any, i: number) => (
                                    <tr key={i}>
                                        <td className="pr-1">{item.quantity}x {item.name}</td>
                                        <td className="text-right">${(item.price * item.quantity).toLocaleString('es-CO')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="border-t border-dashed border-black my-2"></div>

                        <div className="flex justify-between text-xs font-bold mt-2">
                            <span>TOTAL</span>
                            <span>${receiptData.totalAmount.toLocaleString('es-CO')}</span>
                        </div>
                        <p className="text-xs text-left mt-1">Pago: {receiptData.paymentMethod.toUpperCase()}</p>

                        <div className="border-t border-dashed border-black my-2 mt-4"></div>
                        <p className="text-xs mt-2 font-bold">¡Gracias por tu compra!</p>
                        <p className="text-xs mb-8">@aurataller</p>
                    </div>
                )}
            </div>
        </div>
    );
}