'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Settings, CalendarX, Clock, Save, Trash2, Plus, CalendarDays } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ['600'] });

// Mapeo de días para la UI (Domingo es 0 en JavaScript)
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

    // Estado de la configuración
    const [cutoffTime, setCutoffTime] = useState(17);
    const [closedDays, setClosedDays] = useState<number[]>([]);
    const [blackoutDates, setBlackoutDates] = useState<string[]>([]);

    // Estado para agregar un nuevo festivo
    const [newDate, setNewDate] = useState('');

    // 1. Cargar datos actuales de Firebase
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const docRef = doc(db, 'config', 'delivery');
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCutoffTime(data.cutoffTime ?? 17);
                    setClosedDays(data.closedDaysOfWeek ?? [0]);

                    // Ordenar fechas cronológicamente (Asegurando que sea un Array)
                    const rawDates = data.blackoutDates;
                    const dates = Array.isArray(rawDates) ? rawDates : [];
                    setBlackoutDates([...dates].sort());
                }
            } catch (error) {
                console.error("Error al cargar configuración:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConfig();
    }, []);

    // 2. Manejar cambios en los días cerrados
    const toggleDay = (dayId: number) => {
        setClosedDays(prev =>
            prev.includes(dayId)
                ? prev.filter(d => d !== dayId)
                : [...prev, dayId]
        );
    };

    // 3. Manejar festivos
    const handleAddDate = () => {
        if (!newDate) return;
        if (blackoutDates.includes(newDate)) {
            alert("Esta fecha ya está en la lista.");
            return;
        }

        const updatedDates = [...blackoutDates, newDate].sort();
        setBlackoutDates(updatedDates);
        setNewDate('');
    };

    const handleRemoveDate = (dateToRemove: string) => {
        setBlackoutDates(prev => prev.filter(d => d !== dateToRemove));
    };

    // 4. Guardar en Firebase
    const handleSave = async () => {
        setIsSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const docRef = doc(db, 'config', 'delivery');
            await updateDoc(docRef, {
                cutoffTime: Number(cutoffTime),
                closedDaysOfWeek: closedDays,
                blackoutDates: blackoutDates
            });
            setMessage({ type: 'success', text: '¡Configuración guardada exitosamente!' });

            // Limpiar mensaje después de 3 segundos
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
                    <p className="text-zinc-500 text-sm lowercase mt-1">gestiona horarios y días festivos de la panadería.</p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-800 active:scale-95 transition-all lowercase disabled:opacity-50"
                >
                    <Save size={18} /> {isSaving ? 'guardando...' : 'guardar cambios'}
                </button>
            </div>

            {message.text && (
                <div className={`p-4 rounded-xl mb-6 text-sm font-bold lowercase border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-6">

                {/* SECCIÓN 1: HORA DE CORTE */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="bg-blue-50 text-blue-600 p-2 rounded-lg"><Clock size={20} /></div>
                        <div>
                            <h2 className="font-bold text-zinc-900 text-lg lowercase">hora límite de pedidos (corte)</h2>
                            <p className="text-xs text-zinc-500 lowercase">los pedidos que entren después de esta hora se considerarán como pedidos del día siguiente.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <select
                            value={cutoffTime}
                            onChange={(e) => setCutoffTime(Number(e.target.value))}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 transition-all w-48 font-bold text-zinc-700"
                        >
                            <option value={12}>12:00 PM (Mediodía)</option>
                            <option value={13}>1:00 PM</option>
                            <option value={14}>2:00 PM</option>
                            <option value={15}>3:00 PM</option>
                            <option value={16}>4:00 PM</option>
                            <option value={17}>5:00 PM</option>
                            <option value={18}>6:00 PM</option>
                            <option value={19}>7:00 PM</option>
                            <option value={20}>8:00 PM</option>
                        </select>
                    </div>
                </div>

                {/* SECCIÓN 2: DÍAS CERRADOS */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="bg-orange-50 text-orange-600 p-2 rounded-lg"><CalendarDays size={20} /></div>
                        <div>
                            <h2 className="font-bold text-zinc-900 text-lg lowercase">días de descanso fijo</h2>
                            <p className="text-xs text-zinc-500 lowercase">selecciona los días de la semana que la panadería siempre está cerrada.</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {DAYS_OF_WEEK.map(day => (
                            <button
                                key={day.id}
                                onClick={() => toggleDay(day.id)}
                                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all lowercase border ${closedDays.includes(day.id)
                                    ? 'bg-orange-100 text-orange-800 border-orange-200 shadow-sm'
                                    : 'bg-white text-zinc-400 border-gray-200 hover:border-zinc-300'
                                    }`}
                            >
                                {day.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* SECCIÓN 3: FESTIVOS / FECHAS ESPECÍFICAS */}
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                        <div className="bg-red-50 text-red-600 p-2 rounded-lg"><CalendarX size={20} /></div>
                        <div>
                            <h2 className="font-bold text-zinc-900 text-lg lowercase">días festivos y vacaciones</h2>
                            <p className="text-xs text-zinc-500 lowercase">bloquea fechas específicas en el calendario para que los clientes no puedan elegir entregas ese día.</p>
                        </div>
                    </div>

                    {/* Agregar Nueva Fecha */}
                    <div className="flex gap-3 mb-6">
                        <input
                            type="date"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 transition-all text-zinc-700 flex-1 max-w-xs font-medium"
                        />
                        <button
                            onClick={handleAddDate}
                            disabled={!newDate}
                            className="bg-zinc-100 text-zinc-800 px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors flex items-center gap-2 lowercase disabled:opacity-50"
                        >
                            <Plus size={18} /> agregar fecha
                        </button>
                    </div>

                    {/* Lista de Fechas Bloqueadas */}
                    {blackoutDates.length === 0 ? (
                        <div className="p-6 border-2 border-dashed border-gray-200 rounded-2xl text-center text-zinc-400 text-sm lowercase">
                            no hay fechas bloqueadas actualmente.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {blackoutDates.map(date => {
                                // Formatear la fecha para que se vea bonita (ej: "18 may 2026")
                                // Forzamos la zona horaria UTC para evitar problemas de desfase de -1 día
                                const dateObj = new Date(date + 'T00:00:00Z');
                                const displayDate = dateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

                                return (
                                    <div key={date} className="bg-red-50/50 border border-red-100 p-3 rounded-xl flex items-center justify-between group">
                                        <span className="text-sm font-bold text-red-900 lowercase">{displayDate}</span>
                                        <button
                                            onClick={() => handleRemoveDate(date)}
                                            className="text-red-400 hover:text-red-600 hover:bg-red-100 p-1.5 rounded-lg transition-colors"
                                            title="Eliminar fecha"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}