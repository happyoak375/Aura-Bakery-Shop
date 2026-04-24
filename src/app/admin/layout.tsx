'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import Link from 'next/link';
import { LogOut, Package, LayoutDashboard, ClipboardList } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

// ==========================================
// 1. FONTS
// ==========================================
const cormorant = Cormorant_Garamond({
    subsets: ["latin"],
    weight: ['600']
});

// ==========================================
// 2. MAIN LAYOUT COMPONENT
// ==========================================
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Listen for Firebase login state changes
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsLoading(false);

            // KICKOUT: If no user and they aren't on the login page, send to login
            if (!currentUser && pathname !== '/admin/login') {
                router.push('/admin/login');
            }

            // REDIRECT: If logged in but trying to view the login page, send to dashboard
            if (currentUser && pathname === '/admin/login') {
                router.push('/admin');
            }
        });

        return () => unsubscribe();
    }, [pathname, router]);

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/admin/login');
    };

    // --- STATE 1: LOADING ---
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 lowercase text-zinc-400 font-medium">
                verificando accesos...
            </div>
        );
    }

    // --- STATE 2: LOGIN PAGE ---
    // If we are on the login page, render it completely naked (no sidebar)
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    // --- STATE 3: SECURE ADMIN AREA ---
    // If we have a user, wrap the children in the sidebar layout
    if (user) {
        return (
            <div className="min-h-screen bg-gray-50 flex font-sans">

                {/* --- SIDEBAR --- */}
                <aside className="w-64 bg-white border-r border-gray-100 flex-col hidden md:flex">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className={`text-2xl text-zinc-900 ${cormorant.className}`}>aura admin</h2>
                        <p className="text-xs text-zinc-500 truncate mt-1">{user.email}</p>
                    </div>

                    <nav className="flex-1 p-4 space-y-2 mt-2">
                        <Link
                            href="/admin"
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors lowercase ${pathname === '/admin' ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-gray-50'}`}
                        >
                            <LayoutDashboard size={18} /> panel
                        </Link>
                        <Link
                            href="/admin/orders"
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors lowercase ${pathname.includes('/admin/orders') ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-gray-50'}`}
                        >
                            <ClipboardList size={18} /> pedidos
                        </Link>
                        <Link
                            href="/admin/products"
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors lowercase ${pathname.includes('/admin/products') ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-gray-50'}`}
                        >
                            <Package size={18} /> inventario
                        </Link>
                    </nav>

                    <div className="p-4 border-t border-gray-100">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors lowercase"
                        >
                            <LogOut size={18} /> salir
                        </button>
                    </div>
                </aside>

                {/* --- DYNAMIC PAGE CONTENT --- */}
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>

            </div>
        );
    }

    return null;
}