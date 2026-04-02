'use client';

import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Make sure this path points to your Firebase config
import { useRouter } from 'next/navigation';

// The allowed admin emails (you can add the bakery owner's real email here later)
const ADMIN_EMAILS = ['owner@bakery.com', 'your.email@example.com'];

export default function AdminLogin() {
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    
    try {
      // This opens the Google login popup
      const result = await signInWithPopup(auth, provider);
      const userEmail = result.user.email;

      // Check if the person who just logged in is actually the admin
      if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
        // Success! Send them to the dashboard
        router.push('/admin'); 
      } else {
        // If a random customer finds this page and logs in, kick them out
        await signOut(auth);
        alert('Acceso denegado: No tienes permisos de administrador.');
      }
    } catch (error) {
      console.error("Error logging in: ", error);
      alert('Hubo un error al iniciar sesión.');
    }
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold mb-2">Acceso Administrativo</h1>
        <p className="text-gray-600 mb-6">Inicia sesión para gestionar la tienda.</p>
        
        <button 
          onClick={handleGoogleSignIn}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Iniciar sesión con Google
        </button>
      </div>
    </div>
  );
}