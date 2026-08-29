"use client";

import { useState, useEffect } from 'react';
import {
    fetchInventoryItems,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    InventoryItem,
    InventoryType
} from '@/lib/api';
import { Plus, Edit2, Trash2, Package, Search, X, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';


export default function AdminInventoryPage() {
    const router = useRouter();
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
    });

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
            setFormData({
                name: item.name,
                type: item.type,
                category: item.category || '',
                unit: item.unit,
                costPerUnit: item.costPerUnit,
                currentStock: item.currentStock,
                minStockLevel: item.minStockLevel,
                salesChannels: item.salesChannels || [],
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                type: 'finished_good',
                category: '',
                unit: 'unidades',
                costPerUnit: 0,
                currentStock: 0,
                minStockLevel: 0,
                salesChannels: ['pos'],
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
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

    const toggleSalesChannel = (channel: 'pos' | 'web' | 'rappi') => {
        const current = formData.salesChannels || [];
        if (current.includes(channel)) {
            setFormData({ ...formData, salesChannels: current.filter(c => c !== channel) });
        } else {
            setFormData({ ...formData, salesChannels: [...current, channel] });
        }
    };

    // Filtering
    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        const matchesType = filterType === 'all' || item.type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 text-black transition"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-zinc-900 flex items-center gap-3">
                            <Package className="text-black" /> Gestor de Inventario y Menú
                        </h1>
                        <p className="text-zinc-500 mt-1">Añade, edita y elimina productos de la base de datos.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-black text-white px-5 py-2.5 rounded-full font-bold flex items-center gap-2 hover:bg-zinc-800 transition"
                    >
                        <Plus size={18} /> Nuevo Producto
                    </button>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black"
                    >
                        <option value="all">Todos los Tipos</option>
                        <option value="finished_good">Productos Finales (Menú)</option>
                        <option value="wip">Pre-producción (WIP)</option>
                        <option value="raw_material">Materia Prima</option>
                    </select>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                                    <th className="p-4 font-medium">Nombre</th>
                                    <th className="p-4 font-medium">Tipo</th>
                                    <th className="p-4 font-medium">Categoría</th>
                                    <th className="p-4 font-medium">Precio/Costo</th>
                                    <th className="p-4 font-medium">Stock Actual</th>
                                    <th className="p-4 font-medium">Canales</th>
                                    <th className="p-4 font-medium text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">Cargando base de datos...</td></tr>
                                ) : filteredItems.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition">
                                        <td className="p-4 font-bold text-zinc-900">{item.name}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs rounded-md font-medium ${item.type === 'finished_good' ? 'bg-green-100 text-green-700' :
                                                item.type === 'wip' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="p-4 text-zinc-600">{item.category || '-'}</td>
                                        <td className="p-4 font-medium">${item.costPerUnit.toLocaleString()}</td>
                                        <td className="p-4">
                                            <span className={`font-bold ${item.currentStock <= item.minStockLevel ? 'text-red-500' : 'text-zinc-700'}`}>
                                                {item.currentStock}
                                            </span>
                                            <span className="text-sm text-zinc-400 ml-1">{item.unit}</span>
                                        </td>
                                        <td className="p-4 flex gap-1">
                                            {item.salesChannels?.map(ch => (
                                                <span key={ch} className="bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded text-xs uppercase">{ch}</span>
                                            ))}
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button onClick={() => handleOpenModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(item.id!)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- MODAL FORM --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 md:p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">{editingId ? 'Editar Producto' : 'Crear Producto'}</h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Name */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Nombre del Producto</label>
                                        <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200" placeholder="Ej. Torta de Zanahoria" />
                                    </div>

                                    {/* Type */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Tipo de Inventario</label>
                                        <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })} className="w-full p-3 rounded-xl border border-gray-200">
                                            <option value="finished_good">Producto Final (A la venta)</option>
                                            <option value="wip">Masa / Pre-producción</option>
                                            <option value="raw_material">Materia Prima</option>
                                        </select>
                                    </div>

                                    {/* Category */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Categoría</label>
                                        <input type="text" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200" placeholder="Ej. Clásicos, Café..." />
                                    </div>

                                    {/* Unit */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Unidad de Medida</label>
                                        <input required type="text" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full p-3 rounded-xl border border-gray-200" placeholder="Ej. unidades, kg, ml..." />
                                    </div>

                                    {/* Cost/Price */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Precio / Costo ($)</label>
                                        <input required type="number" min="0" value={formData.costPerUnit} onChange={e => setFormData({ ...formData, costPerUnit: Number(e.target.value) })} className="w-full p-3 rounded-xl border border-gray-200" />
                                    </div>

                                    {/* Stock */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Stock Actual</label>
                                        <input required type="number" min="0" value={formData.currentStock} onChange={e => setFormData({ ...formData, currentStock: Number(e.target.value) })} className="w-full p-3 rounded-xl border border-gray-200" />
                                    </div>

                                    {/* Min Stock */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Stock Mínimo (Alerta)</label>
                                        <input required type="number" min="0" value={formData.minStockLevel} onChange={e => setFormData({ ...formData, minStockLevel: Number(e.target.value) })} className="w-full p-3 rounded-xl border border-gray-200" />
                                    </div>
                                </div>

                                {/* Sales Channels (Only show for finished goods) */}
                                {formData.type === 'finished_good' && (
                                    <div className="pt-4 border-t border-gray-100">
                                        <label className="text-sm font-bold text-gray-700 mb-3 block">¿Dónde se vende este producto?</label>
                                        <div className="flex gap-4">
                                            {['pos', 'web', 'rappi'].map((channel) => (
                                                <button
                                                    key={channel}
                                                    type="button"
                                                    onClick={() => toggleSalesChannel(channel as any)}
                                                    className={`flex-1 py-3 border-2 rounded-xl font-bold uppercase transition ${formData.salesChannels?.includes(channel as any)
                                                        ? 'border-black bg-black text-white'
                                                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                                        }`}
                                                >
                                                    {channel}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-gray-500 hover:bg-gray-100 rounded-full transition">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="px-8 py-3 font-bold bg-black text-white rounded-full hover:bg-zinc-800 transition shadow-lg">
                                        Guardar Producto
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