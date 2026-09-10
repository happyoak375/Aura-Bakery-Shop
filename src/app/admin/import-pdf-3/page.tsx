'use client';

import { useState } from 'react';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { CheckCircle2, EggFried } from 'lucide-react';

export default function ImportPdfLote3Page() {
    const [status, setStatus] = useState<string>("Listo para importar el Lote 3 (Muffins Salados).");
    const [isMigrating, setIsMigrating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleImport = async () => {
        setIsMigrating(true);
        setStatus("Preparando masa salada...");

        try {
            const batch = writeBatch(db);

            // 1. CREAR EL WIP: Masa Base Muffins Salados (Batch ~900g)
            const masaSaladaRef = doc(db, "inventory_items", "wip-masa-muffins-salados");
            batch.set(masaSaladaRef, {
                name: "Masa Base Muffins Salados",
                type: "wip",
                category: "Pre-producción",
                unit: "g",
                costPerUnit: 0,
                currentStock: 0,
                minStockLevel: 500,
                bom: [
                    { inventoryItemId: "harina-trigo", quantity: 300 },
                    { inventoryItemId: "polvo-hornear", quantity: 8 },
                    { inventoryItemId: "bicarbonato", quantity: 2 },
                    { inventoryItemId: "sal", quantity: 5 },
                    { inventoryItemId: "azucar-blanca", quantity: 15 },
                    { inventoryItemId: "huevos-aa", quantity: 100 },
                    { inventoryItemId: "yogurt-griego", quantity: 230 },
                    { inventoryItemId: "leche-entera", quantity: 100 },
                    { inventoryItemId: "mantequilla", quantity: 100 },
                    { inventoryItemId: "aceite-girasol", quantity: 40 }
                ]
            });

            // 2. ACTUALIZAR PRODUCTO FINAL: Muffin de Quesos
            // OJO: Asumimos que rinde para medio batch (450g) como dicta el PDF
            const muffinQuesoRef = doc(db, "inventory_items", "muffin-queso");
            batch.update(muffinQuesoRef, {
                bom: [
                    { inventoryItemId: "wip-masa-muffins-salados", quantity: 54 }, // 450g dividido entre ~8.27 unidades
                    { inventoryItemId: "queso-crema", quantity: 3 } // 25g div 8.27
                    // Falta crear queso-fresco y queso-mozzarella como raw_materials para completarlo
                ]
            });

            // 3. ACTUALIZAR PRODUCTO FINAL: Muffin Queso y Tocineta
            const muffinTocinetaRef = doc(db, "inventory_items", "muffin-queso-tocineta");
            batch.update(muffinTocinetaRef, {
                bom: [
                    { inventoryItemId: "wip-masa-muffins-salados", quantity: 53 } // 450g dividido entre ~8.4 unidades
                    // Falta crear tocineta como raw_material
                ]
            });

            await batch.commit();
            setIsSuccess(true);
            setStatus("🚀 ¡Lote 3 inyectado! Muffins salados actualizados.");
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
                    {isSuccess ? <CheckCircle2 size={32} className="text-green-500" /> : <EggFried size={32} />}
                </div>
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">Importar Recetas (Lote 3)</h1>
                <p className="text-sm text-zinc-500 mb-6 px-4">
                    Esto creará el WIP <b>Masa Muffins Salados</b> y actualizará las variantes de queso y tocineta.
                </p>
                <button
                    onClick={handleImport}
                    disabled={isMigrating || isSuccess}
                    className="w-full bg-black text-white font-bold py-4 rounded-xl transition-all hover:bg-zinc-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mb-4 shadow-md"
                >
                    {isMigrating ? 'Cocinando recetas...' : isSuccess ? 'Recetas Cargadas' : 'Inyectar Lote 3'}
                </button>
                <p className={`text-sm font-bold ${isSuccess ? 'text-green-600' : 'text-zinc-600'}`}>
                    {status}
                </p>
            </div>
        </div>
    );
}