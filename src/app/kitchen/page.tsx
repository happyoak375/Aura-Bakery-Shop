"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where } from 'firebase/firestore';
import { useAuthStore } from '../../lib/store';
import { ChefHat, ArrowRight, CheckCircle2, Clock, AlertCircle, ArrowLeft } from 'lucide-react';

export default function KitchenComanda() {
    const router = useRouter();
    const { isStaffLoggedIn } = useAuthStore();
    const [isMounted, setIsMounted] = useState(false);
    const [orders, setOrders] = useState<any[]>([]);

    // Security Check
    useEffect(() => {
        setIsMounted(true);
        if (!isStaffLoggedIn) {
            router.push('/');
        }
    }, [isStaffLoggedIn, router]);

    // Real-time Firebase Listener
    useEffect(() => {
        if (!isStaffLoggedIn) return;

        // We only want active orders for the kitchen, not historical data
        const qOrders = query(
            collection(db, 'orders'),
            where('orderStatus', 'in', ['NUEVO', 'CONFIRMADO', 'PREPARANDO', 'LISTO', 'pendiente', 'en_preparacion', 'lista']),
            orderBy('createdAt', 'asc') // Oldest first so they get cooked first!
        );

        const unsubscribe = onSnapshot(qOrders, (snapshot) => {
            const activeOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(activeOrders);
        });

        return () => unsubscribe();
    }, [isStaffLoggedIn]);

    const updateStatus = async (orderId: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, 'orders', orderId), { orderStatus: newStatus });
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    if (!isMounted || !isStaffLoggedIn) return null;

    // Filter orders into columns
    const pendingOrders = orders.filter(o => ['NUEVO', 'CONFIRMADO', 'pendiente'].includes(o.orderStatus));
    const prepOrders = orders.filter(o => ['PREPARANDO', 'en_preparacion'].includes(o.orderStatus));
    const readyOrders = orders.filter(o => ['LISTO', 'lista'].includes(o.orderStatus));

    return (
        <div className="min-h-screen bg-zinc-900 p-4 md:p-8 font-sans">
            <header className="flex justify-between items-center mb-8 bg-zinc-800 p-6 rounded-2xl shadow-md border border-zinc-700">
                <div className="flex items-center gap-3 text-white">
                    <button
                        onClick={() => router.push('/admin')}
                        className="p-2 bg-zinc-700 rounded-full hover:bg-zinc-600 transition"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="bg-orange-500 p-2 rounded-xl text-white">
                        <ChefHat size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-wide">Comanda Digital</h1>
                        <p className="text-zinc-400 text-sm">Actualización en tiempo real</p>
                    </div>
                </div>
                <button onClick={() => router.push('/admin')} className="text-zinc-400 hover:text-white px-4 py-2 font-bold transition">
                    Volver al Hub
                </button>
            </header>

            {/* Swimlanes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

                {/* COLUMN 1: PENDING */}
                <div className="bg-zinc-800/50 rounded-3xl p-4 border border-zinc-800 min-h-[70vh]">
                    <h2 className="text-white font-bold mb-4 flex items-center gap-2 px-2">
                        <AlertCircle className="text-red-400" size={20} /> POR PREPARAR ({pendingOrders.length})
                    </h2>
                    <div className="space-y-4">
                        {pendingOrders.map(order => (
                            <OrderCard
                                key={order.id} order={order}
                                buttonText="Empezar a Cocinar" buttonColor="bg-blue-600 hover:bg-blue-500"
                                onAction={() => updateStatus(order.id, 'PREPARANDO')}
                            />
                        ))}
                    </div>
                </div>

                {/* COLUMN 2: IN PREP */}
                <div className="bg-zinc-800/50 rounded-3xl p-4 border border-zinc-800 min-h-[70vh]">
                    <h2 className="text-white font-bold mb-4 flex items-center gap-2 px-2">
                        <Clock className="text-blue-400" size={20} /> EN PROCESO ({prepOrders.length})
                    </h2>
                    <div className="space-y-4">
                        {prepOrders.map(order => (
                            <OrderCard
                                key={order.id} order={order}
                                buttonText="Marcar como Listo" buttonColor="bg-green-600 hover:bg-green-500"
                                onAction={() => updateStatus(order.id, 'LISTO')}
                            />
                        ))}
                    </div>
                </div>

                {/* COLUMN 3: READY */}
                <div className="bg-zinc-800/50 rounded-3xl p-4 border border-zinc-800 min-h-[70vh]">
                    <h2 className="text-white font-bold mb-4 flex items-center gap-2 px-2">
                        <CheckCircle2 className="text-green-400" size={20} /> LISTOS PARA ENTREGA ({readyOrders.length})
                    </h2>
                    <div className="space-y-4">
                        {readyOrders.map(order => (
                            <OrderCard
                                key={order.id} order={order}
                                buttonText="Despachar (Ocultar)" buttonColor="bg-zinc-700 hover:bg-zinc-600"
                                onAction={() => updateStatus(order.id, 'ENTREGADO')}
                            />
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}

// --- Reusable Order Card Component ---
function OrderCard({ order, buttonText, buttonColor, onAction }: any) {
    return (
        <div className="bg-zinc-800 p-5 rounded-2xl border border-zinc-700 shadow-lg">
            <div className="flex justify-between items-start mb-3 border-b border-zinc-700 pb-3">
                <div>
                    <span className="text-zinc-400 text-xs font-bold tracking-widest uppercase block mb-1">
                        {order.deliveryMethod === 'pickup' ? '🏃‍♂️ Recoger' : '🛵 Domicilio'}
                    </span>
                    <p className="text-white font-bold text-lg">{order.customerName || 'Sin Nombre'}</p>
                </div>
                <div className="text-right">
                    <span className="text-zinc-500 text-xs block">#{order.id.substring(0, 6)}</span>
                    <span className="text-orange-400 text-sm font-bold">{order.deliveryDate}</span>
                </div>
            </div>

            <ul className="text-zinc-300 space-y-2 mb-4">
                {order.items?.map((item: any, i: number) => (
                    <li key={i} className="flex gap-2 text-sm">
                        <span className="font-bold text-white bg-zinc-700 px-2 rounded">{item.quantity}x</span>
                        <span>
                            {item.name}
                            {item.selectedVariant && <span className="text-zinc-500 text-xs ml-1">({item.selectedVariant.name})</span>}
                        </span>
                    </li>
                ))}
            </ul>

            {order.notes && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-lg mb-4 text-xs text-yellow-200">
                    <span className="font-bold uppercase tracking-wider block mb-1">Notas:</span> {order.notes}
                </div>
            )}

            <button onClick={onAction} className={`w-full py-3 rounded-xl text-white font-bold transition flex items-center justify-center gap-2 ${buttonColor}`}>
                {buttonText} <ArrowRight size={18} />
            </button>
        </div>
    );
}