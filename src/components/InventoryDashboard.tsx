"use client";

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
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<InventoryType | 'all'>('all');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>({
        name: '',
        type: 'finished_good',
        category: '',
        unit: 'unidades',
        costPerUnit: 0,
        currentStock: 0,
        minStockLevel: 0,
        salesChannels: ['pos'],
        imageUrl: '', // <-- Agregado para nuevas imágenes
    });

    const [bomItems, setBomItems] = useState<BillOfMaterials[]>([]);

    const loadData = async () => {
        setIsLoading(true);
        const data = await fetchInventoryItems();
        setItems(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleOpenModal = (item?: InventoryItem) => {
        if (item) {
            setEditingId(item.id!);
            setBomItems(item.bom || [])
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
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este producto permanentemente?')) {
            await deleteInventoryItem(id);
            loadData();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            await updateInventoryItem(editingId, formData);
        } else {
            await addInventoryItem(formData);
        }
        setIsModalOpen(false);
        loadData();
    };

    {/* --- RECIPE BUILDER (BOM) --- */ }
    {
        (formData.type === 'finished_good' || formData.type === 'wip') && (
            <div className="pt-6 border-t border-gray-100 md:col-span-2">
                <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-bold text-zinc-900 block">Receta Operativa (Insumos requeridos)</label>
                    <button
                        type="button"
                        onClick={() => setBomItems([...bomItems, { inventoryItemId: '', quantity: 1 }])}
                        className="text-xs bg-black text-white px-3 py-1.5 rounded-lg font-bold"
                    >
                        + Agregar Insumo
                    </button>
                </div>

                {bomItems.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Este producto no tiene insumos dependientes.</p>
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
                                    className="flex-1 p-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-black"
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
                                    className="w-24 p-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-black"
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
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    const toggleSalesChannel = (channel: 'pos' | 'web' | 'rappi') => {
        const current = formData.salesChannels || [];
        if (current.includes(channel)) {
            setFormData({ ...formData, salesChannels: current.filter(c => c !== channel) });
        } else {
            setFormData({ ...formData, salesChannels: [...current, channel] });
        }
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        const matchesType = filterType === 'all' || item.type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex-1 flex flex-col md:flex-row gap-4 w-full">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black shadow-sm"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black shadow-sm"
                    >
                        <option value="all">Todos los Tipos</option>
                        <option value="finished_good">Productos Finales (Menú)</option>
                        <option value="wip">Pre-producción (WIP)</option>
                        <option value="raw_material">Materia Prima</option>
                    </select>
                </div>

                <button
                    onClick={() => handleOpenModal()}
                    className="bg-black text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition shadow-md w-full md:w-auto shrink-0"
                >
                    <Plus size={18} /> Nuevo Producto
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
                                <th className="p-4 font-bold w-16 text-center"><ImageIcon size={18} className="mx-auto" /></th>
                                <th className="p-4 font-bold">Nombre</th>
                                <th className="p-4 font-bold">Tipo</th>
                                <th className="p-4 font-bold">Categoría</th>
                                <th className="p-4 font-bold">Precio</th>
                                <th className="p-4 font-bold">Stock</th>
                                <th className="p-4 font-bold">Canales</th>
                                <th className="p-4 font-bold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500 font-medium">
                                        <div className="animate-pulse">Cargando inventario...</div>
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500 font-medium">
                                        No se encontraron productos.
                                    </td>
                                </tr>
                            ) : filteredItems.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 transition">
                                    <td className="p-4">
                                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200 shrink-0">
                                            {/* Lógica de Imagen Integrada */}
                                            <img
                                                src={item.imageUrl || getLocalProductImage(item.name)}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { (e.target as HTMLImageElement).src = '/images/logo-aura.png' }}
                                            />
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-zinc-900">{item.name}</td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 text-xs rounded-lg font-bold border ${item.type === 'finished_good' ? 'bg-green-50 text-green-700 border-green-200' :
                                            item.type === 'wip' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                                            }`}>
                                            {item.type === 'finished_good' ? 'Final' : item.type === 'wip' ? 'WIP' : 'Materia Prima'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-zinc-600 font-medium">{item.category || '-'}</td>
                                    <td className="p-4 font-bold text-zinc-900">${item.costPerUnit.toLocaleString('es-CO')}</td>
                                    <td className="p-4">
                                        <span className={`font-bold ${item.currentStock <= item.minStockLevel ? 'text-red-500 bg-red-50 px-2 py-1 rounded-md' : 'text-zinc-700'}`}>
                                            {item.currentStock}
                                        </span>
                                        <span className="text-xs text-zinc-400 ml-1 font-medium">{item.unit}</span>
                                    </td>
                                    <td className="p-4 flex gap-1 flex-wrap mt-2">
                                        {item.salesChannels?.map(ch => (
                                            <span key={ch} className="bg-zinc-100 border border-zinc-200 text-zinc-600 px-2 py-0.5 rounded text-xs font-bold uppercase">{ch}</span>
                                        ))}
                                    </td>
                                    <td className="p-4 text-right space-x-1">
                                        <button onClick={() => handleOpenModal(item)} className="p-2 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(item.id!)} className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 md:p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-extrabold text-zinc-900">{editingId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-400 hover:bg-gray-100 hover:text-zinc-900 rounded-full transition"><X /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-700">Nombre del Producto</label>
                                        <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:outline-none" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-700">Clasificación</label>
                                        <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:outline-none">
                                            <option value="finished_good">Producto Final (A la venta)</option>
                                            <option value="wip">Pre-producción (Masa, Salsa)</option>
                                            <option value="raw_material">Materia Prima (Harina, Azúcar)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-700">Categoría</label>
                                        <input type="text" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:outline-none" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-700">Unidad de Medida</label>
                                        <input required type="text" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:outline-none" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-700">Precio / Costo ($)</label>
                                        <input required type="number" min="0" value={formData.costPerUnit} onChange={e => setFormData({ ...formData, costPerUnit: Number(e.target.value) })} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:outline-none" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-zinc-700">Stock Actual</label>
                                        <input required type="number" min="0" value={formData.currentStock} onChange={e => setFormData({ ...formData, currentStock: Number(e.target.value) })} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:outline-none" />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-bold text-zinc-700">Alerta de Stock Mínimo</label>
                                        <input required type="number" min="0" value={formData.minStockLevel} onChange={e => setFormData({ ...formData, minStockLevel: Number(e.target.value) })} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:outline-none" />
                                    </div>

                                    {/* NUEVO CAMPO: URL DE LA IMAGEN */}
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-bold text-zinc-700">URL de la Imagen (Opcional)</label>
                                        <input type="text" value={formData.imageUrl || ''} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:outline-none" placeholder="https://ejemplo.com/imagen.jpg" />
                                        <p className="text-xs text-gray-500">Si se deja vacío, el sistema intentará buscar una imagen guardada localmente.</p>
                                    </div>

                                </div>

                                {formData.type === 'finished_good' && (
                                    <div className="pt-6 border-t border-gray-100">
                                        <label className="text-sm font-bold text-zinc-900 mb-3 block">¿Dónde se venderá este producto?</label>
                                        <div className="flex gap-3">
                                            {['pos', 'web', 'rappi'].map((channel) => (
                                                <button
                                                    key={channel}
                                                    type="button"
                                                    onClick={() => toggleSalesChannel(channel as any)}
                                                    className={`flex-1 py-3 border-2 rounded-xl font-bold uppercase tracking-wider text-sm transition-all ${formData.salesChannels?.includes(channel as any)
                                                        ? 'border-black bg-black text-white shadow-md'
                                                        : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-zinc-700'
                                                        }`}
                                                >
                                                    {channel}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="px-8 py-3 font-bold bg-black text-white rounded-xl hover:bg-zinc-800 transition shadow-lg active:scale-95">
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