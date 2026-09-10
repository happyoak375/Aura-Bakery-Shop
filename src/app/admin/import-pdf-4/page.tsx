'use client';

import { useState } from 'react';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { CheckCircle2, LayoutTemplate } from 'lucide-react';

export default function ImportPdfLote4Page() {
    const [status, setStatus] = useState<string>("Listo para importar el Lote 4 (Esqueletos B/C).");
    const [isMigrating, setIsMigrating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleImport = async () => {
        setIsMigrating(true);
        setStatus("Construyendo arquitectura base...");

        try {
            const batch = writeBatch(db);

            // 1. CREAR WIP: Crema Pastelera (Sección 6 del PDF)
            const cremaPasteleraRef = doc(db, "inventory_items", "wip-crema-pastelera");
            batch.set(cremaPasteleraRef, {
                name: "Crema Pastelera",
                type: "wip",
                category: "Pre-producción",
                unit: "g",
                costPerUnit: 0,
                currentStock: 0,
                minStockLevel: 500,
                bom: [] // PENDIENTE: Chef debe llenarlo en UI
            });

            // 2. CREAR WIP: Masa Brioche / Babkas
            const briocheRef = doc(db, "inventory_items", "wip-masa-brioche");
            batch.set(briocheRef, {
                name: "Masa Brioche (Base)",
                type: "wip",
                category: "Pre-producción",
                unit: "g",
                costPerUnit: 0,
                currentStock: 0,
                minStockLevel: 1000,
                bom: [] // PENDIENTE
            });

            // 3. CREAR WIP: Brownie Base
            const brownieRef = doc(db, "inventory_items", "wip-brownie-base");
            batch.set(brownieRef, {
                name: "Brownie Base (Para postres)",
                type: "wip",
                category: "Pre-producción",
                unit: "g",
                costPerUnit: 0,
                currentStock: 0,
                minStockLevel: 1000,
                bom: [] // PENDIENTE
            });

            // 4. CREAR WIP: Biscuit Tiramisú y Syrup
            const biscuitRef = doc(db, "inventory_items", "wip-biscuit-tiramisu");
            batch.set(biscuitRef, {
                name: "Bizcocho / Biscuit Tiramisú",
                type: "wip",
                category: "Pre-producción",
                unit: "g",
                costPerUnit: 0,
                currentStock: 0,
                minStockLevel: 500,
                bom: [] // PENDIENTE
            });

            // 5. ACTUALIZAR PRODUCTO FINAL: Tiramisú (Vinculándolo a sus WIPs vacíos)
            const tiramisuRef = doc(db, "inventory_items", "tiramisu-clásico");
            batch.update(tiramisuRef, {
                bom: [
                    { inventoryItemId: "wip-biscuit-tiramisu", quantity: 0 }, // Pendiente definir porción
                    { inventoryItemId: "cocoa-polvo", quantity: 0 } // Pendiente definir espolvoreado
                ]
            });

            await batch.commit();
            setIsSuccess(true);
            setStatus("🚀 ¡Lote 4 inyectado! Esqueletos arquitectónicos listos para el Chef.");
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
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    {isSuccess ? <CheckCircle2 size={32} className="text-green-500" /> : <LayoutTemplate size={32} />}
                </div>
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">Importar Recetas (Lote 4)</h1>
                <p className="text-sm text-zinc-500 mb-6 px-4">
                    Creará las bases (WIP) de nivel B/C: <b>Brioche, Crema Pastelera y Brownie</b>. Las cantidades exactas quedan listas para que cocina las defina desde el panel.
                </p>
                <button
                    onClick={handleImport}
                    disabled={isMigrating || isSuccess}
                    className="w-full bg-black text-white font-bold py-4 rounded-xl transition-all hover:bg-zinc-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mb-4 shadow-md"
                >
                    {isMigrating ? 'Construyendo...' : isSuccess ? 'Estructura Lista' : 'Inyectar Esqueletos'}
                </button>
                <p className={`text-sm font-bold ${isSuccess ? 'text-green-600' : 'text-zinc-600'}`}>
                    {status}
                </p>
            </div>
        </div>
    );
}