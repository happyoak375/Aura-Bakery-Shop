'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, AlertTriangle, CheckCircle2, PackageOpen } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { fetchInventoryItems, InventoryItem } from '../../../lib/api';
import { Cormorant_Garamond } from 'next/font/google';

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ['600'] });

interface DemandItem {
    id: string;
    name: string;
    unit: string;
    currentStock: number;
    needed: number;
}

export default function KitchenForecastPage() {
    const [demandData, setDemandData] = useState<DemandItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const generateForecast = async () => {
            try {
                // 1. Fetch entire inventory to resolve BOMs
                const inventory = await fetchInventoryItems();

                // 2. Fetch all active orders (NUEVO, CONFIRMADO, PREPARANDO)
                const q = query(
                    collection(db, 'orders'),
                    where('orderStatus', 'in', ['NUEVO', 'CONFIRMADO', 'PREPARANDO'])
                );
                const orderSnaps = await getDocs(q);

                // 3. Aggregate Demand
                const rawDemand = new Map<string, DemandItem>();

                orderSnaps.docs.forEach(doc => {
                    const order = doc.data();

                    // Loop through every item in the order
                    order.items?.forEach((orderItem: any) => {
                        const productId = orderItem.productId || orderItem.id;
                        const product = inventory.find(i => i.id === productId);

                        // If the product has a recipe (BOM), explode it into raw materials
                        if (product && product.bom && product.bom.length > 0) {
                            product.bom.forEach(bomItem => {
                                const rawMaterial = inventory.find(i => i.id === bomItem.inventoryItemId);

                                if (rawMaterial) {
                                    const amountNeeded = bomItem.quantity * orderItem.quantity;

                                    if (rawDemand.has(rawMaterial.id!)) {
                                        rawDemand.get(rawMaterial.id!)!.needed += amountNeeded;
                                    } else {
                                        rawDemand.set(rawMaterial.id!, {
                                            id: rawMaterial.id!,
                                            name: rawMaterial.name,
                                            unit: rawMaterial.unit,
                                            currentStock: rawMaterial.currentStock,
                                            needed: amountNeeded
                                        });
                                    }
                                }
                            });
                        }
                    });
                });

                // Convert Map to sorted array
                const aggregated = Array.from(rawDemand.values()).sort((a, b) => b.needed - a.needed);
                setDemandData(aggregated);

            } catch (error) {
                console.error("Error generating forecast:", error);
            } finally {
                setIsLoading(false);
            }
        };

        generateForecast();
    }, []);

    return (
        <div className="max-w-6xl mx-auto px-6 py-10 font-sans">
            <div className="mb-8">
                <Link href="/admin" className="text-sm font-bold text-zinc-400 hover:text-black flex items-center gap-2 w-fit mb-6 transition-colors">
                    <ArrowLeft size={16} /> volver al panel
                </Link>

                <h1 className={`text-4xl text-zinc-900 ${cormorant.className} flex items-center gap-3`}>
                    <TrendingUp size={32} className="text-blue-600" />
                    proyección de producción
                </h1>
                <p className="text-zinc-500 mt-2">Cálculo de insumos requeridos basado en órdenes web activas.</p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[400px]">
                {isLoading ? (
                    <div className="flex h-40 items-center justify-center text-zinc-400 animate-pulse font-medium">
                        Analizando recetas y órdenes activas...
                    </div>
                ) : demandData.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
                        <PackageOpen size={48} className="mx-auto text-zinc-300 mb-4" />
                        <h3 className="text-lg font-bold text-zinc-900">No hay demanda proyectada</h3>
                        <p className="text-zinc-500 text-sm mt-1">No hay órdenes activas que requieran preparación en este momento.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                    <th className="pb-4 px-4">Insumo / Materia Prima</th>
                                    <th className="pb-4 px-4 text-right">Stock Actual</th>
                                    <th className="pb-4 px-4 text-right">Requerido (Órdenes)</th>
                                    <th className="pb-4 px-4 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {demandData.map((item) => {
                                    const isDeficit = item.currentStock < item.needed;

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-4 font-medium text-zinc-900">{item.name}</td>
                                            <td className="py-4 px-4 text-right text-zinc-600">
                                                {item.currentStock.toLocaleString('es-CO')} <span className="text-xs text-zinc-400">{item.unit}</span>
                                            </td>
                                            <td className="py-4 px-4 text-right font-bold text-zinc-900">
                                                {item.needed.toLocaleString('es-CO')} <span className="text-xs text-zinc-400">{item.unit}</span>
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                {isDeficit ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-red-100">
                                                        <AlertTriangle size={12} /> Faltan {(item.needed - item.currentStock).toLocaleString('es-CO')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-green-100">
                                                        <CheckCircle2 size={12} /> Suficiente
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}