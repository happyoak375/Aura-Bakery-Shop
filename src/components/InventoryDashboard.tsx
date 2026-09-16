"use client";

/**
 * @fileoverview Componente Reutilizable del Gestor de Inventario y Recetas (InventoryDashboard) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Mantenimiento del Modelo 3-Tier:
 *    - 'finished_good': Productos terminados destinados a la venta en mostrador o tienda web[cite: 1, 2].
 *    - 'wip': Sub-recetas intermedias elaboradas en cocina (masas, cremas, rellenos)[cite: 1, 2].
 *    - 'raw_material': Materias primas directas (harina, café en grano, leche, empaques)[cite: 1, 2].
 * 2. Constructor de Recetas Operativas (Bill of Materials / BOM):
 *    - Permite formular la lista de ingredientes y proporciones consumidas por cada unidad producida[cite: 1, 2].
 * 3. Asignación Multicanal de Ventas:
 *    - Configuración granular de disponibilidad por canal: 'pos' (físico), 'web' (online) y 'rappi'.
 * 4. Gestión en Tiempo Real de Existencias:
 *    - Indicadores de alerta visual cuando las existencias caen al umbral de seguridad (`currentStock <= minStockLevel`)[cite: 1, 2].
 */

import { useState, useEffect } from 'react';
import {
    fetchInventoryItems,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    InventoryItem,
    InventoryType,
    getLocalProductImage,
    BillOfMaterials
} from '../lib/api';
import { Plus, Edit2, Trash2, Search, X, Image as ImageIcon } from 'lucide-react';

export default function InventoryDashboard() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [search, setSearch] = useState<string>('');
    const [filterType, setFilterType] = useState<InventoryType | 'all'>('all');

    // Control de estado del modal de edición / creación
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Estado del formulario de producto
    const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>({
        name: '',
        type: 'finished_good',
        category: '',
        unit: 'unidades',
        costPerUnit: 0,
        currentStock: 0,
        minStockLevel: 0,
        salesChannels: ['pos'],
        imageUrl: '',
        bom: [],
    });

    // Estado reactivo de las líneas de receta (BOM)
    const [bomItems, setBomItems] = useState<BillOfMaterials[]>([]);

    /**
     * Carga el catálogo completo desde la colección 'inventory_items' de Firestore[cite: 1, 2].
     */
    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await fetchInventoryItems();
            setItems(data);
        } catch (error) {
            console.error("Error al cargar artículos de inventario:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    /**
     * Inicializa los valores del formulario para crear un nuevo ítem o editar uno existente[cite: 2].
     */
    const handleOpenModal = (item?: InventoryItem) => {
        if (item) {
            setEditingId(item.id!);
            setBomItems(item.bom || []);
            setFormData({
                name: item.name,
                type: item.type,
                category: item.category || '',
                unit: item.unit,
                costPerUnit: item.costPerUnit,
                currentStock: item.currentStock,
                minStockLevel: item.minStockLevel,
                salesChannels: item.salesChannels || ['pos'],
                imageUrl: item.imageUrl || '',
                bom: item.bom || [],
            });
        } else {
            setEditingId(null);
            setBomItems([]);
            setFormData({
                name: '',
                type: 'finished_good',
                category: '',
                unit: 'unidades',
                costPerUnit: 0,
                currentStock: 0,
                minStockLevel: 0,
                salesChannels: ['pos'],
                imageUrl: '',
                bom: [],
            });
        }
        setIsModalOpen(true);
    };

    /**
     * Elimina de forma permanente un ítem de Firestore tras confirmación del operador[cite: 2].
     */
    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este producto permanentemente?')) {
            try {
                await deleteInventoryItem(id);
                loadData();
            } catch (error) {
                console.error("Error al eliminar ítem:", error);
                alert("Hubo un error al intentar eliminar el registro.");
            }
        }
    };

    /**
     * Persiste la creación o actualización integrando las líneas BOM configuradas[cite: 2].
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                bom: bomItems,
            };

            if (editingId) {
                await updateInventoryItem(editingId, payload);
            } else {
                await addInventoryItem(payload);
            }
            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error("Error al guardar ítem de inventario:", error);
            alert("Hubo un error al procesar la solicitud.");
        }
    };

    /**
     * Conmuta la asignación de canales comerciales para productos terminados[cite: 2].
     */
    const toggleSalesChannel = (channel: 'pos' | 'web' | 'rappi') => {
        const current = formData.salesChannels || [];
        if (current.includes(channel)) {
            setFormData({ ...formData, salesChannels: current.filter(c => c !== channel) });
        } else {
            setFormData({ ...formData, salesChannels: [...current, channel] });
        }
    };

    // Filtrado reactivo de la tabla por nombre y tipo de nivel
    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        const matchesType = filterType === 'all' || item.type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="w-full font-sans">

            {/* BARRA DE CONTROLES Y FILTROS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex-1 flex flex-col md:flex-row gap-4 w-full">

                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar producto por nombre..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black shadow-sm bg-white"
                        />
                    </div>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black shadow-sm bg-white cursor-pointer"
                    >
                        <option value="all">Todos los Tipos</option>
                        <option value="finished_good">Productos Finales (Menú)</option>
                        <option value="wip">Pre-producción (WIP)</option>
                        <option value="raw_material">Materia Prima</option>
                    </select>
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="bg-black text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition shadow-md w-full md:w-auto shrink-0 active:scale-95"
                >
                    <Plus size={18} /> Nuevo Producto
                </button>
            </div>

            {/* TABLA DE EXISTENCIAS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                <th className="p-4 w-16 text-center"><ImageIcon size={18} className="mx-auto" /></th>
                                <th className="p-4">Nombre</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Categoría</th>
                                <th className="p-4">Precio / Costo</th>
                                <th className="p-4">Stock Actual</th>
                                <th className="p-4">Canales</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500 font-medium">
                                        <div className="animate-pulse">Cargando inventario central...</div>
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500 font-medium">
                                        No se encontraron productos registrados.
                                    </td>
                                </tr>
                            ) : filteredItems.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 transition">

                                    {/* FOTOGRAFÍA O PLACEHOLDER DETERMINISTA */}
                                    <td className="p-4">
                                        <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center border border-gray-200 shrink-0">
                                            <img
                                                src={item.imageUrl || getLocalProductImage(item.name)}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo-aura.png'; }}
                                            />
                                        </div>
                                    </td>

                                    <td className="p-4 font-bold text-zinc-900">{item.name}</td>

                                    {/* BADGE DE NIVEL DE INVENTARIO */}
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 text-xs rounded-lg font-bold border ${item.type === 'finished_good'
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : item.type === 'wip'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : 'bg-orange-50 text-orange-700 border-orange-200'
                                            }`}>
                                            {item.type === 'finished_good' ? 'Final' : item.type === 'wip' ? 'WIP' : 'Materia Prima'}
                                        </span>
                                    </td>

                                    <td className="p-4 text-zinc-600 font-medium">{item.category || '-'}</td>

                                    <td className="p-4 font-bold text-zinc-900">
                                        ${item.costPerUnit.toLocaleString('es-CO')}
                                    </td>

                                    {/* STOCK CON ALERTA VISUAL DE UMBRAL MÍNIMO */}
                                    <td className="p-4">
                                        <span className={`font-bold ${item.currentStock <= item.minStockLevel
                                                ? 'text-red-500 bg-red-50 px-2 py-1 rounded-md'
                                                : 'text-zinc-700'
                                            }`}>
                                            {item.currentStock}
                                        </span>
                                        <span className="text-xs text-zinc-400 ml-1 font-medium">{item.unit}</span>
                                    </td>

                                    {/* CANALES HABILITADOS */}
                                    <td className="p-4">
                                        <div className="flex gap-1 flex-wrap">
                                            {item.salesChannels?.map(ch => (
                                                <span key={ch} className="bg-zinc-100 border border-zinc-200 text-zinc-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                                    {ch}
                                                </span>
                                            ))}
                                        </div>
                                    </td>

                                    {/* ACCIONES DE EDICIÓN Y BAJA */}
                                    <td className="p-4 text-right space-x-1">
                                        <button
                                            onClick={() => handleOpenModal(item)}
                                            className="p-2 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            title="Editar"
                                            aria-label="Editar producto"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id!)}
                                            className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                            title="Eliminar"
                                            aria-label="Eliminar producto"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE EDICIÓN / CREACIÓN CON BUILDER BOM */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 md:p-8">

                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-extrabold text-zinc-900">
                                    {editingId ? 'Editar Producto' : 'Nuevo Producto'}
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 text-zinc-400 hover:bg-gray-100 hover:text-zinc-900 rounded-full transition"
                                    aria-label="Cerrar modal"
                                >
                                    <X />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-700">Nombre del Producto</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:outline-none bg-gray-50 font-medium"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-700">Clasificación</label>
                                        <select
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:outline-none bg-gray-50 font-medium cursor-pointer"
                                        >
                                            <option value="finished_good">Producto Final (A la venta)</option>
                                            <option value="wip">Pre-producción (Masa, Salsa)</option>
                                            <option value="raw_material">Materia Prima (Harina, Azúcar)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-700">Categoría</label>
                                        <input
                                            type="text"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:outline-none bg-gray-50 font-medium"
                                            placeholder="Ej. Clásicos, Café..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-700">Unidad de Medida</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.unit}
                                            onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:outline-none bg-gray-50 font-medium"
                                            placeholder="unidades, g, ml..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-700">Precio / Costo ($)</label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            value={formData.costPerUnit}
                                            onChange={e => setFormData({ ...formData, costPerUnit: Number(e.target.value) })}
                                            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:outline-none bg-gray-50 font-medium"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-700">Stock Actual</label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            value={formData.currentStock}
                                            onChange={e => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                                            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:outline-none bg-gray-50 font-medium"
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-bold text-zinc-700">Alerta de Stock Mínimo</label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            value={formData.minStockLevel}
                                            onChange={e => setFormData({ ...formData, minStockLevel: Number(e.target.value) })}
                                            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:outline-none bg-gray-50 font-medium"
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-bold text-zinc-700">URL de la Imagen (Opcional)</label>
                                        <input
                                            type="text"
                                            value={formData.imageUrl || ''}
                                            onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:outline-none bg-gray-50 font-medium"
                                            placeholder="https://ejemplo.com/imagen.jpg"
                                        />
                                        <p className="text-xs text-gray-500">Si se deja vacío, el sistema asignará la imagen local por el nombre del producto[cite: 2].</p>
                                    </div>

                                </div>

                                {/* RECIPE BUILDER (BILL OF MATERIALS) */}
                                {(formData.type === 'finished_good' || formData.type === 'wip') && (
                                    <div className="pt-6 border-t border-gray-100 md:col-span-2">
                                        <div className="flex justify-between items-center mb-4">
                                            <div>
                                                <label className="text-sm font-bold text-zinc-900 block">
                                                    Receta Operativa (Insumos requeridos)
                                                </label>
                                                <p className="text-xs text-zinc-500">Insumos que se deducen automáticamente al hornear o vender este artículo[cite: 1, 2].</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setBomItems([...bomItems, { inventoryItemId: '', quantity: 1 }])}
                                                className="text-xs bg-black text-white px-3 py-1.5 rounded-lg font-bold hover:bg-zinc-800 transition active:scale-95"
                                            >
                                                + Agregar Insumo
                                            </button>
                                        </div>

                                        {bomItems.length === 0 ? (
                                            <p className="text-sm text-gray-400 italic bg-gray-50 p-3 rounded-xl border border-gray-200">
                                                Este producto no tiene insumos dependientes asignados[cite: 2].
                                            </p>
                                        ) : (
                                            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                                {bomItems.map((bomItem, index) => (
                                                    <div key={index} className="flex gap-3 items-center">

                                                        <select
                                                            value={bomItem.inventoryItemId}
                                                            onChange={(e) => {
                                                                const newBom = [...bomItems];
                                                                newBom[index].inventoryItemId = e.target.value;
                                                                setBomItems(newBom);
                                                                setFormData({ ...formData, bom: newBom });
                                                            }}
                                                            className="flex-1 p-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-black bg-white cursor-pointer"
                                                        >
                                                            <option value="">Selecciona un insumo...</option>
                                                            {items.filter(i => i.type !== 'finished_good' && i.id !== editingId).map(i => (
                                                                <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                                            ))}
                                                        </select>

                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={bomItem.quantity}
                                                            onChange={(e) => {
                                                                const newBom = [...bomItems];
                                                                newBom[index].quantity = Number(e.target.value);
                                                                setBomItems(newBom);
                                                                setFormData({ ...formData, bom: newBom });
                                                            }}
                                                            className="w-24 p-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-black bg-white"
                                                            placeholder="Cant."
                                                        />

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newBom = bomItems.filter((_, i) => i !== index);
                                                                setBomItems(newBom);
                                                                setFormData({ ...formData, bom: newBom });
                                                            }}
                                                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                                                            aria-label="Remover insumo de la receta"
                                                        >
                                                            <X size={16} />
                                                        </button>

                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* CANALES DE VENTA */}
                                {formData.type === 'finished_good' && (
                                    <div className="pt-6 border-t border-gray-100">
                                        <label className="text-sm font-bold text-zinc-900 mb-3 block">
                                            ¿Dónde se venderá este producto?
                                        </label>
                                        <div className="flex gap-3">
                                            {(['pos', 'web', 'rappi'] as const).map((channel) => (
                                                <button
                                                    key={channel}
                                                    type="button"
                                                    onClick={() => toggleSalesChannel(channel)}
                                                    className={`flex-1 py-3 border-2 rounded-xl font-bold uppercase tracking-wider text-xs transition-all ${formData.salesChannels?.includes(channel)
                                                            ? 'border-black bg-black text-white shadow-md'
                                                            : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-zinc-700 bg-white'
                                                        }`}
                                                >
                                                    {channel}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* BOTONES DE ACCIÓN */}
                                <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-3 font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-8 py-3 font-bold bg-black text-white rounded-xl hover:bg-zinc-800 transition shadow-lg active:scale-95"
                                    >
                                        {editingId ? 'Actualizar Producto' : 'Crear Producto'}
                                    </button>
                                </div>

                            </form>

                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}