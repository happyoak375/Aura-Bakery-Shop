'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    Eye,
    EyeOff,
    ChevronRight,
    Filter
} from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';
import { db } from '../../../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { fetchAllProductsAdmin } from '../../../lib/api';
import { Product } from '../../../lib/mockData';

const cormorant = Cormorant_Garamond({
    subsets: ["latin"],
    weight: ['600']
});

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('todos');

    const loadInventory = async () => {
        setIsLoading(true);
        const data = await fetchAllProductsAdmin();
        setProducts(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadInventory();
    }, []);

    const toggleStatus = async (productId: string, currentStatus: boolean) => {
        try {
            const productRef = doc(db, 'products', productId);
            await updateDoc(productRef, { isActive: !currentStatus });
            setProducts(prev => prev.map(p =>
                p.id === productId ? { ...p, isActive: !currentStatus } : p
            ));
        } catch (error) {
            console.error("Error toggling status:", error);
            alert("No se pudo actualizar el estado.");
        }
    };

    const handleDelete = async (productId: string, productName: string) => {
        if (!window.confirm(`¿Estás seguro de eliminar "${productName}"? Esta acción no se puede deshacer.`)) return;
        try {
            await deleteDoc(doc(db, 'products', productId));
            setProducts(prev => prev.filter(p => p.id !== productId));
        } catch (error) {
            console.error("Error deleting product:", error);
            alert("Hubo un error al eliminar.");
        }
    };

    const categories = ['todos', ...Array.from(new Set(products.map(p => p.category)))];

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'todos' || p.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="max-w-6xl mx-auto px-8 py-10 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    {/* Removed lowercase from title */}
                    <h1 className={`text-4xl text-zinc-900 ${cormorant.className}`}>Gestión de Inventario</h1>
                    <p className="text-zinc-500 mt-1">Administra tus productos y su disponibilidad en la web.</p>
                </div>

                <Link
                    href="/admin/products/new"
                    className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all active:scale-95 shadow-md"
                >
                    <Plus size={20} /> Nuevo Producto
                </Link>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-black/5 focus:border-zinc-300 transition-all"
                    />
                </div>

                <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-2">
                    <Filter size={18} className="text-zinc-400" />
                    <select
                        value={activeCategory}
                        onChange={(e) => setActiveCategory(e.target.value)}
                        className="outline-none bg-transparent text-sm font-bold text-zinc-600 cursor-pointer"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-20 text-center text-zinc-400 animate-pulse lowercase">cargando catálogo...</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="p-20 text-center text-zinc-500 bg-gray-50/50">
                        No se encontraron productos.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">producto</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">categoría</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">precio base</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">estado</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className="group hover:bg-gray-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden relative flex-shrink-0">
                                                    <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full" />
                                                </div>
                                                <div>
                                                    {/* Removed lowercase class here */}
                                                    <p className="font-bold text-zinc-900 text-sm">{product.name}</p>
                                                    <p className="text-xs text-zinc-400">{product.variants.length} variantes</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-lg">
                                                {product.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-sm text-zinc-900">
                                            ${product.basePrice.toLocaleString('es-CO')}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => toggleStatus(product.id, product.isActive)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${product.isActive
                                                    ? 'bg-green-50 text-green-700 border border-green-100'
                                                    : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                                                    }`}
                                            >
                                                {product.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                                                {product.isActive ? 'activo' : 'pausado'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link
                                                    href={`/admin/products/${product.id}`}
                                                    className="p-2 text-zinc-400 hover:text-black hover:bg-white hover:shadow-sm rounded-lg transition-all"
                                                >
                                                    <Edit3 size={18} />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(product.id, product.name)}
                                                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}