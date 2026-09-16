"use client";

/**
 * @fileoverview Panel de Gestión de Inventario, Catálogo y Recetas BOM (AdminInventoryPage) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Mantenimiento del Modelo 3-Tier:
 *    - 'finished_good': Productos finales aptos para la venta (pasteles, café, tortas).
 *    - 'wip': Pre-producción intermedia elaborada en cocina (masas base, rellenos, salsas).
 *    - 'raw_material': Insumos directos de compra (harina, mantequilla, café en grano, empaques).
 * 2. Constructor de Recetas Operativas (Bill of Materials / BOM):
 *    - Permite asociar insumos y cantidades requeridas a productos terminados o WIPs.
 *    - Filtra para que un producto en edición no pueda seleccionarse a sí mismo como ingrediente.
 * 3. Asignación de Canales Comerciales (Sales Channels):
 *    - Configura la disponibilidad de venta para 'pos' (mostrador físico), 'web' (tienda online) o 'rappi'.
 * 4. Operaciones CRUD en Firestore:
 *    - Lectura (`fetchInventoryItems`), creación (`addInventoryItem`), edición (`updateInventoryItem`)
 *      y eliminación (`deleteInventoryItem`).
 * 5. Monitoreo de Stock de Seguridad:
 *    - Identifica y resalta existencias iguales o inferiores al umbral mínimo (`minStockLevel`).
 */

import { useState, useEffect } from 'react';
import {
    fetchInventoryItems,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    InventoryItem,
    InventoryType,
    BillOfMaterials
} from '../../../lib/api';
import { Plus, Edit2, Trash2, Package, Search, X, Image as ImageIcon } from 'lucide-react';

export default function AdminInventoryPage() {
    // Estado del listado y filtros de catálogo
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [search, setSearch] = useState<string>('');
    const [filterType, setFilterType] = useState<InventoryType | 'all'>('all');

    // Control del modal interactivo
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Estado reactivo para la receta operativa (BOM)
    const [bomItems, setBomItems] = useState<BillOfMaterials[]>([]);

    // Estado del formulario para creación / edición
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

    /**
     * Obtiene la totalidad del catálogo de inventario desde Firestore.
     */
    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await fetchInventoryItems();
            setItems(data);
        } catch (error) {
            console.error("Error al cargar la lista de inventario:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    /**
     * Abre el modal configurando los valores iniciales para crear o editar un ítem.
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
                salesChannels: item.salesChannels || [],
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
     * Elimina de forma permanente un ítem de la colección en Firestore.
     */
    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este producto permanentemente?')) {
            try {
                await deleteInventoryItem(id);
                loadData();
            } catch (error) {
                console.error("Error al eliminar el ítem:", error);
                alert("Hubo un error al intentar eliminar el producto.");
            }
        }
    };

    /**
     * Guarda o actualiza la información en Firestore integrando el BOM configurado.
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
            console.error("Error al guardar el producto:", error);
            alert("Hubo un error al procesar la solicitud.");
        }
    };

    /**
     * Alterna la asignación de canales de venta autorizados ('pos' | 'web' | 'rappi').
     */
    const toggleSalesChannel = (channel: 'pos' | 'web' | 'rappi') => {
        const current = formData.salesChannels || [];
        if (current.includes(channel)) {
            setFormData({ ...formData, salesChannels: current.filter(c => c !== channel) });
        } else {
            setFormData({ ...formData, salesChannels: [...current, channel] });
        }
    };

    // Filtrado reactivo por nombre y tipo de clasificación
    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        const matchesType = filterType === 'all' || item.type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="max-w-6xl mx-auto px-6 py-10 font-sans">

            {/* ENCABEZADO PRINCIPAL */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-zinc-900 flex items-center gap-3">
                        <Package className="text-black" /> Gestor de Inventario y Menú
                    </h1>
                    <p className="text-zinc-500 mt-1">
                        Añade, edita y elimina productos e insumos de la base de datos central.
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-black text-white px-5 py-2.5 rounded-full font-bold flex items-center gap-2 hover:bg-zinc-800 transition shadow-md active:scale-95"
                >
                    <Plus size={18} /> Nuevo Producto
                </button>
            </div>

            {/* BARRA DE BÚSQUEDA Y FILTRADO POR CLASIFICACIÓN */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar producto por nombre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-100 focus:outline-none focus:border-black shadow-sm bg-white"
                    />
                </div>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-4 py-3 rounded-2xl border border-gray-100 focus:outline-none focus:border-black shadow-sm bg-white cursor-pointer"
                >
                    <option value="all">Todos los Tipos</option>
                    <option value="finished_good">Productos Finales (Menú)</option>
                    <option value="wip">Pre-producción (WIP / Masas)</option>
                    <option value="raw_material">Materia Prima</option>
                </select>
            </div>

            {/* TABLA PRINCIPAL DE EXISTENCIAS */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-sm text-gray-500">
                                <th className="p-4 font-medium w-16 text-center"><ImageIcon size={18} className="mx-auto" /></th>
                                <th className="p-4 font-medium">Nombre</th>
                                <th className="p-4 font-medium">Tipo</th>
                                <th className="p-4 font-medium">Stock Actual</th>
                                <th className="p-4 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-zinc-400 font-medium">
                                        <div className="animate-pulse">Cargando inventario...</div>
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-zinc-400 font-medium">
                                        No se encontraron productos coincidentes.
                                    </td>
                                </tr>
                            ) : filteredItems.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition">
                                    {/* Fotografía o Placeholder */}
                                    <td className="p-4">
                                        <div className="w-12 h-12 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center border border-gray-100 shrink-0">
                                            <img
                                                src={item.imageUrl || '/images/logo-aura.png'}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo-aura.png'; }}
                                            />
                                        </div>
                                    </td>

                                    {/* Nombre y Categoría */}
                                    <td className="p-4">
                                        <div className="font-bold text-zinc-900">{item.name}</div>
                                        <div className="text-xs text-zinc-500">{item.category || 'Sin categoría'}</div>
                                    </td>

                                    {/* Clasificación de Inventario */}
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-lg font-bold border ${item.type === 'finished_good'
                                                ? 'bg-green-50 text-green-700 border-green-100'
                                                : item.type === 'wip'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                    : 'bg-orange-50 text-orange-700 border-orange-100'
                                            }`}>
                                            {item.type === 'finished_good' ? 'Final' : item.type === 'wip' ? 'WIP' : 'Materia Prima'}
                                        </span>
                                    </td>

                                    {/* Nivel de Stock con Indicador Crítico */}
                                    <td className="p-4">
                                        <span className={`font-bold ${item.currentStock <= item.minStockLevel
                                                ? 'text-red-500 bg-red-50 px-2 py-1 rounded-md'
                                                : 'text-zinc-900'
                                            }`}>
                                            {item.currentStock}
                                        </span>
                                        <span className="text-xs text-zinc-400 ml-1 font-medium">{item.unit}</span>
                                    </td>

                                    {/* Acciones de Edición y Baja */}
                                    <td className="p-4 text-right space-x-1">
                                        <button
                                            onClick={() => handleOpenModal(item)}
                                            className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                                            title="Editar"
                                            aria-label="Editar producto"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id!)}
                                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
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

            {/* MODAL DE CREACIÓN / EDICIÓN Y CONSTRUCTOR BOM */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-8">

                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-extrabold text-zinc-900">
                                    {editingId ? 'Editar Producto' : 'Nuevo Producto'}
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 text-zinc-400 hover:bg-gray-50 hover:text-zinc-900 rounded-full transition"
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
                                            className="w-full p-3 rounded-xl border border-gray-100 focus:border-black focus:outline-none bg-gray-50 font-medium"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-700">Tipo de Inventario</label>
                                        <select
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                            className="w-full p-3 rounded-xl border border-gray-100 focus:border-black focus:outline-none bg-gray-50 font-medium cursor-pointer"
                                        >
                                            <option value="finished_good">Producto Final (A la venta)</option>
                                            <option value="wip">Masa / Pre-producción (WIP)</option>
                                            <option value="raw_material">Materia Prima</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-700">Categoría</label>
                                        <input
                                            type="text"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-100 focus:border-black focus:outline-none bg-gray-50 font-medium"
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
                                            className="w-full p-3 rounded-xl border border-gray-100 focus:border-black focus:outline-none bg-gray-50 font-medium"
                                            placeholder="unidades, g, ml..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-700">Costo / Precio ($)</label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            value={formData.costPerUnit}
                                            onChange={e => setFormData({ ...formData, costPerUnit: Number(e.target.value) })}
                                            className="w-full p-3 rounded-xl border border-gray-100 focus:border-black focus:outline-none bg-gray-50 font-medium"
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
                                            className="w-full p-3 rounded-xl border border-gray-100 focus:border-black focus:outline-none bg-gray-50 font-medium"
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
                                            className="w-full p-3 rounded-xl border border-gray-100 focus:border-black focus:outline-none bg-gray-50 font-medium"
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-bold text-zinc-700">URL de la Imagen (Opcional)</label>
                                        <input
                                            type="text"
                                            value={formData.imageUrl || ''}
                                            onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-100 focus:border-black focus:outline-none bg-gray-50 font-medium"
                                            placeholder="https://ejemplo.com/imagen.jpg"
                                        />
                                    </div>

                                </div>

                                {/* CONSTRUCTOR DE RECETA TÉCNICA (BOM) */}
                                {(formData.type === 'finished_good' || formData.type === 'wip') && (
                                    <div className="pt-6 border-t border-gray-100 md:col-span-2">
                                        <div className="flex justify-between items-center mb-4">
                                            <div>
                                                <label className="text-sm font-bold text-zinc-900 block">
                                                    Receta Operativa (Insumos requeridos)
                                                </label>
                                                <p className="text-xs text-zinc-400">Define los insumos que se descuentan al producir o vender este ítem.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setBomItems([...bomItems, { inventoryItemId: '', quantity: 1 }])}
                                                className="text-[10px] uppercase tracking-wider bg-black text-white px-3 py-2 rounded-lg font-bold hover:bg-zinc-800 transition active:scale-95"
                                            >
                                                + Agregar Insumo
                                            </button>
                                        </div>

                                        {bomItems.length === 0 ? (
                                            <p className="text-sm text-zinc-400 italic bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                Este producto no tiene insumos dependientes. Se controlará directamente por su stock físico en mostrador.
                                            </p>
                                        ) : (
                                            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                {bomItems.map((bomItem, index) => (
                                                    <div key={index} className="flex gap-3 items-center">
                                                        {/* Selector de Insumo / Materia Prima / WIP (Excluye productos finales y al ítem en edición) */}
                                                        <select
                                                            value={bomItem.inventoryItemId}
                                                            onChange={(e) => {
                                                                const newBom = [...bomItems];
                                                                newBom[index].inventoryItemId = e.target.value;
                                                                setBomItems(newBom);
                                                                setFormData({ ...formData, bom: newBom });
                                                            }}
                                                            className="flex-1 p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black bg-white shadow-sm cursor-pointer"
                                                        >
                                                            <option value="">Selecciona un insumo...</option>
                                                            {items.filter(i => i.type !== 'finished_good' && i.id !== editingId).map(i => (
                                                                <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                                            ))}
                                                        </select>

                                                        {/* Cantidad requerida de insumo */}
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
                                                            className="w-24 p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-black bg-white shadow-sm"
                                                            placeholder="Cant."
                                                        />

                                                        {/* Remover línea de insumo */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newBom = bomItems.filter((_, i) => i !== index);
                                                                setBomItems(newBom);
                                                                setFormData({ ...formData, bom: newBom });
                                                            }}
                                                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition"
                                                            aria-label="Eliminar insumo"
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ASIGNACIÓN DE CANALES COMERCIALES */}
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
                                                            : 'border-gray-100 text-zinc-400 hover:border-gray-300 hover:text-zinc-700 bg-gray-50'
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
                                        className="px-6 py-3 font-bold text-zinc-500 hover:bg-gray-50 rounded-xl transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-8 py-3 font-bold bg-black text-white rounded-xl hover:bg-zinc-800 transition shadow-md active:scale-95"
                                    >
                                        {editingId ? 'Actualizar Producto' : 'Guardar Producto'}
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