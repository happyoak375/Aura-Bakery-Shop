'use client';

import { useState } from 'react';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { ChefHat, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function ImportPdfPage() {
    const [status, setStatus] = useState<string>("Listo para importar el primer lote del PDF.");
    const [isMigrating, setIsMigrating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleImport = async () => {
        setIsMigrating(true);
        setStatus("Inyectando recetas...");

        try {
            const batch = writeBatch(db);

            // 1. CREAR EL WIP: Streusel Base
            const streuselRef = doc(db, "inventory_items", "wip-streusel-base");
            batch.set(streuselRef, {
                name: "Streusel Base",
                type: "wip",
                category: "Pre-producción",
                unit: "g",
                costPerUnit: 0,
                currentStock: 0,
                minStockLevel: 500,
                bom: [
                    { inventoryItemId: "harina-trigo-fuerte", quantity: 60 },
                    { inventoryItemId: "azucar-morena", quantity: 25 },
                    { inventoryItemId: "azucar-blanca", quantity: 25 },
                    { inventoryItemId: "mantequilla", quantity: 55 },
                    { inventoryItemId: "canela", quantity: 1 },
                    { inventoryItemId: "sal", quantity: 1 }
                ]
            });

            // 2. ACTUALIZAR EL PRODUCTO FINAL: Muffin de Arándanos
            const muffinArandanosRef = doc(db, "inventory_items", "muffin-arandanos");
            batch.update(muffinArandanosRef, {
                bom: [
                    { inventoryItemId: "harina-trigo-fuerte", quantity: 250 },
                    { inventoryItemId: "azucar-blanca", quantity: 180 },
                    { inventoryItemId: "polvo-hornear", quantity: 8 },
                    { inventoryItemId: "sal", quantity: 3 },
                    { inventoryItemId: "huevos-aa", quantity: 100 }, // 2 unidades = ~100g
                    { inventoryItemId: "mantequilla", quantity: 115 },
                    { inventoryItemId: "yogurt-griego", quantity: 120 },
                    { inventoryItemId: "esencia-vainilla", quantity: 5 },
                    { inventoryItemId: "limon", quantity: 1 }, // Ralladura (asumimos 1 limón)
                    { inventoryItemId: "arandanos", quantity: 300 },
                    { inventoryItemId: "wip-streusel-base", quantity: 15 } // Consumo estimado de topping
                ]
            });

            await batch.commit();

            setIsSuccess(true);
            setStatus("🚀 ¡Recetas inyectadas con éxito! Streusel y Muffins actualizados.");
        } catch (error: any) {
            console.error(error);
            setStatus(`❌ Error: ${error.message}`);
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 max-w-lg w-full text-center">
                <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    {isSuccess ? <CheckCircle2 size={32} className="text-green-500" /> : <ChefHat size={32} />}
                </div>

                <h1 className="text-2xl font-bold text-zinc-900 mb-2">Importar Recetas (Lote 1)</h1>
                <p className="text-sm text-zinc-500 mb-6 px-4">
                    Esto creará el WIP <b>Streusel Base</b> y actualizará el <b>Muffin de Arándanos</b> vinculando ambos niveles.
                </p>

                <button
                    onClick={handleImport}
                    disabled={isMigrating || isSuccess}
                    className="w-full bg-black text-white font-bold py-4 rounded-xl transition-all hover:bg-zinc-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mb-4 shadow-md"
                >
                    {isMigrating ? 'Cocinando datos...' : isSuccess ? 'Recetas Cargadas' : 'Inyectar Recetas PDF'}
                </button>

                <p className={`text-sm font-bold ${isSuccess ? 'text-green-600' : 'text-zinc-600'}`}>
                    {status}
                </p>
            </div>
        </div>
    );
}