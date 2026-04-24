"use client";

import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { mockProducts, mockWindows, MOCK_GLOBAL_CONFIG } from "../../../lib/mockData";

export default function MigratePage() {
    const [status, setStatus] = useState<string>("Ready to migrate data.");
    const [isMigrating, setIsMigrating] = useState(false);

    const handleMigration = async () => {
        setIsMigrating(true);
        setStatus("Migrating products to Firestore...");

        try {
            // 1. Migrate Products
            for (const product of mockProducts) {
                const productRef = doc(db, "products", product.id);
                await setDoc(productRef, {
                    ...product,
                    createdAt: new Date().toISOString(),
                    // Ensure isActive is explicitly set just in case
                    isActive: product.isActive ?? true
                });
            }

            setStatus("Migrating delivery windows...");

            // 2. Migrate Windows
            for (const window of mockWindows) {
                const windowRef = doc(db, "deliveryWindows", window.id);
                await setDoc(windowRef, {
                    ...window,
                    isActive: true
                });
            }

            setStatus("Migrating global config...");

            // 3. Migrate Global Config
            const configRef = doc(db, "config", "global_settings");
            await setDoc(configRef, {
                ...MOCK_GLOBAL_CONFIG,
                isStoreOpen: true,
                updatedAt: new Date().toISOString(),
            });

            setStatus("✅ Migration Complete! All mock data is now in Firestore. You can delete this file.");
        } catch (error) {
            console.error("Migration failed: ", error);
            setStatus("❌ Error during migration. Check the browser console for details.");
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center">
                <h1 className="text-2xl font-bold text-zinc-900 mb-4">V2 Database Migration</h1>
                <p className="text-sm text-zinc-500 mb-8">
                    This will read your mockData.ts file and push all products, windows, and config settings to your live Firestore database.
                </p>

                <button
                    onClick={handleMigration}
                    disabled={isMigrating}
                    className="w-full bg-black text-white font-bold py-3 px-4 rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-4"
                >
                    {isMigrating ? "Migrating..." : "Run Migration"}
                </button>

                <p className={`text-sm font-medium ${status.includes('❌') ? 'text-red-500' : 'text-green-600'}`}>
                    {status}
                </p>
            </div>
        </main>
    );
}