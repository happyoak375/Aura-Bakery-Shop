'use client';

/**
 * @fileoverview Sistema de Pantalla de Cocina / KDS (Comanda Digital) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Suscripción en Tiempo Real (Firestore): Monitorea la colección 'orders' mediante `onSnapshot`.
 * 2. Cola de Producción FIFO: Ordena las comandas de la más antigua a la más reciente (`createdAt asc`)
 *    para garantizar que los pedidos se elaboren en estricto orden de llegada.
 * 3. Tablero Kanban Operativo:
 *    - Columna 1 (Por Preparar): Tickets con estado 'PENDIENTE', 'NUEVO' o sin definir.
 *    - Columna 2 (Preparando): Tickets en proceso activo por parte del equipo.
 *    - Columna 3 (Listos para Entrega): Pedidos finalizados listos para despacho o entrega en barra.
 * 4. Transición de Estados: Modifica el campo `orderStatus` en Firestore sincronizando
 *    el cambio de inmediato con el POS y el Panel de Administración.
 * 5. Identificación Omnicanal: Distingue visiblemente si la comanda proviene del mostrador ('pos') o de la web.
 */

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Clock, ChefHat, CheckCircle2 } from 'lucide-react';

/**
 * Estructura de cada producto individual dentro del ticket de cocina.
 */
interface KitchenOrderItem {
    name?: string;
    quantity: number;
    price?: number;
}

/**
 * Estructura completa de la orden en Firestore consumida por el KDS.
 */
interface KitchenOrder {
    id: string;
    orderNumber?: string | number;
    source?: 'pos' | 'web';
    orderStatus?: 'NUEVO' | 'PENDIENTE' | 'PREPARANDO' | 'LISTO' | 'ENTREGADO' | 'CANCELADO';
    paymentMethod?: string;
    customerName?: string;
    createdAt?: {
        toDate?: () => Date;
    };
    items?: KitchenOrderItem[];
}

export default function ComandaDigital() {
    const [orders, setOrders] = useState<KitchenOrder[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    /**
     * SUSCRIPCIÓN EN TIEMPO REAL:
     * Abre un canal persistente (WebSocket) con Firestore.
     * La ordenación por 'createdAt' ascendente asegura que las órdenes más viejas queden arriba.
     */
    useEffect(() => {
        const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(
            qOrders,
            (querySnapshot) => {
                const liveOrders = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as KitchenOrder[];

                setOrders(liveOrders);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error al sincronizar con las comandas de cocina:", error);
                setIsLoading(false);
            }
        );

        // Desconecta el listener al cerrar la pantalla para liberar recursos
        return () => unsubscribe();
    }, []);

    /**
     * Actualiza el estado operativo de la comanda en Firestore.
     * 
     * @param orderId ID del documento en Firestore
     * @param newStatus Siguiente estado del ciclo de producción
     */
    const updateStatus = async (orderId: string, newStatus: string) => {
        try {
            const orderRef = doc(db, 'orders', orderId);
            await updateDoc(orderRef, { orderStatus: newStatus });
        } catch (error) {
            console.error("Error al actualizar la orden en comanda:", error);
            alert("Error al actualizar el estado de la orden.");
        }
    };

    // =========================================================================
    // SEGMENTACIÓN DEL TABLERO POR ESTADOS OPERATIVOS
    // =========================================================================
    const pendingOrders = orders.filter(
        o => !o.orderStatus || o.orderStatus === 'PENDIENTE' || o.orderStatus === 'NUEVO'
    );
    const preparingOrders = orders.filter(o => o.orderStatus === 'PREPARANDO');
    const readyOrders = orders.filter(o => o.orderStatus === 'LISTO');

    return (
        <div className="min-h-screen bg-zinc-900 p-6 font-sans text-white overflow-x-hidden">

            {/* ENCABEZADO SUPERIOR DEL KDS */}
            <header className="mb-8 flex justify-between items-center border-b border-zinc-800 pb-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white">Comanda Digital</h1>
                    <p className="text-zinc-400 mt-1 text-sm">Actualización automática en tiempo real</p>
                </div>
                <div className="bg-zinc-800 px-4 py-2 rounded-full flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-bold tracking-widest uppercase text-zinc-300">En línea</span>
                </div>
            </header>

            {/* ÁREA DE CONTENIDO / COLUMNAS KANBAN */}
            {isLoading ? (
                <div className="flex h-[60vh] items-center justify-center text-zinc-500 font-medium animate-pulse">
                    Sincronizando con la cocina...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[80vh]">

                    {/* COLUMNA 1: POR PREPARAR (Tickets entrantes) */}
                    <div className="bg-zinc-800/50 rounded-3xl p-4 flex flex-col border border-zinc-800">
                        <h2 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2 px-2 uppercase tracking-widest text-sm">
                            <Clock size={18} /> Por Preparar ({pendingOrders.length})
                        </h2>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {pendingOrders.map(order => (
                                <TicketCard
                                    key={order.id}
                                    order={order}
                                    color="bg-orange-500/10 border-orange-500/20"
                                    btnColor="bg-orange-500 hover:bg-orange-600 text-white"
                                    btnText="Empezar a Preparar"
                                    onAction={() => updateStatus(order.id, 'PREPARANDO')}
                                />
                            ))}
                        </div>
                    </div>

                    {/* COLUMNA 2: PREPARANDO (En elaboración en cocina/barra) */}
                    <div className="bg-zinc-800/50 rounded-3xl p-4 flex flex-col border border-zinc-800">
                        <h2 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2 px-2 uppercase tracking-widest text-sm">
                            <ChefHat size={18} /> Preparando ({preparingOrders.length})
                        </h2>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {preparingOrders.map(order => (
                                <TicketCard
                                    key={order.id}
                                    order={order}
                                    color="bg-blue-500/10 border-blue-500/20"
                                    btnColor="bg-blue-500 hover:bg-blue-600 text-white"
                                    btnText="Marcar como Listo"
                                    onAction={() => updateStatus(order.id, 'LISTO')}
                                />
                            ))}
                        </div>
                    </div>

                    {/* COLUMNA 3: LISTO (Terminado para entrega o retiro) */}
                    <div className="bg-zinc-800/50 rounded-3xl p-4 flex flex-col border border-zinc-800">
                        <h2 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2 px-2 uppercase tracking-widest text-sm">
                            <CheckCircle2 size={18} /> Listos para Entrega ({readyOrders.length})
                        </h2>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                            {readyOrders.map(order => (
                                <TicketCard
                                    key={order.id}
                                    order={order}
                                    color="bg-green-500/10 border-green-500/20"
                                    btnColor="bg-zinc-700 hover:bg-zinc-600 text-white"
                                    btnText="Entregado (Archivar)"
                                    onAction={() => updateStatus(order.id, 'ENTREGADO')}
                                />
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}

/**
 * Propiedades del componente de tarjeta de comanda individual.
 */
interface TicketCardProps {
    order: KitchenOrder;
    color: string;
    btnColor: string;
    btnText: string;
    onAction: () => void;
}

/**
 * Componente visual de la comanda de cocina.
 */
function TicketCard({ order, color, btnColor, btnText, onAction }: TicketCardProps) {
    // Formateo seguro de la marca de tiempo de creación
    const time = order.createdAt?.toDate
        ? order.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Reciente';

    return (
        <div className={`p-5 rounded-2xl border ${color} shadow-sm transition-all animate-in fade-in zoom-in-95 duration-200`}>

            {/* ENCABEZADO DEL TICKET: Canal de origen, ID y hora */}
            <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-3">
                <div>
                    <span className="bg-white/10 text-white/80 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                        {order.source === 'pos' ? '📍 Tienda' : '🌐 Web'}
                    </span>
                    <p className="font-bold text-white mt-2">
                        Orden #{order.orderNumber || order.id.substring(0, 6)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-white/90">{time}</p>
                    {order.paymentMethod && (
                        <p className="text-xs text-white/50 capitalize mt-1">{order.paymentMethod}</p>
                    )}
                </div>
            </div>

            {/* LISTA DE ÍTEMS Y CANTIDADES A PREPARAR */}
            <ul className="mb-5 space-y-2">
                {order.items?.map((item, idx) => (
                    <li key={idx} className="flex gap-3 items-start text-white/90 text-sm">
                        <span className="font-black bg-white/10 px-2 py-0.5 rounded text-white min-w-[28px] text-center">
                            {item.quantity}
                        </span>
                        <span className="font-medium leading-snug pt-0.5">
                            {item.name || 'Producto'}
                        </span>
                    </li>
                ))}
            </ul>

            {/* BOTÓN DE TRANSICIÓN DE ESTADO */}
            <button
                onClick={onAction}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${btnColor}`}
            >
                {btnText}
            </button>
        </div>
    );
}