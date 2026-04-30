'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { fetchAllProductsAdmin } from '../../../lib/api';
import { Product } from '../../../lib/mockData';
import { Settings, CalendarX, Clock, Save, Trash2, Plus, CalendarDays, Star, ArrowUp, ArrowDown } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ['600'] });

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
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // --- State for existing sections ---
    const [cutoffTime, setCutoffTime] = useState(17);
    const [closedDays, setClosedDays] = useState<number[]>([]);
    const [blackoutDates, setBlackoutDates] = useState<string[]>([]);
    const [newDate, setNewDate] = useState('');

    // --- State for Featured Products ---
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [featuredIds, setFeaturedIds] = useState<string[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');

    useEffect(() => {
        const fetchConfigAndProducts = async () => {
            try {
                // Load Delivery Config
                const deliveryRef = doc(db, 'settings', 'delivery');
                const deliverySnap = await getDoc(deliveryRef);
                if (deliverySnap.exists()) {
                    const data = deliverySnap.data();
                    setCutoffTime(data.cutoffTime ?? 17);
                    setClosedDays(data.closedDaysOfWeek ?? [0]);
                    setBlackoutDates(Array.isArray(data.blackoutDates) ? [...data.blackoutDates].sort() : []);
                }

                // Load Featured Config
                const featRef = doc(db, 'settings', 'featured');
                const featSnap = await getDoc(featRef);
                if (featSnap.exists()) {
                    setFeaturedIds(featSnap.data().productIds || []);
                }

                // Load Product List
                const products = await fetchAllProductsAdmin();
                setAllProducts(products);

            } catch (error) {
                console.error("Error al cargar configuración:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConfigAndProducts();
    }, []);

    const toggleDay = (dayId: number) => {
        setClosedDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
    };

    const handleAddDate = () => {
        if (!newDate || blackoutDates.includes(newDate)) return;
        setBlackoutDates([...blackoutDates, newDate].sort());
        setNewDate('');
    };

    const handleRemoveDate = (dateToRemove: string) => {
        setBlackoutDates(prev => prev.filter(d => d !== dateToRemove));
    };

    // --- Featured Logic ---
    const addFeaturedProduct = () => {
        if (!selectedProductId || featuredIds.includes(selectedProductId)) return;
        setFeaturedIds([...featuredIds, selectedProductId]);
        setSelectedProductId('');
    };

    const removeFeaturedProduct = (id: string) => {
        setFeaturedIds(prev => prev.filter(item => item !== id));
    };

    const moveFeatured = (index: number, direction: 'up' | 'down') => {
        const newIds = [...featuredIds];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newIds.length) return;
        [newIds[index], newIds[targetIndex]] = [newIds[targetIndex], newIds[index]];
        setFeaturedIds(newIds);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage({ type: '', text: '' });

        try {
            // Save Delivery Settings
            const deliveryRef = doc(db, 'settings', 'delivery');
            await setDoc(deliveryRef, {
                cutoffTime: Number(cutoffTime),
                closedDaysOfWeek: closedDays,
                blackoutDates: blackoutDates
            }, { merge: true });

            // Save Featured Products
            const featRef = doc(db, 'settings', 'featured');
            await setDoc(featRef, { productIds: featuredIds }, { merge: true });

            setMessage({ type: 'success', text: '¡Configuración guardada exitosamente!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error("Error guardando:", error);
            setMessage({ type: 'error', text: 'Error al guardar. Intenta de nuevo.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-10 text-zinc-400 lowercase animate-pulse">cargando configuración...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto px-8 py-10 font-sans pb-32">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className={`text-4xl text-zinc-900 ${cormorant.className}`}>configuración</h1>
                    <p className="text-zinc-500 text-sm lowercase mt-1">gestiona la tienda y entregas.</p>
                </div>

                <button onClick={handleSave} disabled={isSaving} className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-800 active:scale-95 transition-all lowercase disabled:opacity-50">
                    <Save size={18} /> {isSaving ? 'guardando...' : 'guardar cambios'}
                </button>
            </div>

            {message.text && (
                <div className={`p-4 rounded-xl mb-6 text-sm font-bold lowercase border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-6">
                {/* PRODUCTOS DESTACADOS SECTION */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="bg-yellow-50 text-yellow-600 p-2 rounded-lg"><Star size={20} /></div>
                        <div>
                            <h2 className="font-bold text-zinc-900 text-lg lowercase">productos destacados (home)</h2>
                            <p className="text-xs text-zinc-500 lowercase">selecciona qué productos aparecen en la página principal y su orden.</p>
                        </div>
                    </div>

                    <div className="flex gap-3 mb-6">
                        <select
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 transition-all flex-1 font-medium text-zinc-700"
                        >
                            <option value="">selecciona un producto...</option>
                            {allProducts.filter(p => !featuredIds.includes(p.id)).map(product => (
                                <option key={product.id} value={product.id}>{product.name}</option>
                            ))}
                        </select>
                        <button onClick={addFeaturedProduct} disabled={!selectedProductId} className="bg-zinc-100 text-zinc-800 px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors flex items-center gap-2 lowercase">
                            <Plus size={18} /> agregar
                        </button>
                    </div>

                    <div className="space-y-2">
                        {featuredIds.map((id, index) => {
                            const product = allProducts.find(p => p.id === id);
                            if (!product) return null;
                            return (
                                <div key={id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                    <span className="bg-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-zinc-400 border border-gray-100">{index + 1}</span>
                                    <span className="flex-1 font-bold text-zinc-800 lowercase">{product.name}</span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => moveFeatured(index, 'up')} disabled={index === 0} className="p-2 hover:bg-white rounded-lg text-zinc-400 hover:text-black disabled:opacity-30"><ArrowUp size={16} /></button>
                                        <button onClick={() => moveFeatured(index, 'down')} disabled={index === featuredIds.length - 1} className="p-2 hover:bg-white rounded-lg text-zinc-400 hover:text-black disabled:opacity-30"><ArrowDown size={16} /></button>
                                        <button onClick={() => removeFeaturedProduct(id)} className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 ml-2"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* HORA DE CORTE SECTION */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="bg-blue-50 text-blue-600 p-2 rounded-lg"><Clock size={20} /></div>
                        <div>
                            <h2 className="font-bold text-zinc-900 text-lg lowercase">hora límite de pedidos (corte)</h2>
                            <p className="text-xs text-zinc-500 lowercase">los pedidos después de esta hora pasan al día siguiente.</p>
                        </div>
                    </div>
                    <select value={cutoffTime} onChange={(e) => setCutoffTime(Number(e.target.value))} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 transition-all w-48 font-bold text-zinc-700">
                        {[12, 13, 14, 15, 16, 17, 18, 19, 20].map(h => (
                            <option key={h} value={h}>{h === 12 ? '12:00 PM (Mediodía)' : `${h - 12}:00 PM`}</option>
                        ))}
                    </select>
                </div>

                {/* DÍAS CERRADOS SECTION */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="bg-orange-50 text-orange-600 p-2 rounded-lg"><CalendarDays size={20} /></div>
                        <div>
                            <h2 className="font-bold text-zinc-900 text-lg lowercase">días de descanso fijo</h2>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {DAYS_OF_WEEK.map(day => (
                            <button key={day.id} onClick={() => toggleDay(day.id)} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all lowercase border ${closedDays.includes(day.id) ? 'bg-orange-100 text-orange-800 border-orange-200 shadow-sm' : 'bg-white text-zinc-400 border-gray-200 hover:border-zinc-300'}`}>{day.name}</button>
                        ))}
                    </div>
                </div>

                {/* FESTIVOS SECTION */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="bg-red-50 text-red-600 p-2 rounded-lg"><CalendarX size={20} /></div>
                        <div>
                            <h2 className="font-bold text-zinc-900 text-lg lowercase">días festivos y vacaciones</h2>
                        </div>
                    </div>
                    <div className="flex gap-3 mb-6">
                        <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 transition-all text-zinc-700 flex-1 max-w-xs font-medium" />
                        <button onClick={handleAddDate} disabled={!newDate} className="bg-zinc-100 text-zinc-800 px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors flex items-center gap-2 lowercase disabled:opacity-50"><Plus size={18} /> agregar fecha</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {blackoutDates.map(date => {
                            const dateObj = new Date(date + 'T00:00:00Z');
                            const displayDate = dateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
                            return (
                                <div key={date} className="bg-red-50/50 border border-red-100 p-3 rounded-xl flex items-center justify-between">
                                    <span className="text-sm font-bold text-red-900 lowercase">{displayDate}</span>
                                    <button onClick={() => handleRemoveDate(date)} className="text-red-400 hover:text-red-600 hover:bg-red-100 p-1.5 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}