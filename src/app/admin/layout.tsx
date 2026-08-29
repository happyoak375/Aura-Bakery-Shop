'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, LayoutDashboard, Settings } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

// Correct Auth Imports
import { useAuthStore } from '../../lib/store';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';

const cormorant = Cormorant_Garamond({
    subsets: ["latin"],
    weight: ['600']
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    // Pull your updated Firebase auth state from the Zustand store
    const { isStaffLoggedIn, setStaffUser, employeeEmail, logout } = useAuthStore();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);

        // Listen to Firebase directly to see which employee is logged in
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user && user.email) {
                setStaffUser(user.email);
            } else {
                setStaffUser(null);
                // Only redirect if they aren't already trying to log in
                if (window.location.pathname !== '/admin/login' && window.location.pathname !== '/') {
                    router.push('/');
                }
            }
        });

        return () => unsubscribe();
    }, [router, setStaffUser]);

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    // Prevent hydration errors by waiting to render until mounted
    if (!isMounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-zinc-400 font-medium">
                iniciando sistema...
            </div>
        );
    }

    // Hide the sidebar if we are actively on the login screen
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    // Show verification state if not logged in but trying to access secure routes
    if (!isStaffLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-zinc-400 font-medium">
                verificando accesos...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans pb-20 md:pb-0">

            {/* --- MOBILE TOP BAR --- */}
            <div className="md:hidden bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
                <h2 className={`text-2xl text-zinc-900 ${cormorant.className}`}>aura admin</h2>
                <button onClick={handleLogout} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <LogOut size={20} />
                </button>
            </div>

            {/* --- DESKTOP SIDEBAR --- */}
            <aside className="w-64 bg-white border-r border-gray-100 flex-col hidden md:flex sticky top-0 h-screen">
                <div className="p-6 border-b border-gray-100">
                    <h2 className={`text-2xl text-zinc-900 ${cormorant.className}`}>aura admin</h2>
                    {/* Now shows the exact email of the employee! */}
                    <p className="text-xs text-zinc-500 truncate mt-1">{employeeEmail || 'Equipo Aura'}</p>
                </div>

                <nav className="flex-1 p-4 space-y-2 mt-2">
                    <Link
                        href="/admin"
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${pathname === '/admin' ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-gray-50'}`}
                    >
                        <LayoutDashboard size={18} /> panel
                    </Link>
                    <Link
                        href="/admin/config"
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${pathname === '/admin/config' ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-gray-50'}`}
                    >
                        <Settings size={18} /> configuración
                    </Link>
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={18} /> salir
                    </button>
                </div>
            </aside>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>

            {/* --- MOBILE BOTTOM NAV --- */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 flex items-center justify-around p-3 z-50 pb-safe">
                <Link href="/admin" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${pathname === '/admin' ? 'text-black' : 'text-zinc-400'}`}>
                    <LayoutDashboard size={20} />
                </Link>
                <Link href="/admin/config" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${pathname === '/admin/config' ? 'text-black' : 'text-zinc-400'}`}>
                    <Settings size={20} />
                </Link>
            </nav>

        </div>
    );
}