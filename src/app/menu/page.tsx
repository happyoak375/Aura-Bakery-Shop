"use client";

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { mockProducts } from '../../lib/mockData';
import { useCartStore } from '../../lib/store';

export default function MenuPage() {
  const addItem = useCartStore((state) => state.addItem);
  const [activeCategory, setActiveCategory] = useState('Todos');

  // Extract unique categories from our mock data
  const categories = ['Todos', ...Array.from(new Set(mockProducts.map(p => p.category)))];

  // Filter products based on selected category
  const filteredProducts = activeCategory === 'Todos' 
    ? mockProducts 
    : mockProducts.filter(p => p.category === activeCategory);

  return (
    <main className="min-h-screen bg-gray-50 pb-24 pt-6 px-6">
      <div className="max-w-4xl mx-auto">
        
        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight mb-6">
          Nuestro Menú
        </h1>

        {/* CATEGORY NAV (Horizontal Scroll on Mobile) */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-colors ${
                activeCategory === category
                  ? 'bg-black text-white'
                  : 'bg-white text-zinc-500 border border-gray-200 hover:border-black hover:text-black'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* PRODUCT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
              
              {/* Product Image */}
              <div 
                className="h-48 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${product.imageUrl})` }}
              />
              
              {/* Product Info */}
              <div className="p-5 flex flex-col flex-1">
                <div className="mb-4">
                  <h3 className="font-bold text-zinc-900 text-lg leading-tight mb-1">
                    {product.name}
                  </h3>
                  <p className="text-zinc-500 text-sm line-clamp-2">
                    {product.description}
                  </p>
                </div>
                
                {/* Price & Add Button */}
                <div className="flex justify-between items-center mt-auto">
                  <span className="font-extrabold text-zinc-900 text-lg">
                    ${product.price.toLocaleString('es-CO')}
                  </span>
                  <button 
                    onClick={() => addItem(product)}
                    className="bg-black text-white p-3 rounded-full hover:bg-zinc-800 transition-colors active:scale-95"
                    aria-label="Agregar al carrito"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </main>
  );
}