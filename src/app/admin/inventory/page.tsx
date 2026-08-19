import React from 'react';
// Make sure this points to your components folder correctly!
// Since you are in app/admin/inventory, you go up three levels (../../../)
import InventoryDashboard from '../../../components/InventoryDashboard';

export default function InventoryPage() {
    return (
        <div className="min-h-screen bg-gray-100 py-10">
            <div className="max-w-6xl mx-auto px-4">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-8">
                    Aura Taller: Inventario
                </h1>
                <InventoryDashboard />
            </div>
        </div>
    );
}