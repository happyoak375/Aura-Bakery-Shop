'use client';

/**
 * @fileoverview Portal de Autenticación de Personal (AdminLoginPage) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Acceso Restringido:
 *    - Entrada principal para empleados (administradores y baristas) al entorno administrativo.
 * 2. Autenticación con Firebase Auth:
 *    - Ejecuta `signInWithEmailAndPassword(auth, email, password)` para validar credenciales.
 *    - La sesión se persiste localmente en el navegador (IndexedDB), siendo detectada de inmediato
 *      por el observador `onAuthStateChanged` configurado en el Layout de administración.
 * 3. Enrutamiento Protegido:
 *    - Tras un inicio de sesión exitoso, redirige automáticamente al Panel de Control Central (/admin).
 * 4. Manejo Seguro de Errores:
 *    - Despliega un mensaje neutro sin especificar si el fallo reside en el usuario o en la contraseña,
 *      mitigando ataques de fuerza bruta o enumeración de correos.
 */

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

// Tipografía editorial usada para encabezados institucionales
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ['600']
});

export default function AdminLoginPage() {
  const router = useRouter();

  // Estados del formulario y validación
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /**
   * PROCESAMIENTO DE INICIO DE SESIÓN:
   * Valida credenciales contra Firebase Auth y redirige al panel de control central.
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Redirección inmediata al Hub Operativo de Administración
      router.push('/admin');
    } catch (err: any) {
      console.error("Error al autenticar empleado:", err);
      // Mensaje de seguridad genérico: no expone si el correo existe o no
      setError('Correo o contraseña incorrectos. Verifica tus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white max-w-md w-full rounded-3xl p-8 shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-300">

        {/* ENCABEZADO VISUAL DEL FORMULARIO */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-zinc-900 shadow-sm">
            <Lock size={28} />
          </div>
          <h1 className={`text-3xl text-zinc-900 ${cormorant.className}`}>
            Acceso de Equipo
          </h1>
          <p className="text-zinc-500 text-sm mt-2 font-medium">
            Ingresa con tus credenciales asignadas de Aura Bakery
          </p>
        </div>

        {/* FORMULARIO DE ACCESO */}
        <form onSubmit={handleLogin} className="space-y-5">

          {/* BANNER DE RETROALIMENTACIÓN DE ERROR */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 text-center font-medium">
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
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium text-sm text-zinc-900"
              placeholder="empleado@aurabakery.com"
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
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium text-sm text-zinc-900"
              placeholder="••••••••"
            />
          </div>

          {/* BOTÓN DE ACCIÓN */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white font-bold py-4 rounded-xl mt-4 hover:bg-zinc-800 transition active:scale-95 disabled:opacity-70 shadow-md"
          >
            {isLoading ? 'Verificando accesos...' : 'Iniciar Sesión'}
          </button>
        </form>

      </div>
    </main>
  );
}