'use client';

import { useState } from 'react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { PackageSearch, AlertTriangle, CheckCircle2 } from 'lucide-react';

// El diccionario exacto de tu exportación
const idDictionary: Record<string, string> = {
    "00001": "cafe-grano-bolsa",
    "3H7iJvrsjkIpd8eKbgcf": "cocoa-polvo",
    "5FIacFGS6CaOe6HCm4pP": "cobertura-chocolate-blanco",
    "74kNjeFiFgVcRBxzrMHj": "muffin-chocolate",
    "7WYgRxOXPTBm56pwpcpu": "crema-de-leche",
    "9xzNG6ivbiENiE8h9y86": "huevos-aa",
    "BTPWgEc3BZMUocStZRQn": "limon",
    "M62EOPptlXniVvK7WAoF": "yogurt-griego",
    "NDzXFrN40mqLGLOIH2IZ": "chocolate-semiamargo",
    "NYfE213uC3PCsCy0L9sU": "azucar-morena",
    "Nrr8wh6hMoDnCORZrAgA": "glucosa",
    "Qo55xfJsLpKq39LVybOX": "arandanos",
    "TN3dhXTrPsYp5FB5jPdM": "bicarbonato",
    "U2eprL2TAPvPj5ePHEDA": "canela",
    "U9U6XuZLRBIgyplbEnQv": "colorante-rojo",
    "dV9UT22L8rOC07KJi8Sh": "wip-nata-pasteis",
    "dhicyzVKxsJHIgzf0cUe": "wip-crema-base-pasteis",
    "ec6jcnCIMjsQGgHJVUg1": "queso-crema",
    "fSnWb6KZSBWpI0IIhE4h": "harina-trigo-fuerte",
    "hfYmna1OS0ddFuRqK2iM": "esencia-vainilla",
    "jJTe3BNFobMdb1t3TnJI": "cobertura-chocolate-negro",
    "mYI7llFK5LUVAZGjbUtE": "muffin-queso-tocineta",
    "oOMMzk0HddSbyo5M0TEJ": "wip-masa-muffins-salados",
    "p6WA104EyTBbXPexjilZ": "sal",
    "pVUiLPehraHcBycL5C3u": "aceite-girasol",
    "qCfIUm3YZZmy85FwuDFJ": "muffin-queso",
    "srbEmhYf69vViqFDCcBQ": "polvo-hornear",
    "tiJfHqAK2ZUHVI43CdRS": "azucar-blanca",
    "u0GMPhut4XYrFWG5wJqc": "wip-jarabe-pasteis",
    "u2wegdOYcF4LNiZL1TcL": "wip-hojaldre",
    "w6QF1akLmOmOXbSzkWar": "agua",
    "xSVhaS3BDKYaE74nvtrn": "muffin-arandanos",
    "zEe63tU8FSbscLSnzq07": "cocoa-alcalina"
};

export default function MigrateIdsPage() {
    const [status, setStatus] = useState<string>("Listo para limpiar IDs de la base de datos.");
    const [isMigrating, setIsMigrating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleMigration = async () => {
        setIsMigrating(true);
        setStatus("Analizando inventario...");

        try {
            const batch = writeBatch(db);
            const inventoryRef = collection(db, "inventory_items");
            const snapshot = await getDocs(inventoryRef);

            let migratedCount = 0;
            let updatedCount = 0;

            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const oldId = docSnap.id;
                let needsUpdate = false;
                let newData = { ...data };

                // 1. Corregir errores tipográficos conocidos
                if (newData.name === "Arándalos") newData.name = "Arándanos";
                if (newData.name === "Muffin de Arándalos") newData.name = "Muffin de Arándanos";

                // 2. Limpiar el BOM si existe
                if (Array.isArray(newData.bom)) {
                    newData.bom = newData.bom.map((b: any) => {
                        const targetId = b.inventoryItemId || b.itemId;
                        if (idDictionary[targetId]) {
                            needsUpdate = true;
                            return { ...b, inventoryItemId: idDictionary[targetId] };
                        }
                        return b;
                    });
                }

                // 3. Determinar qué hacer con el documento
                if (idDictionary[oldId]) {
                    const newId = idDictionary[oldId];
                    const newRef = doc(db, "inventory_items", newId);
                    const oldRef = doc(db, "inventory_items", oldId);

                    batch.set(newRef, newData);
                    batch.delete(oldRef);
                    migratedCount++;
                } else if (needsUpdate) {
                    const currentRef = doc(db, "inventory_items", oldId);
                    batch.set(currentRef, newData);
                    updatedCount++;
                }
            });

            setStatus(`Preparando ${migratedCount + updatedCount} operaciones. Ejecutando Batch...`);

            await batch.commit();

            setIsSuccess(true);
            setStatus(`🚀 ¡Migración completada! Se limpiaron ${migratedCount} IDs y se actualizaron ${updatedCount} recetas.`);
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
                    {isSuccess ? <CheckCircle2 size={32} className="text-green-500" /> : <PackageSearch size={32} />}
                </div>

                <h1 className="text-2xl font-bold text-zinc-900 mb-2">Limpieza de Base de Datos</h1>
                <p className="text-sm text-zinc-500 mb-6 px-4">
                    Esta acción reemplazará los IDs autogenerados por nombres legibles en Firestore y actualizará las recetas vinculadas automáticamente.
                </p>

                <div className="bg-yellow-50 text-yellow-800 text-xs font-medium p-4 rounded-xl flex items-start gap-3 mb-8 text-left">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <p>Asegúrate de estar logueado como administrador antes de ejecutar esto para no recibir error de permisos.</p>
                </div>

                <button
                    onClick={handleMigration}
                    disabled={isMigrating || isSuccess}
                    className="w-full bg-black text-white font-bold py-4 rounded-xl transition-all hover:bg-zinc-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mb-4 shadow-md"
                >
                    {isMigrating ? 'Ejecutando migración...' : isSuccess ? 'Limpieza Finalizada' : 'Ejecutar Limpieza'}
                </button>

                <p className={`text-sm font-bold ${isSuccess ? 'text-green-600' : 'text-zinc-600'}`}>
                    {status}
                </p>
            </div>
        </div>
    );
}