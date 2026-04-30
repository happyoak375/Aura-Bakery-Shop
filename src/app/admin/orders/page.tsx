'use client';

import { useState, useEffect } from 'react';
import { Cormorant_Garamond } from 'next/font/google';
import { Clock, ChefHat, CheckCircle2, ArrowRight, Plus } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';

const cormorant = Cormorant_Garamond({
    subsets: ["latin"],
    weight: ['600']
});

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered';

interface OrderItem {
    name: string;
    quantity: number;
    variant?: string;
}

interface Order {
    id: string;
    customerName: string;
    items: OrderItem[];
    total: number;
    status: OrderStatus;
    // We allow any type here to safely handle Firebase Timestamps vs Strings
    createdAt: any;
}

export default function KanbanBoardPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc')); // Changed to desc to see newest first

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ordersData: Order[] = [];
            snapshot.forEach((doc) => {
                ordersData.push({ id: doc.id, ...doc.data() } as Order);
            });
            setOrders(ordersData);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const moveOrder = async (orderId: string, newStatus: OrderStatus) => {
        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, { status: newStatus });
        } catch (error) {
            console.error("Error al mover pedido:", error);
        }
    };

    const addTestOrder = async () => {
        const newId = `ord_${Math.floor(Math.random() * 10000)}`;
        const newOrder = {
            customerName: `Cliente #${Math.floor(Math.random() * 100)}`,
            items: [
                { name: "Tarta Vasca", quantity: 1, variant: "Completa" },
                { name: "Galleta Red Velvet", quantity: 2 }
            ],
            total: 45000,
            status: 'pending' as OrderStatus,
            createdAt: Timestamp.now(), // Recommended for Firebase
        };
        await setDoc(doc(db, 'orders', newId), newOrder);
    };

    const pendingOrders = orders.filter(o => o.status === 'pending');
    const preparingOrders = orders.filter(o => o.status === 'preparing');
    const readyOrders = orders.filter(o => o.status === 'ready');

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center lowercase text-zinc-400">conectando con la cocina...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-8 py-10 font-sans h-screen flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className={`text-3xl text-zinc-900 ${cormorant.className}`}>tablero de cocina</h1>
                    <p className="text-zinc-500 text-sm lowercase mt-1">gestiona los pedidos en tiempo real.</p>
                </div>
                <button
                    onClick={addTestOrder}
                    className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 lowercase transition-colors"
                >
                    <Plus size={16} /> pedido de prueba
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-start">
                {/* COLUMN 1 */}
                <div className="bg-orange-50/50 rounded-3xl p-4 border border-orange-100 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-bold text-orange-800 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={16} /> nuevos
                        </h2>
                        <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-md">{pendingOrders.length}</span>
                    </div>
                    <div className="space-y-3">
                        {pendingOrders.map(order => (
                            <OrderCard key={order.id} order={order} actionText="a cocina" onAction={() => moveOrder(order.id, 'preparing')} />
                        ))}
                        {pendingOrders.length === 0 && <EmptyState text="no hay pedidos nuevos" />}
                    </div>
                </div>

                {/* COLUMN 2 */}
                <div className="bg-blue-50/50 rounded-3xl p-4 border border-blue-100 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-widest flex items-center gap-2">
                            <ChefHat size={16} /> en preparación
                        </h2>
                        <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded-md">{preparingOrders.length}</span>
                    </div>
                    <div className="space-y-3">
                        {preparingOrders.map(order => (
                            <OrderCard key={order.id} order={order} actionText="marcar listo" onAction={() => moveOrder(order.id, 'ready')} />
                        ))}
                        {preparingOrders.length === 0 && <EmptyState text="cocina despejada" />}
                    </div>
                </div>

                {/* COLUMN 3 */}
                <div className="bg-green-50/50 rounded-3xl p-4 border border-green-100 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-bold text-green-800 uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle2 size={16} /> listos
                        </h2>
                        <span className="bg-green-200 text-green-800 text-xs font-bold px-2 py-1 rounded-md">{readyOrders.length}</span>
                    </div>
                    <div className="space-y-3">
                        {readyOrders.map(order => (
                            <div key={order.id} className="bg-white p-4 rounded-2xl border border-green-200 shadow-sm transition-all hover:shadow-md">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="font-bold text-zinc-900 capitalize">{order.customerName}</p>
                                        <p className="text-[10px] text-zinc-400 uppercase mt-0.5">{formatOrderDate(order.createdAt)}</p>
                                    </div>
                                    <span className="text-xs text-zinc-400">#{order.id.slice(-4)}</span>
                                </div>
                                <p className="text-sm text-zinc-500 lowercase mb-4">Esperando al cliente / repartidor.</p>
                                <button
                                    onClick={() => moveOrder(order.id, 'delivered')}
                                    className="w-full bg-green-600 text-white py-2 rounded-xl text-sm font-bold hover:bg-green-700 active:scale-95 transition-all lowercase"
                                >
                                    marcar como entregado
                                </button>
                            </div>
                        ))}
                        {readyOrders.length === 0 && <EmptyState text="no hay pedidos listos" />}
                    </div>
                </div>
            </div>
        </div>
    );
}

// HELPER FUNCTION: Handles both Firebase Timestamps and ISO Strings
function formatOrderDate(dateField: any) {
    if (!dateField) return "---";

    let date: Date;

    // Check if it's a Firebase Timestamp (has toDate method)
    if (dateField && typeof dateField.toDate === 'function') {
        date = dateField.toDate();
    } else {
        // Fallback for strings
        date = new Date(dateField);
    }

    if (isNaN(date.getTime())) return "fecha inválida";

    return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }) + ' - ' + date.toLocaleDateString([], {
        day: '2-digit',
        month: 'short'
    });
}

function OrderCard({ order, actionText, onAction }: { order: Order, actionText: string, onAction: () => void }) {
    return (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-3">
                <div>
                    <p className="font-bold text-zinc-900 capitalize text-lg">{order.customerName}</p>
                    <p className="text-xs text-zinc-400 lowercase">
                        {formatOrderDate(order.createdAt)} • #{order.id.slice(-4)}
                    </p>
                </div>
            </div>

            <ul className="space-y-2 mb-4">
                {order.items.map((item, i) => (
                    <li key={i} className="text-sm text-zinc-600 flex items-start gap-2 lowercase">
                        <span className="font-bold text-zinc-900 bg-gray-100 px-1.5 rounded">{item.quantity}x</span>
                        <span>
                            {item.name}
                            {item.variant && <span className="text-zinc-400 text-xs ml-1">({item.variant})</span>}
                        </span>
                    </li>
                ))}
            </ul>

            <button
                onClick={onAction}
                className="w-full bg-black text-white py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-zinc-800 active:scale-95 transition-all lowercase"
            >
                {actionText} <ArrowRight size={14} />
            </button>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="p-6 text-center border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400 text-sm lowercase">
            {text}
        </div>
    );
}