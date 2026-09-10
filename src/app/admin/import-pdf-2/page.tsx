'use client';

import { useState } from 'react';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Coffee, CheckCircle2 } from 'lucide-react';

export default function ImportPdfLote2Page() {
    const [status, setStatus] = useState<string>("Listo para importar el Lote 2 (Pastéis y Café).");
    const [isMigrating, setIsMigrating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleImport = async () => {
        setIsMigrating(true);
        setStatus("Preparando hojaldre y crema...");

        try {
            const batch = writeBatch(db);

            // 1. CREAR EL WIP: Hojaldre Base
            const hojaldreRef = doc(db, "inventory_items", "wip-hojaldre-base");
            batch.set(hojaldreRef, {
                name: "Hojaldre Base",
                type: "wip",
                category: "Pre-producción",
                unit: "g",
                costPerUnit: 0,
                currentStock: 0,
                minStockLevel: 1000,
                bom: [
                    { inventoryItemId: "harina-trigo-fuerte", quantity: 350 }, // Repostera
                    { inventoryItemId: "harina-trigo", quantity: 150 }, // Panadera
                    { inventoryItemId: "sal", quantity: 10 },
                    { inventoryItemId: "azucar-blanca", quantity: 10 },
                    { inventoryItemId: "mantequilla", quantity: 320 }
                ]
            });

            // 2. CREAR EL WIP: Crema Pastéis
            const cremaRef = doc(db, "inventory_items", "wip-crema-pasteis");
            batch.set(cremaRef, {
                name: "Crema Pastéis",
                type: "wip",
                category: "Pre-producción",
                unit: "g",
                costPerUnit: 0,
                currentStock: 0,
                minStockLevel: 1000,
                bom: [
                    { inventoryItemId: "leche-entera", quantity: 500 },
                    { inventoryItemId: "crema-de-leche", quantity: 250 },
                    { inventoryItemId: "harina-trigo", quantity: 40 },
                    { inventoryItemId: "huevos-aa", quantity: 120 }, // ~ Yemas
                    { inventoryItemId: "azucar-blanca", quantity: 250 },
                    { inventoryItemId: "agua", quantity: 125 },
                    { inventoryItemId: "limon", quantity: 0.5 }, // Media cáscara
                    { inventoryItemId: "canela", quantity: 5 }
                ]
            });

            // 3. ACTUALIZAR PRODUCTO FINAL: Pasteis de Nata
            const pasteisRef = doc(db, "inventory_items", "pasteis-de-nata");
            batch.update(pasteisRef, {
                bom: [
                    { inventoryItemId: "wip-hojaldre-base", quantity: 45 },
                    { inventoryItemId: "wip-crema-pasteis", quantity: 30 }
                ]
            });

            // 4. ACTUALIZAR PRODUCTO FINAL: Latte
            const latteRef = doc(db, "inventory_items", "latte");
            batch.update(latteRef, {
                bom: [
                    { inventoryItemId: "cafe-grano", quantity: 18 },
                    { inventoryItemId: "leche-entera", quantity: 200 },
                    { inventoryItemId: "vaso-12oz", quantity: 1 }
                ]
            });

            await batch.commit();

            setIsSuccess(true);
            setStatus("🚀 ¡Lote 2 inyectado! Pastéis y Lattes estructurados.");
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
                <div className="w-16 h-16 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    {isSuccess ? <CheckCircle2 size={32} className="text-green-500" /> : <Coffee size={32} />}
                </div>

                <h1 className="text-2xl font-bold text-zinc-900 mb-2">Importar Recetas (Lote 2)</h1>
                <p className="text-sm text-zinc-500 mb-6 px-4">
                    Esto creará los WIPs <b>Hojaldre Base</b> y <b>Crema Pastéis</b>, y actualizará la receta de los <b>Pastéis de Nata</b> y el <b>Latte</b>.
                </p>

                <button
                    onClick={handleImport}
                    disabled={isMigrating || isSuccess}
                    className="w-full bg-black text-white font-bold py-4 rounded-xl transition-all hover:bg-zinc-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mb-4 shadow-md"
                >
                    {isMigrating ? 'Procesando recetas...' : isSuccess ? 'Recetas Cargadas' : 'Inyectar Lote 2'}
                </button>

                <p className={`text-sm font-bold ${isSuccess ? 'text-green-600' : 'text-zinc-600'}`}>
                    {status}
                </p>
            </div>
        </div>
    );
}