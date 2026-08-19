'use client';

import React, { useState, useEffect } from 'react';
import { fetchInventoryByType, recordProductionBatch, getLocalProductImage, InventoryItem } from '@/lib/api';

export default function ProductionPage() {
    const [products, setProducts] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // State for the Production Modal
    const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
    const [quantity, setQuantity] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadProducts = async () => {
        try {
            setIsLoading(true);
            const data = await fetchInventoryByType('finished_good');

            // NEW: Filter out made-to-order items so the kitchen only sees bakeable pastries!
            const bakeableItems = data.filter(item =>
                item.category !== 'Café' && item.category !== 'Bebidas'
            );

            setProducts(bakeableItems);
        } catch (error) {
            console.error("Error loading products:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
    }, []);

    const openModal = (product: InventoryItem) => {
        setSelectedProduct(product);
        setQuantity(0); // Reset quantity when opening
    };

    const closeModal = () => {
        setSelectedProduct(null);
        setQuantity(0);
    };

    const handleRecordBatch = async () => {
        if (!selectedProduct || quantity <= 0) return;

        try {
            setIsSubmitting(true);

            // Call the engine we built!
            await recordProductionBatch(selectedProduct.id!, quantity);

            alert(`¡Lote Registrado! Se añadieron ${quantity} unidades de ${selectedProduct.name} al inventario.`);

            closeModal();
            await loadProducts(); // Refresh the grid to show new stock levels

        } catch (error: any) {
            alert("Error al registrar producción: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">

            <header className="mb-10">
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Cocina: Producción</h1>
                <p className="text-gray-500 mt-2 text-lg">Registra nuevos lotes horneados para actualizar el inventario central.</p>
            </header>

            {/* PRODUCT GRID */}
            {isLoading ? (
                <div className="text-gray-400 font-medium">Cargando productos...</div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {products.map(product => {
                        const imgPath = getLocalProductImage(product.name);
                        const safeName = product.name || 'Producto';

                        return (
                            <button
                                key={product.id}
                                onClick={() => openModal(product)}
                                className="bg-white rounded-3xl p-6 flex flex-col items-center text-center shadow-sm border border-gray-100 hover:shadow-md hover:border-black active:scale-95 transition-all group"
                            >
                                {imgPath ? (
                                    <div className="w-20 h-20 mb-4 relative rounded-full overflow-hidden shadow-sm border border-gray-100 group-hover:scale-105 transition-transform">
                                        <img src={imgPath} alt={safeName} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 bg-gray-100 rounded-full mb-4 flex items-center justify-center text-gray-400 font-bold text-2xl group-hover:scale-105 transition-transform">
                                        {safeName.charAt(0).toUpperCase()}
                                    </div>
                                )}

                                <h3 className="font-bold text-gray-900 leading-tight mb-2">{safeName}</h3>
                                <div className="bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Stock: <span className={product.currentStock < (product.minStockLevel || 10) ? 'text-red-500' : 'text-gray-900'}>{product.currentStock}</span>
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* PRODUCTION MODAL */}
            {selectedProduct && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">

                        <div className="p-8 text-center">
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">¿Cuántas unidades salieron?</h2>
                            <p className="text-gray-500 mb-8">{selectedProduct.name}</p>

                            {/* GIANT NUMBER DISPLAY */}
                            <div className="text-7xl font-black text-black mb-8 bg-gray-50 py-6 rounded-3xl border border-gray-100">
                                {quantity}
                            </div>

                            {/* QUICK TAP BUTTONS */}
                            <div className="grid grid-cols-4 gap-3 mb-6">
                                {[1, 5, 10, 20].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setQuantity(prev => prev + num)}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xl py-4 rounded-2xl transition-colors active:scale-95"
                                    >
                                        +{num}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setQuantity(0)}
                                className="text-sm font-medium text-gray-400 hover:text-red-500 transition-colors underline mb-8"
                            >
                                reiniciar contador
                            </button>

                            <div className="flex gap-4">
                                <button
                                    onClick={closeModal}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-white text-black border-2 border-gray-200 font-bold py-4 rounded-2xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleRecordBatch}
                                    disabled={quantity === 0 || isSubmitting}
                                    className="flex-1 bg-black text-white font-bold py-4 rounded-2xl hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Guardando...' : 'Confirmar Lote'}
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}