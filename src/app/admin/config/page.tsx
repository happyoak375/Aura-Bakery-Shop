'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { DEFAULT_DELIVERY_TIME_SLOTS, fetchAllProductsAdmin } from '../../../lib/api';
import { Product } from '../../../lib/mockData';
import { Settings, CalendarX, Clock, Save, Trash2, Plus, CalendarDays, Star, ArrowUp, ArrowDown, Timer } from 'lucide-react';
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

    // Delivery States
    const [cutoffTime, setCutoffTime] = useState(17);
    const [closedDays, setClosedDays] = useState<number[]>([]);
    const [blackoutDates, setBlackoutDates] = useState<string[]>([]);
    const [deliveryWindows, setDeliveryWindows] = useState<string[]>([]);

    // UI Helper States
    const [newDate, setNewDate] = useState('');
    const [newWindow, setNewWindow] = useState('');

    // Featured States
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [featuredIds, setFeaturedIds] = useState<string[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');

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
                    setDeliveryWindows(data.deliveryWindows || ["Mañana (8:00 AM - 12:00 PM)", "Tarde (1:00 PM - 5:00 PM)"]);
                }

                const featRef = doc(db, 'settings', 'featured');
                const featSnap = await getDoc(featRef);
                if (featSnap.exists()) {
                    setFeaturedIds(featSnap.data().productIds || []);
                }

                const products = await fetchAllProductsAdmin();
                setAllProducts(products);
            } catch (error) {
                console.error("Error loading config:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchConfigAndProducts();
    }, []);

    // --- Handlers ---
    const handleSave = async () => {
        setIsSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await setDoc(doc(db, 'settings', 'delivery'), {
                cutoffTime: Number(cutoffTime),
                closedDaysOfWeek: closedDays,
                blackoutDates: blackoutDates,
                deliveryWindows: deliveryWindows
            }, { merge: true });

            await setDoc(doc(db, 'settings', 'featured'), { productIds: featuredIds }, { merge: true });

            setMessage({ type: 'success', text: '¡Cambios guardados!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al guardar.' });
        } finally {
            setIsSaving(false);
        }
    };

    const addWindow = () => {
        if (!newWindow || deliveryWindows.includes(newWindow)) return;
        setDeliveryWindows([...deliveryWindows, newWindow]);
        setNewWindow('');
    };

    const removeWindow = (win: string) => {
        setDeliveryWindows(deliveryWindows.filter(w => w !== win));
    };

    if (isLoading) return <div className="p-10 text-zinc-400 lowercase animate-pulse">cargando...</div>;

    return (
        <div className="max-w-4xl mx-auto px-8 py-10 font-sans pb-32">
            <div className="flex items-center justify-between mb-8">
                <h1 className={`text-4xl text-zinc-900 ${cormorant.className}`}>configuración</h1>
                <button onClick={handleSave} disabled={isSaving} className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all lowercase disabled:opacity-50">
                    <Save size={18} /> {isSaving ? 'guardando...' : 'guardar cambios'}
                </button>
            </div>

            {message.text && (
                <div className={`p-4 rounded-xl mb-6 text-sm font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-6">
                {/* JORNADAS DE ENTREGA */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="bg-purple-50 text-purple-600 p-2 rounded-lg"><Timer size={20} /></div>
                        <div>
                            <h2 className="font-bold text-zinc-900 text-lg lowercase">jornadas de entrega</h2>
                            <p className="text-xs text-zinc-500 lowercase">define los rangos horarios que el cliente puede elegir.</p>
                        </div>
                    </div>

                    <div className="flex gap-3 mb-4">
                        <input
                            type="text"
                            placeholder="Ej: Mañana (8:00 AM - 12:00 PM)"
                            value={newWindow}
                            onChange={(e) => setNewWindow(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black transition-all flex-1"
                        />
                        <button onClick={addWindow} className="bg-zinc-100 px-6 py-3 rounded-xl font-bold hover:bg-zinc-200"><Plus size={18} /></button>
                    </div>

                    <div className="space-y-2">
                        {deliveryWindows.map(win => (
                            <div key={win} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <span className="text-sm font-medium text-zinc-700 lowercase">{win}</span>
                                <button onClick={() => removeWindow(win)} className="text-red-400 hover:text-red-600 p-1.5"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DESTACADOS */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="bg-yellow-50 text-yellow-600 p-2 rounded-lg"><Star size={20} /></div>
                        <h2 className="font-bold text-zinc-900 text-lg lowercase">productos destacados</h2>
                    </div>
                    <div className="flex gap-3 mb-4">
                        <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none flex-1">
                            <option value="">selecciona un producto...</option>
                            {allProducts.filter(p => !featuredIds.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button onClick={() => { if (selectedProductId) { setFeaturedIds([...featuredIds, selectedProductId]); setSelectedProductId(''); } }} className="bg-zinc-100 px-6 py-3 rounded-xl font-bold"><Plus size={18} /></button>
                    </div>
                    <div className="space-y-2">
                        {featuredIds.map((id, index) => (
                            <div key={id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <span className="bg-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-400">{index + 1}</span>
                                <span className="flex-1 font-bold text-zinc-800 lowercase">{allProducts.find(p => p.id === id)?.name}</span>
                                <button onClick={() => setFeaturedIds(featuredIds.filter(i => i !== id))} className="text-red-400"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* DÍAS CERRADOS & FESTIVOS (Minimal versions for brevity) */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h2 className="font-bold text-zinc-900 text-lg lowercase mb-4">días de descanso</h2>
                    <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map(day => (
                            <button key={day.id} onClick={() => setClosedDays(prev => prev.includes(day.id) ? prev.filter(d => d !== day.id) : [...prev, day.id])} className={`px-4 py-2 rounded-xl text-xs font-bold lowercase border ${closedDays.includes(day.id) ? 'bg-orange-100 border-orange-200' : 'bg-white border-gray-200'}`}>{day.name}</button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
