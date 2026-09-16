'use client';

/**
 * @fileoverview Tablero Kanban Operativo de Cocina y Pedidos (KanbanBoardPage) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Monitoreo en Tiempo Real:
 *    - Se suscribe a la colección 'orders' en Firestore ordenada por 'createdAt' descendente.
 * 2. Alerta Sonora y Notificaciones Push:
 *    - Compara el recuento previo de pedidos pendientes con el entrante.
 *    - Si llega un nuevo pedido, detona un tono de alarma en bucle (loop) y una Notificación Web.
 * 3. Tablero Kanban de 3 Columnas:
 *    - 'pending': Pedidos nuevos por iniciar preparación.
 *    - 'preparing': Pedidos que actualmente se están horneando o preparando en barra.
 *    - 'ready': Pedidos concluidos esperando ser recogidos o entregados al repartidor.
 * 4. Actualización Atómica de Estados:
 *    - Función `moveOrder` para transicionar el estado en la base de datos hasta 'delivered'.
 * 5. Generador de Pruebas:
 *    - Incluye `addTestOrder` para simular tickets entrantes en entornos de prueba o desarrollo.
 */

import { useState, useEffect, useRef } from 'react';
import { Cormorant_Garamond } from 'next/font/google';
import {
    Clock,
    ChefHat,
    CheckCircle2,
    ArrowRight,
    Plus,
    AlertCircle,
    VolumeX,
    Bell
} from 'lucide-react';
import { db } from '../../../lib/firebase';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    setDoc,
    Timestamp
} from 'firebase/firestore';

const cormorant = Cormorant_Garamond({
    subsets: ["latin"],
    weight: ['600']
});

// Estados operacionales del flujo de comanda/cocina
type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered';

/**
 * Estructura de cada producto dentro de la orden de cocina.
 */
interface OrderItem {
    name: string;
    quantity: number;
    variant?: string;
}

/**
 * Estructura del documento de pedido consultado desde Firestore.
 */
interface Order {
    id: string;
    customerName: string;
    items: OrderItem[];
    total: number;
    status: OrderStatus;
    createdAt: Timestamp | string | Date | null;
}

export default function KanbanBoardPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);

    // Referencias para control de estado previo de pendientes y audio
    const prevPendingCount = useRef<number>(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    /**
     * 1. CONFIGURACIÓN DE AUDIO Y PERMISOS DE NOTIFICACIÓN:
     * Inicializa la instancia de sonido y solicita permisos al navegador.
     */
    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1006/1006-preview.mp3');
        audioRef.current.loop = true;

        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }

        return () => {
            audioRef.current?.pause();
            if (audioRef.current) audioRef.current.currentTime = 0;
        };
    }, []);

    /**
     * 2. SUSCRIPCIÓN EN TIEMPO REAL CON FIRESTORE:
     * Escucha altas y modificaciones en la colección 'orders'.
     */
    useEffect(() => {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc')); //

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ordersData: Order[] = [];
            snapshot.forEach((doc) => {
                ordersData.push({ id: doc.id, ...doc.data() } as Order);
            });

            const currentPending = ordersData.filter(o => o.status === 'pending');

            // 3. Activa la alarma únicamente si hay incremento en la cantidad de órdenes pendientes
            if (!isLoading && currentPending.length > prevPendingCount.current) {
                triggerAlarm();
            }

            setOrders(ordersData);
            prevPendingCount.current = currentPending.length;
            setIsLoading(false);
        }, (error) => {
            console.error("Error al sincronizar pedidos en el tablero:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [isLoading]);

    /**
     * Dispara la alarma sonora en bucle y emite notificación push del sistema.
     */
    const triggerAlarm = () => {
        setIsAlarmActive(true);
        audioRef.current?.play().catch(() => {
            console.log("El navegador requiere interacción del usuario previa para reproducir audio.");
        });

        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("🚨 NUEVO PEDIDO - AURA BAKERY", {
                body: "Hay un nuevo pedido esperando en la cocina.",
                icon: "/images/logo-aura.png"
            });
        }
    };

    /**
     * Silencia la alarma y detiene el audio.
     */
    const stopAlarm = () => {
        setIsAlarmActive(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    /**
     * Transiciona el estado del pedido en Firestore.
     */
    const moveOrder = async (orderId: string, newStatus: OrderStatus) => {
        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, { status: newStatus });
        } catch (error) {
            console.error("Error al actualizar estado del pedido:", error);
        }
    };

    /**
     * Simulación: Inserta un pedido ficticio para verificar el comportamiento de la cocina.
     */
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

    // Clasificación por columnas Kanban
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const preparingOrders = orders.filter(o => o.status === 'preparing');
    const readyOrders = orders.filter(o => o.status === 'ready');

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-zinc-400 font-sans">
                conectando con la cocina...
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-8 py-10 font-sans h-screen flex flex-col relative">

            {/* OVERLAY DE ALERTA PERSISTENTE (AL ENTRAR NUEVO PEDIDO) */}
            {isAlarmActive && (
                <div className="fixed inset-0 z-[100] bg-red-600/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-[3rem] shadow-2xl max-w-md w-full text-center">
                        <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="text-red-600 w-12 h-12 animate-pulse" />
                        </div>
                        <h2 className={`text-4xl text-zinc-900 mb-2 ${cormorant.className}`}>
                            ¡nuevo pedido!
                        </h2>
                        <p className="text-zinc-500 mb-8 font-light">
                            Revisa la columna de nuevos pedidos para comenzar la preparación.
                        </p>

                        <button
                            onClick={stopAlarm}
                            className="w-full bg-zinc-900 text-white py-5 rounded-2xl text-xl font-bold hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg"
                        >
                            <VolumeX size={24} /> Aceptar pedido
                        </button>
                    </div>
                </div>
            )}

            {/* ENCABEZADO Y CONTROLES */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className={`text-3xl text-zinc-900 ${cormorant.className}`}>
                        tablero de cocina
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">Gestiona los pedidos en tiempo real.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => Notification.requestPermission()}
                        className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
                        title="Activar Notificaciones Push"
                        aria-label="Activar notificaciones"
                    >
                        <Bell size={20} />
                    </button>
                    <button
                        onClick={addTestOrder}
                        className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors active:scale-95"
                    >
                        <Plus size={16} /> pedido de prueba
                    </button>
                </div>
            </div>

            {/* TABLERO KANBAN DE 3 COLUMNAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-start overflow-hidden">

                {/* COLUMNA 1: NUEVOS / PENDIENTES */}
                <div className="bg-orange-50/50 rounded-3xl p-4 border border-orange-100 flex flex-col gap-4 max-h-full">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-bold text-orange-800 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={16} /> nuevos
                        </h2>
                        <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-md">
                            {pendingOrders.length}
                        </span>
                    </div>
                    <div className="space-y-3 overflow-y-auto pr-1">
                        {pendingOrders.map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                actionText="a cocina"
                                onAction={() => moveOrder(order.id, 'preparing')}
                            />
                        ))}
                        {pendingOrders.length === 0 && <EmptyState text="no hay pedidos nuevos" />}
                    </div>
                </div>

                {/* COLUMNA 2: EN PREPARACIÓN */}
                <div className="bg-blue-50/50 rounded-3xl p-4 border border-blue-100 flex flex-col gap-4 max-h-full">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-bold text-blue-800 uppercase tracking-widest flex items-center gap-2">
                            <ChefHat size={16} /> en preparación
                        </h2>
                        <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded-md">
                            {preparingOrders.length}
                        </span>
                    </div>
                    <div className="space-y-3 overflow-y-auto pr-1">
                        {preparingOrders.map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                actionText="marcar listo"
                                onAction={() => moveOrder(order.id, 'ready')}
                            />
                        ))}
                        {preparingOrders.length === 0 && <EmptyState text="cocina despejada" />}
                    </div>
                </div>

                {/* COLUMNA 3: LISTOS PARA ENTREGA */}
                <div className="bg-green-50/50 rounded-3xl p-4 border border-green-100 flex flex-col gap-4 max-h-full">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-bold text-green-800 uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle2 size={16} /> listos
                        </h2>
                        <span className="bg-green-200 text-green-800 text-xs font-bold px-2 py-1 rounded-md">
                            {readyOrders.length}
                        </span>
                    </div>
                    <div className="space-y-3 overflow-y-auto pr-1">
                        {readyOrders.map(order => (
                            <div key={order.id} className="bg-white p-4 rounded-2xl border border-green-200 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="font-bold text-zinc-900 capitalize">{order.customerName}</p>
                                        <p className="text-[10px] text-zinc-400 uppercase mt-0.5">
                                            {formatOrderDate(order.createdAt)}
                                        </p>
                                    </div>
                                    <span className="text-xs text-zinc-400">#{order.id.slice(-4)}</span>
                                </div>
                                <button
                                    onClick={() => moveOrder(order.id, 'delivered')}
                                    className="w-full bg-green-600 text-white py-2 rounded-xl text-sm font-bold hover:bg-green-700 active:scale-95 transition-all shadow-sm"
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

/**
 * Convierte de forma robusta objetos Timestamp de Firestore o strings a formato legible.
 */
function formatOrderDate(dateField: any): string {
    if (!dateField) return "---";
    let date: Date;

    if (dateField && typeof dateField.toDate === 'function') {
        date = dateField.toDate(); // Firestore Timestamp
    } else {
        date = new Date(dateField); // ISO String o epoch
    }

    if (isNaN(date.getTime())) return "fecha inválida";

    return (
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) +
        ' - ' +
        date.toLocaleDateString([], { day: '2-digit', month: 'short' })
    );
}

/**
 * Componente individual de tarjeta de pedido para las columnas Kanban.
 */
function OrderCard({
    order,
    actionText,
    onAction
}: {
    order: Order;
    actionText: string;
    onAction: () => void;
}) {
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
                        <span className="font-bold text-zinc-900 bg-gray-100 px-1.5 rounded">
                            {item.quantity}x
                        </span>
                        <span>
                            {item.name} {item.variant && <span className="text-zinc-400 text-xs ml-1">({item.variant})</span>}
                        </span>
                    </li>
                ))}
            </ul>
            <button
                onClick={onAction}
                className="w-full bg-black text-white py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-zinc-800 active:scale-95 transition-all shadow-sm"
            >
                {actionText} <ArrowRight size={14} />
            </button>
        </div>
    );
}

/**
 * Estado vacío para columnas sin órdenes en curso.
 */
function EmptyState({ text }: { text: string }) {
    return (
        <div className="p-6 text-center border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400 text-sm font-light">
            {text}
        </div>
    );
}