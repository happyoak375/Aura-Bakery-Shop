'use client';

import { useState, useEffect, useRef } from 'react';
import { Cormorant_Garamond } from 'next/font/google';
import { Clock, ChefHat, CheckCircle2, ArrowRight, Plus, AlertCircle, VolumeX, Bell } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';

const cormorant = Cormorant_Garamond({
    subsets: ["latin"],
    weight: ['600']
});

// Tipado de Pedidos [cite: 7, 8, 9]
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
    createdAt: any; // Soporta Firebase Timestamps y strings [cite: 34, 38]
}

export default function KanbanBoardPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAlarmActive, setIsAlarmActive] = useState(false);

    const prevPendingCount = useRef<number>(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // 1. Configuración de Audio y Permisos al cargar [cite: 11]
    useEffect(() => {
        // Sonido de alarma (puedes cambiar esta URL por un archivo local en /public)
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1006/1006-preview.mp3');
        audioRef.current.loop = true;

        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        return () => {
            audioRef.current?.pause();
        };
    }, []);

    // 2. Escuchar Firebase en tiempo real [cite: 11]
    useEffect(() => {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc')); // [cite: 40]

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ordersData: Order[] = [];
            snapshot.forEach((doc) => {
                ordersData.push({ id: doc.id, ...doc.data() } as Order);
            });

            const currentPending = ordersData.filter(o => o.status === 'pending');

            // 3. Activar Alarma si hay nuevos pedidos pendientes
            if (!isLoading && currentPending.length > prevPendingCount.current) {
                triggerAlarm();
            }

            setOrders(ordersData);
            prevPendingCount.current = currentPending.length;
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isLoading]);

    const triggerAlarm = () => {
        setIsAlarmActive(true);
        audioRef.current?.play().catch(() => console.log("Esperando interacción del usuario para sonido"));

        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("🚨 NUEVO PEDIDO - AURA BAKERY", {
                body: "Hay un nuevo pedido esperando en la cocina.",
                icon: "/images/logo-aura.png"
            });
        }
    };

    const stopAlarm = () => {
        setIsAlarmActive(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

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
            createdAt: Timestamp.now(),
        };
        await setDoc(doc(db, 'orders', newId), newOrder);
    };

    const pendingOrders = orders.filter(o => o.status === 'pending');
    const preparingOrders = orders.filter(o => o.status === 'preparing');
    const readyOrders = orders.filter(o => o.status === 'ready');

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center text-zinc-400">conectando con la cocina...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-8 py-10 font-sans h-screen flex flex-col relative">

            {/* OVERLAY DE ALARMA PERSISTENTE */}
            {isAlarmActive && (
                <div className="fixed inset-0 z-[100] bg-red-600/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-[3rem] shadow-2xl max-w-md w-full text-center">
                        <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="text-red-600 w-12 h-12 animate-pulse" />
                        </div>
                        <h2 className={`text-4xl text-zinc-900 mb-2 ${cormorant.className}`}>¡nuevo pedido!</h2>
                        <p className="text-zinc-500 mb-8">revisa la columna de nuevos para comenzar la preparación.</p>

                        <button
                            onClick={stopAlarm}
                            className="w-full bg-zinc-900 text-white py-5 rounded-2xl text-xl font-bold hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <VolumeX size={24} /> aceptar pedido
                        </button>
                    </div>
                </div>
            )}

            {/* CABECERA [cite: 23, 24] */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className={`text-3xl text-zinc-900 ${cormorant.className}`}>tablero de cocina</h1>
                    <p className="text-zinc-500 text-sm mt-1">gestiona los pedidos en tiempo real.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => Notification.requestPermission()}
                        className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
                        title="Activar Notificaciones"
                    >
                        <Bell size={20} />
                    </button>
                    <button
                        onClick={addTestOrder}
                        className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <Plus size={16} /> pedido de prueba
                    </button>
                </div>
            </div>

            {/* KANBAN BOARD [cite: 25] */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-start overflow-hidden">
                {/* COLUMNA 1: NUEVOS [cite: 25] */}
                <div className="bg-orange-50/50 rounded-3xl p-4 border border-orange-100 flex flex-col gap-4 max-h-full">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-bold text-orange-800 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={16} /> nuevos
                        </h2>
                        <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-md">{pendingOrders.length}</span>
                    </div>
                    <div className="space-y-3 overflow-y-auto">
                        {pendingOrders.map(order => (
                            <OrderCard key={order.id} order={order} actionText="a cocina" onAction={() => moveOrder(order.id, 'preparing')} />
                        ))}
                        {pendingOrders.length === 0 && <EmptyState text="no hay pedidos nuevos" />}
                    </div>
                </div>

                {/* COLUMNA 2: EN PREPARACIÓN [cite: 26] */}
                <div className="bg-blue-50/50 rounded-3xl p-4 border border-blue-100 flex flex-col gap-4 max-h-full">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-widest flex items-center gap-2">
                            <ChefHat size={16} /> en preparación
                        </h2>
                        <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded-md">{preparingOrders.length}</span>
                    </div>
                    <div className="space-y-3 overflow-y-auto">
                        {preparingOrders.map(order => (
                            <OrderCard key={order.id} order={order} actionText="marcar listo" onAction={() => moveOrder(order.id, 'ready')} />
                        ))}
                        {preparingOrders.length === 0 && <EmptyState text="cocina despejada" />}
                    </div>
                </div>

                {/* COLUMNA 3: LISTOS [cite: 27] */}
                <div className="bg-green-50/50 rounded-3xl p-4 border border-green-100 flex flex-col gap-4 max-h-full">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-bold text-green-800 uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle2 size={16} /> listos
                        </h2>
                        <span className="bg-green-200 text-green-800 text-xs font-bold px-2 py-1 rounded-md">{readyOrders.length}</span>
                    </div>
                    <div className="space-y-3 overflow-y-auto">
                        {readyOrders.map(order => (
                            <div key={order.id} className="bg-white p-4 rounded-2xl border border-green-200 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="font-bold text-zinc-900 capitalize">{order.customerName}</p>
                                        <p className="text-[10px] text-zinc-400 uppercase mt-0.5">{formatOrderDate(order.createdAt)}</p>
                                    </div>
                                    <span className="text-xs text-zinc-400">#{order.id.slice(-4)}</span>
                                </div>
                                <button
                                    onClick={() => moveOrder(order.id, 'delivered')}
                                    className="w-full bg-green-600 text-white py-2 rounded-xl text-sm font-bold hover:bg-green-700 active:scale-95 transition-all"
                                >
                                    marcar como entregado [cite: 29]
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

// Formateador de Fechas Robusto [cite: 37, 39]
function formatOrderDate(dateField: any) {
    if (!dateField) return "---";
    let date: Date;
    if (dateField && typeof dateField.toDate === 'function') {
        date = dateField.toDate(); // Firebase Timestamp [cite: 37]
    } else {
        date = new Date(dateField); // ISO String
    }
    if (isNaN(date.getTime())) return "fecha inválida";

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) +
        ' - ' + date.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

function OrderCard({ order, actionText, onAction }: { order: Order, actionText: string, onAction: () => void }) {
    return (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-3">
                <div>
                    <p className="font-bold text-zinc-900 capitalize text-lg">{order.customerName}</p>
                    <p className="text-xs text-zinc-400">
                        {formatOrderDate(order.createdAt)} • #{order.id.slice(-4)}
                    </p>
                </div>
            </div>
            <ul className="space-y-2 mb-4">
                {order.items.map((item, i) => (
                    <li key={i} className="text-sm text-zinc-600 flex items-start gap-2">
                        <span className="font-bold text-zinc-900 bg-gray-100 px-1.5 rounded">{item.quantity}x</span>
                        <span>{item.name} {item.variant && <span className="text-zinc-400 text-xs ml-1">({item.variant})</span>}</span>
                    </li>
                ))}
            </ul>
            <button
                onClick={onAction}
                className="w-full bg-black text-white py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-zinc-800 active:scale-95 transition-all"
            >
                {actionText} <ArrowRight size={14} />
            </button>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return <div className="p-6 text-center border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400 text-sm">{text}</div>;
}