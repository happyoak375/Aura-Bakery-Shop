'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, LayoutDashboard, Settings } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

// Auth Imports
import { useAuthStore } from '../../lib/store';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const cormorant = Cormorant_Garamond({
    subsets: ["latin"],
    weight: ['600']
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const { isStaffLoggedIn, setStaffUser, employeeEmail, role, logout } = useAuthStore();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user && user.email) {
                try {
                    const roleDocRef = doc(db, 'staff_roles', user.uid);
                    const roleDocSnap = await getDoc(roleDocRef);

                    let assignedRole: 'admin' | 'barista' = 'barista';
                    if (roleDocSnap.exists()) {
                        assignedRole = roleDocSnap.data().role;
                    }

                    setStaffUser(user.email, assignedRole);

                    // Hard Route Guard: Boot baristas out of settings and inventory
                    if (assignedRole === 'barista' && (pathname.includes('/config') || pathname.includes('/inventory'))) {
                        router.push('/admin');
                    }

                } catch (error) {
                    console.error("Error fetching role:", error);
                    setStaffUser(user.email, 'barista');
                }
            } else {
                setStaffUser(null, null);
                if (pathname !== '/admin/login' && pathname !== '/') {
                    router.push('/admin/login');
                }
            }
        });

        return () => unsubscribe();
    }, [pathname, router, setStaffUser]);

    const handleLogout = async () => {
        await logout();
        router.push('/admin/login');
    };

    if (!isMounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-zinc-400 font-medium">
                iniciando sistema...
            </div>
        );
    }

    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

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
                    <p className="text-xs text-zinc-500 truncate mt-1">{employeeEmail || 'Equipo Aura'}</p>

                    {/* Visual Role Badge */}
                    <span className={`inline-block mt-2 px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md ${role === 'admin' ? 'bg-black text-white' : 'bg-blue-100 text-blue-700'}`}>
                        {role || 'Cargando...'}
                    </span>
                </div>

                <nav className="flex-1 p-4 space-y-2 mt-2">
                    <Link
                        href="/admin"
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${pathname === '/admin' ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-gray-50'}`}
                    >
                        <LayoutDashboard size={18} /> panel
                    </Link>

                    {/* 🔒 RBAC: Only Admins can see the Settings link */}
                    {role === 'admin' && (
                        <Link
                            href="/admin/config"
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${pathname === '/admin/config' ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-gray-50'}`}
                        >
                            <Settings size={18} /> configuración
                        </Link>
                    )}
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

                {/* 🔒 RBAC: Only Admins can see the Mobile Settings link */}
                {role === 'admin' && (
                    <Link href="/admin/config" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${pathname === '/admin/config' ? 'text-black' : 'text-zinc-400'}`}>
                        <Settings size={20} />
                    </Link>
                )}
            </nav>

        </div>
    );
}