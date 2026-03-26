import Link from 'next/link';
import { Clock, ShoppingBag, CheckCircle, ArrowRight } from 'lucide-react';
import { mockProducts } from '../lib/mockData';
import { Dancing_Script } from 'next/font/google';

// 1. Initialize the font for the big Hero title
const dancingScript = Dancing_Script({ 
  subsets: ['latin'],
  weight: ['700'] 
});

export default function Home() {
  const bestSellers = mockProducts.slice(0, 3);

  return (
    <main className="flex flex-col min-h-screen bg-gray-50 pb-10">
      
      {/* 1. HERO SECTION */}
      <section className="relative h-[65vh] w-full flex items-center justify-center bg-zinc-900">
        <div 
          className="absolute inset-0 opacity-50 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1621303837174-89787a7d4729?q=80&w=1200')" }}
        />
        <div className="relative z-10 text-center px-6 flex flex-col items-center w-full max-w-2xl">
          
          {/* Apply the cursive font here, and make it slightly larger! */}
          <h1 className={`text-6xl md:text-8xl text-white mb-2 drop-shadow-lg ${dancingScript.className}`}>
            Aura Bakery
          </h1>
          
          <p className="text-xl md:text-2xl text-white font-medium mb-8 drop-shadow-md mt-4">
            Postres por capas. Hechos bajo pedido.
          </p>
          <Link 
            href="/menu" 
            className="w-full md:w-auto bg-black text-white text-lg font-bold py-4 px-10 rounded-full flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors shadow-xl"
          >
            Ordenar ahora <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* 2. CÓMO FUNCIONA */}
      <section className="py-12 px-6 bg-white">
        <h2 className="text-2xl font-extrabold text-center mb-10 text-zinc-900 tracking-tight">
          ¿Cómo funciona?
        </h2>
        <div className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto">
          <div className="flex flex-col items-center text-center flex-1">
            <div className="bg-zinc-100 p-5 rounded-full mb-4">
              <ShoppingBag className="text-zinc-900" size={28} />
            </div>
            <h3 className="font-bold text-lg mb-2">1. Pides</h3>
            <p className="text-sm text-zinc-500 font-medium">Elige del menú tu antojo favorito.</p>
          </div>
          <div className="flex flex-col items-center text-center flex-1">
            <div className="bg-zinc-100 p-5 rounded-full mb-4">
              <Clock className="text-zinc-900" size={28} />
            </div>
            <h3 className="font-bold text-lg mb-2">2. Lo preparamos</h3>
            <p className="text-sm text-zinc-500 font-medium">Fresco y hecho exclusivamente para ti.</p>
          </div>
          <div className="flex flex-col items-center text-center flex-1">
            <div className="bg-zinc-100 p-5 rounded-full mb-4">
              <CheckCircle className="text-zinc-900" size={28} />
            </div>
            <h3 className="font-bold text-lg mb-2">3. Lo recibes</h3>
            <p className="text-sm text-zinc-500 font-medium">Recoge en tienda o recíbelo en tu puerta.</p>
          </div>
        </div>
      </section>

      {/* 3. BEST SELLERS */}
      <section className="py-12 px-6 bg-gray-50">
        <div className="flex justify-between items-end mb-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Best Sellers</h2>
          <Link href="/menu" className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">
            Ver menú &rarr;
          </Link>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 max-w-4xl mx-auto">
          {bestSellers.map((product) => (
            <div key={product.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex-1 flex md:flex-col">
              <div 
                className="h-32 w-32 md:w-full md:h-56 bg-cover bg-center flex-shrink-0"
                style={{ backgroundImage: `url(${product.imageUrl})` }}
              />
              <div className="p-5 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="font-bold text-zinc-900 text-lg leading-tight mb-2">{product.name}</h3>
                  <p className="text-zinc-500 text-sm mb-4 line-clamp-2">{product.description}</p>
                </div>
                <div className="flex justify-between items-center mt-auto">
                  <span className="font-extrabold text-zinc-900 text-lg">
                    ${product.price.toLocaleString('es-CO')}
                  </span>
                  <Link 
                    href="/menu"
                    className="bg-zinc-100 text-zinc-900 px-5 py-2.5 rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors"
                  >
                    Pedir
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. CTA FINAL */}
      <section className="pt-12 pb-6 px-6 bg-gray-50 text-center">
        <Link 
          href="/menu" 
          className="inline-block w-full md:w-auto bg-black text-white text-lg font-bold py-4 px-12 rounded-full hover:bg-zinc-800 transition-colors shadow-lg"
        >
          Ordena ahora
        </Link>
      </section>

    </main>
  );
}