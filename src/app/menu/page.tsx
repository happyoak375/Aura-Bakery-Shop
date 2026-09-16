"use client";

/**
 * @fileoverview Catálogo General del Menú (MenuPage) - Aura Bakery
 * 
 * Funcionalidades clave:
 * 1. Carga en tiempo real: Obtiene la lista de productos activos desde Firestore (`fetchProducts`).
 * 2. Filtrado dinámico por categoría: Genera categorías únicas automáticamente basadas en los
 *    datos recibidos y permite la navegación mediante botones de selección horizontal con scroll.
 * 3. Distintivos de disponibilidad (Badges): Muestra el tipo de entrega o tiempo de preparación
 *    requerido para cada producto ('Para hoy', '24h', '48h', 'Asesor').
 * 4. Resiliencia de imágenes: Prioriza `imageUrl` de base de datos con fallback al helper local
 *    `getLocalProductImage` y recuperación por error hacia el logo institucional.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Zap, MessageCircle } from 'lucide-react';
import { AvailabilityType, Product } from '../../lib/mockData';
import { fetchProducts, getLocalProductImage } from '../../lib/api';

/**
 * Genera el icono, texto y diseño del badge de disponibilidad según la regla de preparación.
 * 
 * @param type Tipo de disponibilidad ('asap' | '24h' | '48h' | 'advisor_only')
 * @returns Objeto con icono React, etiqueta de texto y clases Tailwind de estilo
 */
const getMiniBadge = (type: AvailabilityType) => {
  switch (type) {
    case 'asap':
      return {
        icon: <Zap size={12} />,
        text: 'Para hoy',
        style: 'bg-amber-100 text-amber-700'
      };
    case '24h':
      return {
        icon: <Clock size={12} />,
        text: '24h',
        style: 'bg-blue-100 text-blue-700'
      };
    case '48h':
      return {
        icon: <Clock size={12} />,
        text: '48h',
        style: 'bg-purple-100 text-purple-700'
      };
    case 'advisor_only':
      return {
        icon: <MessageCircle size={12} />,
        text: 'Asesor',
        style: 'bg-green-100 text-green-700'
      };
    default:
      return {
        icon: <Clock size={12} />,
        text: 'Consultar',
        style: 'bg-gray-100 text-gray-700'
      };
  }
};

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * Carga los productos habilitados para la venta web desde el backend/Firestore.
   */
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const liveData = await fetchProducts();
        setProducts(liveData);
      } catch (error) {
        console.error("Error al cargar el catálogo de productos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCatalog();
  }, []);

  /**
   * Construcción dinámica de la lista de categorías:
   * Extrae los valores únicos de los productos disponibles y antepone 'Todos'.
   */
  const categories = ['Todos', ...Array.from(new Set(products.map((p) => p.category || 'Otros')))];

  /**
   * Lista filtrada según la pestaña de categoría activa.
   */
  const filteredProducts = activeCategory === 'Todos'
    ? products
    : products.filter((p) => p.category === activeCategory);

  return (
    <main className="min-h-screen bg-gray-50 pb-32 pt-6 px-6 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* ENCABEZADO DE PÁGINA */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight mb-2">
            Nuestro Menú
          </h1>
          <p className="text-zinc-500 font-medium text-sm">
            Postres artesanales, hechos sobre pedido para ti.
          </p>
        </div>

        {/* ESTADO DE CARGA */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-zinc-500 font-medium animate-pulse">Cargando el horno...</p>
          </div>
        ) : (
          <>
            {/* SELECTOR HORIZONTAL DE CATEGORÍAS */}
            <div className="flex overflow-x-auto gap-3 pb-4 mb-4 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
              {categories.map((category, index) => (
                <button
                  key={`${category}-${index}`}
                  onClick={() => setActiveCategory(category)}
                  className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 ${activeCategory === category
                    ? 'bg-black text-white shadow-md'
                    : 'bg-white text-zinc-600 border border-gray-200 hover:border-gray-300'
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* GRILLA DE PRODUCTOS */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const badge = getMiniBadge(product.availabilityType);

                return (
                  <Link
                    href={`/menu/${product.id}`}
                    key={product.id}
                    className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow active:scale-95 group"
                  >
                    {/* CONTENEDOR DE IMAGEN Y BADGE DE DISPONIBILIDAD */}
                    <div className="relative aspect-square bg-gray-100 w-full overflow-hidden">
                      <div className={`absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold shadow-sm ${badge.style}`}>
                        {badge.icon} {badge.text}
                      </div>

                      <img
                        src={product.imageUrl || getLocalProductImage(product.name)}
                        alt={product.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/logo-aura.png';
                        }}
                      />
                    </div>

                    {/* DETALLES Y PRECIO */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-bold text-zinc-900 text-sm leading-tight mb-1">
                        {product.name}
                      </h3>

                      <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
                        {product.description}
                      </p>

                      <div className="mt-auto pt-2 flex items-center justify-between border-t border-gray-50">
                        <span className="font-extrabold text-zinc-900 text-sm">
                          ${product.basePrice.toLocaleString('es-CO')}
                        </span>
                        <div className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-lg leading-none pb-0.5 shadow-sm group-hover:bg-zinc-800 transition-colors">
                          +
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* ESTADO VACÍO CUANDO NO HAY PRODUCTOS EN LA CATEGORÍA */}
            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                No hay productos disponibles en esta categoría.
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}