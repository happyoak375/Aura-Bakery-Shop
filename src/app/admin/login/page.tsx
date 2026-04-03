'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

const cormorant = Cormorant_Garamond({ 
  subsets: ["latin"],
  weight: ['600']
});

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // If successful, push them to the main admin dashboard
      router.push('/admin');
    } catch (err: any) {
      console.error("Login error:", err);
      setError('Correo o contraseña incorrectos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
            <Lock size={24} className="text-zinc-900" />
          </div>
          <h1 className={`text-3xl text-zinc-900 ${cormorant.className}`}>Panel de Acceso</h1>
          <p className="text-zinc-500 text-sm mt-2 lowercase">solo personal autorizado</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl border border-red-100 text-center lowercase">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">correo electrónico</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all lowercase"
              placeholder="admin@aurabakery.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">contraseña</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white text-lg font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-zinc-800 active:scale-95 mt-4 lowercase disabled:opacity-70"
          >
            {isLoading ? 'verificando...' : 'iniciar sesión'}
          </button>
        </form>
        
      </div>
    </main>
  );
}