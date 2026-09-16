'use client';

/**
 * @fileoverview Panel de Configuración Operativa y Destacados (ConfigPage) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Parámetros Logísticos de Despacho (`settings/delivery` en Firestore):
 *    - cutoffTime: Hora militar límite del día para procesar pedidos 'asap' / mismo día.
 *    - closedDaysOfWeek: Array numérico de días de cierre semanal (ej. 0 = Domingo).
 *    - blackoutDates: Fechas festivas o de bloqueo operativo total donde no se agenda.
 *    - deliveryWindows: Franjas horarias dinámicas habilitadas para entrega o recogida.
 * 2. Curaduría del Catálogo Destacado (`settings/featured` en Firestore):
 *    - Permite al administrador definir qué productos aparecen en la vitrina de la portada.
 *    - Se nutre del inventario centralizado (`fetchInventoryItems`) bajo el esquema V2.
 * 3. Persistencia Atómica:
 *    - Guarda cambios combinados mediante `setDoc` con bandera `{ merge: true }` para no
 *      sobrescribir campos adicionales de base de datos no expuestos en la vista.
 */

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { fetchInventoryItems, InventoryItem } from '../../../lib/api';
import {
    Settings,
    Clock,
    Save,
    Trash2,
    Plus,
    Star,
    Timer
} from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

const cormorant = Cormorant_Garamond({
    subsets: ["latin"],
    weight: ['600']
});

/**
 * Mapeo de días de la semana compatible con el estándar de JavaScript (`Date.getDay()`).
 * 0 = Domingo, 1 = Lunes, ..., 6 = Sábado.
 */
const DAYS_OF_WEEK = [
    { id: 1, name: 'lunes' },
    { id: 2, name: 'martes' },
    { id: 3, name: 'miércoles' },
    { id: 4, name: 'jueves' },
    { id: 5, name: 'viernes' },
    { id: 6, name: 'sábado' },
    { id: 0, name: 'domingo' },
];

export default function ConfigPage() {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [message, setMessage] = useState<{ type: string; text: string }>({ type: '', text: '' });

    // Parámetros de logística de entrega
    const [cutoffTime, setCutoffTime] = useState<number>(17);
    const [closedDays, setClosedDays] = useState<number[]>([]);
    const [blackoutDates, setBlackoutDates] = useState<string[]>([]);
    const [deliveryWindows, setDeliveryWindows] = useState<string[]>([]);

    // Formularios temporales de interfaz
    const [newWindow, setNewWindow] = useState<string>('');

    // Catálogo completo y selección de productos destacados
    const [allProducts, setAllProducts] = useState<InventoryItem[]>([]);
    const [featuredIds, setFeaturedIds] = useState<string[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');

    /**
     * Carga inicial de configuración desde Firestore:
     * 1. Consulta 'settings/delivery' para reglas operativas de horarios y días libres.
     * 2. Consulta 'settings/featured' para los IDs de productos prioritarios en portada.
     * 3. Consulta 'inventory_items' para listar los productos activos disponibles.
     */
    useEffect(() => {
        const fetchConfigAndProducts = async () => {
            try {
                const deliveryRef = doc(db, 'settings', 'delivery');
                const deliverySnap = await getDoc(deliveryRef);
                if (deliverySnap.exists()) {
                    const data = deliverySnap.data();
                    setCutoffTime(data.cutoffTime ?? 17);
                    setClosedDays(data.closedDaysOfWeek ?? [0]);
                    setBlackoutDates(data.blackoutDates || []);
                    setDeliveryWindows(
                        data.deliveryWindows || [
                            "Mañana (8:00 AM - 12:00 PM)",
                            "Tarde (1:00 PM - 5:00 PM)"
                        ]
                    );
                }

                const featRef = doc(db, 'settings', 'featured');
                const featSnap = await getDoc(featRef);
                if (featSnap.exists()) {
                    setFeaturedIds(featSnap.data().productIds || []);
                }

                // Carga de catálogo unificado V2
                const products = await fetchInventoryItems();
                setAllProducts(products);
            } catch (error) {
                console.error("Error al cargar la configuración general:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConfigAndProducts();
    }, []);

    /**
     * GUARDA DE CAMBIOS EN FIRESTORE:
     * Actualiza atómicamente los documentos de configuración operacional.
     */
    const handleSave = async () => {
        setIsSaving(true);
        setMessage({ type: '', text: '' });

        try {
            // 1. Guarda parámetros logísticos
            await setDoc(doc(db, 'settings', 'delivery'), {
                cutoffTime: Number(cutoffTime),
                closedDaysOfWeek: closedDays,
                blackoutDates: blackoutDates,
                deliveryWindows: deliveryWindows
            }, { merge: true });

            // 2. Guarda el listado de destacados de portada
            await setDoc(doc(db, 'settings', 'featured'), {
                productIds: featuredIds
            }, { merge: true });

            setMessage({ type: 'success', text: '¡Cambios guardados exitosamente!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error("Error al guardar la configuración:", error);
            setMessage({ type: 'error', text: 'Hubo un error al guardar los cambios.' });
        } finally {
            setIsSaving(false);
        }
    };

    /**
     * Agrega una nueva franja horaria a la lista de opciones de checkout.
     */
    const addWindow = () => {
        if (!newWindow || deliveryWindows.includes(newWindow)) return;
        setDeliveryWindows([...deliveryWindows, newWindow.trim()]);
        setNewWindow('');
    };

    /**
     * Remueve una franja horaria existente.
     */
    const removeWindow = (win: string) => {
        setDeliveryWindows(deliveryWindows.filter(w => w !== win));
    };

    if (isLoading) {
        return (
            <div className="p-10 text-zinc-400 font-medium animate-pulse font-sans">
                cargando configuración del sistema...
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-8 py-10 font-sans pb-32">

            {/* BARRA SUPERIOR DE ACCIÓN */}
            <div className="flex items-center justify-between mb-8">
                <h1 className={`text-4xl text-zinc-900 ${cormorant.className}`}>
                    configuración
                </h1>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all lowercase disabled:opacity-50 active:scale-95 shadow-md"
                >
                    <Save size={18} /> {isSaving ? 'guardando...' : 'guardar cambios'}
                </button>
            </div>

            {/* FEEDBACK DE ESTADO */}
            {message.text && (
                <div className={`p-4 rounded-xl mb-6 text-sm font-bold border transition-all ${message.type === 'success'
                        ? 'bg-green-50 text-green-700 border-green-100'
                        : 'bg-red-50 text-red-700 border-red-100'
                    }`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-6">

                {/* 1. JORNADAS Y FRANJAS HORARIAS DE ENTREGA */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="bg-purple-50 text-purple-600 p-2 rounded-lg">
                            <Timer size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-zinc-900 text-lg lowercase">jornadas de entrega</h2>
                            <p className="text-xs text-zinc-500 lowercase">
                                define los rangos horarios que el cliente puede elegir en el checkout.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 mb-4">
                        <input
                            type="text"
                            placeholder="Ej: Mañana (8:00 AM - 12:00 PM)"
                            value={newWindow}
                            onChange={(e) => setNewWindow(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black transition-all flex-1 font-medium text-sm"
                        />
                        <button
                            onClick={addWindow}
                            className="bg-zinc-100 px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition active:scale-95"
                            aria-label="Agregar jornada"
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {deliveryWindows.map(win => (
                            <div key={win} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <span className="text-sm font-medium text-zinc-700 lowercase">{win}</span>
                                <button
                                    onClick={() => removeWindow(win)}
                                    className="text-red-400 hover:text-red-600 p-1.5 transition rounded-lg hover:bg-red-50"
                                    aria-label="Eliminar jornada"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. PRODUCTOS DESTACADOS EN PORTADA */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="bg-yellow-50 text-yellow-600 p-2 rounded-lg">
                            <Star size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-zinc-900 text-lg lowercase">productos destacados</h2>
                            <p className="text-xs text-zinc-500 lowercase">
                                selecciona los productos que aparecerán destacados en la página principal.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 mb-4">
                        <select
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none flex-1 font-medium text-sm cursor-pointer"
                        >
                            <option value="">selecciona un producto...</option>
                            {allProducts
                                .filter(p => !featuredIds.includes(p.id!))
                                .map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                        </select>
                        <button
                            onClick={() => {
                                if (selectedProductId) {
                                    setFeaturedIds([...featuredIds, selectedProductId]);
                                    setSelectedProductId('');
                                }
                            }}
                            className="bg-zinc-100 px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition active:scale-95"
                            aria-label="Agregar destacado"
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    <div className="space-y-2">
                        {featuredIds.map((id, index) => (
                            <div key={id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <span className="bg-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-400 border border-gray-200">
                                    {index + 1}
                                </span>
                                <span className="flex-1 font-bold text-zinc-800 lowercase text-sm">
                                    {allProducts.find(p => p.id === id)?.name || 'Cargando producto...'}
                                </span>
                                <button
                                    onClick={() => setFeaturedIds(featuredIds.filter(i => i !== id))}
                                    className="text-red-400 hover:text-red-600 p-1.5 transition rounded-lg hover:bg-red-50"
                                    aria-label="Remover destacado"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. DÍAS DE DESCANSO SEMANAL (CIERRE REGULAR) */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="bg-orange-50 text-orange-600 p-2 rounded-lg">
                            <Clock size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-zinc-900 text-lg lowercase">días de descanso</h2>
                            <p className="text-xs text-zinc-500 lowercase">
                                los días marcados quedarán deshabilitados automáticamente en el calendario de pedidos.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map(day => {
                            const isClosed = closedDays.includes(day.id);
                            return (
                                <button
                                    key={day.id}
                                    onClick={() => setClosedDays(prev =>
                                        prev.includes(day.id) ? prev.filter(d => d !== day.id) : [...prev, day.id]
                                    )}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold lowercase border transition-all active:scale-95 ${isClosed
                                            ? 'bg-orange-100 border-orange-200 text-orange-900 shadow-sm'
                                            : 'bg-white border-gray-200 text-zinc-500 hover:border-zinc-300'
                                        }`}
                                >
                                    {day.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}