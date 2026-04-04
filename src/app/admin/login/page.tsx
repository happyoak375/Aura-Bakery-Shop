/**
 * @fileoverview Admin Authentication Portal
 * Provides the UI and logic for bakery staff/owners to log into the backend.
 * This component acts as the "front door" to the secure `/admin` routes.
 */

'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

// ==========================================
// 1. FONTS & CONFIGURATION
// ==========================================
const cormorant = Cormorant_Garamond({ 
  subsets: ["latin"],
  weight: ['600']
});

// ==========================================
// 2. MAIN COMPONENT
// ==========================================
export default function AdminLoginPage() {
  // --- State Management ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Next.js router for programmatic navigation after a successful login
  const router = useRouter();

  /**
   * Handles the form submission and authenticates with Firebase.
   * * WHY WE DO IT THIS WAY: 
   * Firebase automatically persists the user's session in the browser (usually in 
   * IndexedDB). This means that once `signInWithEmailAndPassword` succeeds here, 
   * we just push the user to `/admin`. The `onAuthStateChanged` listener we built 
   * over in the AdminDashboard will instantly detect this persisted session and 
   * grant them access.
   */
  const handleLogin = async (e: React.FormEvent) => {
    // Prevent the default HTML form behavior (which reloads the whole page)
    e.preventDefault();
    
    setIsLoading(true);
    setError(''); // Clear any previous errors before trying again

    try {
      // Attempt to authenticate the user using the credentials from the input fields
      await signInWithEmailAndPassword(auth, email, password);
      
      // If successful, redirect to the protected dashboard
      router.push('/admin');
      
    } catch (err: any) {
      console.error("Login error:", err);
      // Display a generic, user-friendly error message. 
      // Security Best Practice: Never tell the user *which* part (email or password) 
      // was wrong, as that helps attackers guess valid email addresses.
      setError('Correo o contraseña incorrectos.');
    } finally {
      // Always turn off the loading state, whether it succeeded or failed
      setIsLoading(false);
    }
  };

  // ==========================================
  // 3. RENDER
  // ==========================================
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
            <Lock size={24} className="text-zinc-900" />
          </div>
          <h1 className={`text-3xl text-zinc-900 ${cormorant.className}`}>Panel de Acceso</h1>
          <p className="text-zinc-500 text-sm mt-2 lowercase">solo personal autorizado</p>
        </div>

        {/* --- LOGIN FORM --- */}
        <form onSubmit={handleLogin} className="space-y-5">
          
          {/* Error Message Banner */}
          {error && (
            <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl border border-red-100 text-center lowercase">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
              correo electrónico
            </label>
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
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
              contraseña
            </label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
              placeholder="••••••••"
            />
          </div>

          {/* Submit Button
            UX Note: The button is disabled and changes text while loading to prevent 
            impatient users from clicking it multiple times and spamming the database.
          */}
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