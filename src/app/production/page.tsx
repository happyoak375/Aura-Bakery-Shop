'use client';

/**
 * @fileoverview Terminal de Registro de Producción de Cocina (ProductionPage) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Filtro Operativo de Horneado:
 *    - Carga únicamente ítems de tipo 'finished_good' (productos finales) y 'wip' (pre-producción intermedia)[cite: 1, 2].
 *    - Descarta materias primas puras y bebidas al paso ('Café', 'Bebidas') que no se hornean por lotes.
 * 2. Visualización de Existencias: Muestra el stock disponible y resalta en rojo cuando se encuentra 
 *    por debajo del stock mínimo de seguridad (`minStockLevel`)[cite: 2].
 * 3. Entrada Rápida Táctil: Modal interactivo con contadores masivos (+1, +5, +10, +20) diseñado
 *    para operar con rapidez en entornos de cocina y repostería[cite: 1].
 * 4. Integración con el Motor BOM (Firestore):
 *    - Invoca `recordProductionBatch(productId, quantity)`[cite: 1].
 *    - Transacción atómica: Deduce las materias primas/WIPs según la receta técnica configurada,
 *      aumenta el stock del producto resultante y crea trazas en 'inventory_movements'[cite: 3].
 */

import React, { useState, useEffect } from 'react';
import {
    fetchInventoryItems,
    recordProductionBatch,
    getLocalProductImage,
    InventoryItem
} from '../../lib/api';

export default function ProductionPage() {
    // Catálogo de productos disponibles para registro de producción
    const [products, setProducts] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Control del modal de registro de lotes
    const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
    const [quantity, setQuantity] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    /**
     * Obtiene el inventario global y filtra únicamente los productos horneables o pre-elaborados.
     */
    const loadProducts = async () => {
        try {
            setIsLoading(true);
            const allItems = await fetchInventoryItems();

            // Exclusión de bebidas bajo demanda y materias primas directas
            const bakeableItems = allItems.filter(item =>
                (item.type === 'finished_good' || item.type === 'wip') &&
                item.category !== 'Café' &&
                item.category !== 'Bebidas'
            );

            setProducts(bakeableItems);
        } catch (error) {
            console.error("Error al cargar productos de producción:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
    }, []);

    // Apertura del modal restableciendo el contador a cero
    const openModal = (product: InventoryItem) => {
        setSelectedProduct(product);
        setQuantity(0);
    };

    // Cierre y limpieza del modal
    const closeModal = () => {
        setSelectedProduct(null);
        setQuantity(0);
    };

    /**
     * REGISTRO DEL LOTE DE PRODUCCIÓN:
     * Ejecuta la transacción de consumo de receta BOM y reposición de producto terminado en Firestore.
     */
    const handleRecordBatch = async () => {
        if (!selectedProduct || quantity <= 0) return;

        try {
            setIsSubmitting(true);

            // Descuento atómico de insumos e incremento de stock en base de datos
            await recordProductionBatch(selectedProduct.id!, quantity);

            alert(`¡Lote registrado! Se añadieron ${quantity} unidades de ${selectedProduct.name} al inventario.`);

            closeModal();
            await loadProducts(); // Recarga la cuadrícula para reflejar los nuevos niveles de existencias
        } catch (error: any) {
            console.error("Error al registrar producción:", error);
            alert("Error al registrar producción: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">

            {/* ENCABEZADO DE MÓDULO */}
            <header className="mb-10">
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Cocina: Producción</h1>
                <p className="text-gray-500 mt-2 text-lg">
                    Registra nuevos lotes horneados para actualizar el inventario central y descontar insumos automáticamente.
                </p>
            </header>

            {/* CUADRÍCULA DE PRODUCTOS HORNEABLES */}
            {isLoading ? (
                <div className="text-gray-400 font-medium animate-pulse">Cargando productos horneables...</div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {products.map(product => {
                        const imgPath = getLocalProductImage(product.name);
                        const safeName = product.name || 'Producto';
                        const isLowStock = product.currentStock < (product.minStockLevel || 10);

                        return (
                            <button
                                key={product.id}
                                onClick={() => openModal(product)}
                                className="bg-white rounded-3xl p-6 flex flex-col items-center text-center shadow-sm border border-gray-100 hover:shadow-md hover:border-black active:scale-95 transition-all group"
                            >
                                {/* Visualización de Fotografía o Inicial de Respaldo */}
                                {imgPath ? (
                                    <div className="w-20 h-20 mb-4 relative rounded-2xl overflow-hidden shadow-sm border border-gray-100 group-hover:scale-105 transition-transform">
                                        <img
                                            src={imgPath}
                                            alt={safeName}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo-aura.png'; }}
                                        />
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 bg-gray-100 rounded-2xl mb-4 flex items-center justify-center text-gray-400 font-bold text-2xl group-hover:scale-105 transition-transform">
                                        {safeName.charAt(0).toUpperCase()}
                                    </div>
                                )}

                                <h3 className="font-bold text-gray-900 leading-tight mb-2">
                                    {safeName}
                                </h3>

                                {/* Insignia de Existencias con Alerta de Stock Crítico */}
                                <div className="bg-gray-50 px-3 py-1 rounded-full border border-gray-100 mt-auto">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Stock: <span className={isLowStock ? 'text-red-500 font-bold' : 'text-gray-900'}>{product.currentStock}</span>
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* MODAL TÁCTIL DE ENTRADA DE UNIDADES */}
            {selectedProduct && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">

                        <div className="p-8 text-center">
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">
                                ¿Cuántas unidades salieron?
                            </h2>
                            <p className="text-gray-500 mb-8">{selectedProduct.name}</p>

                            {/* VISOR NUMÉRICO GIGANTE */}
                            <div className="text-7xl font-black text-black mb-8 bg-gray-50 py-6 rounded-3xl border border-gray-100">
                                {quantity}
                            </div>

                            {/* BOTONES DE INCREMENTO RÁPIDO PARA PANTALLA TÁCTIL */}
                            <div className="grid grid-cols-4 gap-3 mb-6">
                                {[1, 5, 10, 20].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setQuantity(prev => prev + num)}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xl py-4 rounded-2xl transition-colors active:scale-95"
                                    >
                                        +{num}
                                    </button>
                                ))}
                            </div>

                            {/* REINICIO MANUAL DE CONTADOR */}
                            <button
                                type="button"
                                onClick={() => setQuantity(0)}
                                className="text-sm font-medium text-gray-400 hover:text-red-500 transition-colors underline mb-8"
                            >
                                reiniciar contador
                            </button>

                            {/* ACCIONES DEL MODAL */}
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-white text-black border-2 border-gray-200 font-bold py-4 rounded-2xl hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={handleRecordBatch}
                                    disabled={quantity === 0 || isSubmitting}
                                    className="flex-1 bg-black text-white font-bold py-4 rounded-2xl hover:bg-zinc-800 transition-colors disabled:opacity-50 shadow-md active:scale-95"
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