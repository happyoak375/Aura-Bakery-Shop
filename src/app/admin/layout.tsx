'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase'; // Update this to match your Firebase config path
import { onAuthStateChanged } from 'firebase/auth';

const ADMIN_EMAILS = ['owner@bakery.com', 'your.email@example.com']; 

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // 1. ALL HOOKS AT THE TOP LEVEL
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const isUserAdmin = user && user.email && ADMIN_EMAILS.includes(user.email);

      if (isUserAdmin) {
        setIsAuthorized(true);
        // Optional UX improvement: If an admin is on the login page, redirect them to the dashboard
        if (pathname === '/admin/login') {
          router.push('/admin'); // Change '/admin' to your actual admin root
        }
      } else {
        setIsAuthorized(false);
        // If they are not an admin AND not already on the login page, kick them out
        if (pathname !== '/admin/login') {
          router.push('/'); 
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname]);

  // 2. CONDITIONAL RENDERING HAPPENS AFTER ALL HOOKS

  // If the user is unauthenticated but on the login page, show the login form
  if (pathname === '/admin/login' && !isAuthorized) {
    return <>{children}</>;
  }

  // Show a loading state while Firebase checks the user's status
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Cargando panel de administración...</p>
      </div>
    );
  }

  // If authorized, render the admin pages
  if (isAuthorized) {
    return (
      <div className="admin-container">
        {/* You can add a persistent Admin Sidebar or Navbar here later */}
        <nav className="bg-gray-800 text-white p-4">
          <h2>Panel de Administración</h2>
        </nav>
        <main className="p-6">
          {children}
        </main>
      </div>
    );
  }

  return null; // Fallback to prevent flashes before redirect
}