'use client';


import React, { useEffect, useState } from 'react';
import { fetchInventoryItems, InventoryItem } from '../../src/lib/api'; // Adjust the import path as needed
import { recordProductionBatch, processPOSOrder } from '../../src/lib/api';

export default function InventoryDashboard() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadInventory = async () => {
            try {
                setIsLoading(true);
                const data = await fetchInventoryItems();
                setInventory(data);
            } catch (err) {
                console.error(err);
                setError("Failed to load inventory.");
            } finally {
                setIsLoading(false);
            }
        };

        loadInventory();
    }, []);

    if (isLoading) return <div className="p-4 text-gray-500">Loading inventory from Firestore...</div>;
    if (error) return <div className="p-4 text-red-500">{error}</div>;
    // Add this function inside your component:
    const handleTestCycle = async () => {
        try {
            alert("Check your console! Running test...");
            // Replace these IDs with actual Document IDs from your Firestore database
            const croassantId = "00001";

            // 1. Kitchen Bakes 10 Croissants
            await recordProductionBatch(croassantId, 10);
            console.log("Kitchen finished baking.");

            // 2. Customer buys 2 Croissants at the POS
            await processPOSOrder({
                items: [{ productId: croassantId, quantity: 2, price: 5.00 }],
                totalAmount: 10.00,
                paymentMethod: 'card',
                status: 'completed',
                source: 'pos'
            });
            console.log("POS Sale completed.");

            alert("Cycle complete! Refresh the page to see updated stock.");
        } catch (error: any) {
            alert("Error: " + error.message);
        }
    };
    return (

        <div className="p-6 max-w-4xl mx-auto">
            <button onClick={handleTestCycle} className="mb-4 bg-purple-600 text-white px-4 py-2 rounded">Run Engine Test</button>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Aura Taller: Live Inventory</h2>
            {inventory.length === 0 ? (
                <p className="text-gray-500">No items found. Ensure your database has records!</p>
            ) : (
                <div className="overflow-x-auto bg-white shadow rounded-lg">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="p-4 font-semibold text-gray-700">Item Name</th>
                                <th className="p-4 font-semibold text-gray-700">Tier Type</th>
                                <th className="p-4 font-semibold text-gray-700">Current Stock</th>
                                <th className="p-4 font-semibold text-gray-700">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventory.map((item) => (
                                <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-medium text-gray-900">{item.name}</td>
                                    <td className="p-4 text-gray-600">
                                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                            {item.type.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-600">
                                        {item.currentStock} {item.unit}
                                    </td>
                                    <td className="p-4">
                                        {item.currentStock <= item.minStockLevel ? (
                                            <span className="text-red-600 font-semibold text-sm">Low Stock Alert</span>
                                        ) : (
                                            <span className="text-green-600 font-semibold text-sm">Healthy</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}