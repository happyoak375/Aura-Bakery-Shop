'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, DollarSign, CreditCard, TrendingUp, Package } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Cormorant_Garamond } from 'next/font/google';

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ['600'] });

interface AnalyticsData {
    revenueToday: number;
    revenueWeek: number;
    revenueMonth: number;
    paymentSplits: { method: string; amount: number; percentage: number }[];
    topProducts: { name: string; quantity: number; revenue: number }[];
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // 1. Fetch only PAID orders
                const q = query(collection(db, 'orders'), where('paymentStatus', '==', 'PAGADO'));
                const querySnapshot = await getDocs(q);

                const now = new Date();
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                const startOfWeek = startOfToday - (7 * 24 * 60 * 60 * 1000);
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

                let revToday = 0;
                let revWeek = 0;
                let revMonth = 0;
                let totalRev = 0;

                const paymentTotals: Record<string, number> = {};
                const productTotals: Record<string, { quantity: number; revenue: number }> = {};

                querySnapshot.docs.forEach(doc => {
                    const order = doc.data();
                    // Firebase timestamp conversion safely
                    const orderTime = order.createdAt?.toDate ? order.createdAt.toDate().getTime() : order.createdAt?.toMillis ? order.createdAt.toMillis() : 0;
                    const amount = order.totalAmount || 0;
                    const method = order.paymentMethod || 'desconocido';

                    // Time-based Revenue
                    if (orderTime >= startOfToday) revToday += amount;
                    if (orderTime >= startOfWeek) revWeek += amount;
                    if (orderTime >= startOfMonth) revMonth += amount;
                    totalRev += amount;

                    // Payment Method Splits
                    paymentTotals[method] = (paymentTotals[method] || 0) + amount;

                    // Top Products Calculation
                    if (order.items && Array.isArray(order.items)) {
                        order.items.forEach((item: any) => {
                            const name = item.name || 'Producto';
                            const qty = item.quantity || 1;
                            const price = item.price || 0;

                            if (!productTotals[name]) {
                                productTotals[name] = { quantity: 0, revenue: 0 };
                            }
                            productTotals[name].quantity += qty;
                            productTotals[name].revenue += (qty * price);
                        });
                    }
                });

                // Format Payment Splits
                const splits = Object.keys(paymentTotals).map(method => ({
                    method,
                    amount: paymentTotals[method],
                    percentage: totalRev > 0 ? Math.round((paymentTotals[method] / totalRev) * 100) : 0
                })).sort((a, b) => b.amount - a.amount);

                // Format Top Products
                const topItems = Object.keys(productTotals).map(name => ({
                    name,
                    quantity: productTotals[name].quantity,
                    revenue: productTotals[name].revenue
                })).sort((a, b) => b.quantity - a.quantity).slice(0, 5); // Top 5

                setData({
                    revenueToday: revToday,
                    revenueWeek: revWeek,
                    revenueMonth: revMonth,
                    paymentSplits: splits,
                    topProducts: topItems
                });

            } catch (error) {
                console.error("Error fetching analytics:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    return (
        <div className="max-w-6xl mx-auto px-6 py-10 font-sans">
            <div className="mb-8">
                <Link href="/admin" className="text-sm font-bold text-zinc-400 hover:text-black flex items-center gap-2 w-fit mb-6 transition-colors">
                    <ArrowLeft size={16} /> volver al panel
                </Link>

                <h1 className={`text-4xl text-zinc-900 ${cormorant.className} flex items-center gap-3`}>
                    <BarChart3 size={32} className="text-blue-600" />
                    Métricas y Ventas
                </h1>
                <p className="text-zinc-500 mt-2">Rendimiento financiero en tiempo real y productos más vendidos.</p>
            </div>

            {isLoading || !data ? (
                <div className="flex h-40 items-center justify-center text-zinc-400 animate-pulse font-medium bg-white rounded-3xl border border-gray-100">
                    Calculando métricas...
                </div>
            ) : (
                <div className="space-y-6">
                    {/* REVENUE KPI CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                <DollarSign size={18} /> <span className="font-bold text-xs uppercase tracking-widest">Hoy</span>
                            </div>
                            <div className="text-3xl font-black text-zinc-900">${data.revenueToday.toLocaleString('es-CO')}</div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                <TrendingUp size={18} /> <span className="font-bold text-xs uppercase tracking-widest">Últimos 7 Días</span>
                            </div>
                            <div className="text-3xl font-black text-zinc-900">${data.revenueWeek.toLocaleString('es-CO')}</div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                <BarChart3 size={18} /> <span className="font-bold text-xs uppercase tracking-widest">Este Mes</span>
                            </div>
                            <div className="text-3xl font-black text-zinc-900">${data.revenueMonth.toLocaleString('es-CO')}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* PAYMENT METHODS */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
                                <CreditCard size={18} className="text-zinc-400" /> Distribución de Pagos
                            </h3>
                            <div className="space-y-5">
                                {data.paymentSplits.length === 0 ? (
                                    <p className="text-sm text-zinc-400">No hay pagos registrados.</p>
                                ) : (
                                    data.paymentSplits.map((split, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="font-bold uppercase tracking-wider text-zinc-700 text-xs">{split.method}</span>
                                                <span className="font-bold text-zinc-900">${split.amount.toLocaleString('es-CO')} ({split.percentage}%)</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                                <div className="bg-black h-2.5 rounded-full" style={{ width: `${split.percentage}%` }}></div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* TOP PRODUCTS */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <h3 className="font-bold text-zinc-900 mb-6 flex items-center gap-2">
                                <Package size={18} className="text-zinc-400" /> Top 5 Productos
                            </h3>
                            <div className="space-y-4">
                                {data.topProducts.length === 0 ? (
                                    <p className="text-sm text-zinc-400">No hay ventas registradas.</p>
                                ) : (
                                    data.topProducts.map((product, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-black text-zinc-300 text-xs border border-gray-100 shadow-sm">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-zinc-900 text-sm">{product.name}</p>
                                                    <p className="text-xs text-zinc-500">{product.quantity} unidades vendidas</p>
                                                </div>
                                            </div>
                                            <div className="font-black text-zinc-900 text-sm">
                                                ${product.revenue.toLocaleString('es-CO')}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}