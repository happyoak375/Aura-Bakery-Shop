'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import Link from 'next/link';
import { LogOut, Package, LayoutDashboard, ClipboardList, Settings } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

const cormorant = Cormorant_Garamond({
    subsets: ["latin"],
    weight: ['600']
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsLoading(false);

            if (!currentUser && pathname !== '/admin/login') {
                router.push('/admin/login');
            }

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

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 lowercase text-zinc-400 font-medium">
                verificando accesos...
            </div>
        );
    }

    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    if (user) {
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
                        <Link
                            href="/admin/config"
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors lowercase ${pathname.includes('/admin/config') ? 'bg-black text-white shadow-md' : 'text-zinc-600 hover:bg-gray-50'}`}
                        >
                            <Settings size={18} /> configuración
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

                {/* --- MOBILE BOTTOM NAV --- */}
                <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 flex items-center justify-around p-3 z-50 pb-safe">
                    <Link href="/admin" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${pathname === '/admin' ? 'text-black' : 'text-zinc-400'}`}>
                        <LayoutDashboard size={20} />
                        <span className="text-[10px] font-bold">panel</span>
                    </Link>
                    <Link href="/admin/orders" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${pathname.includes('/admin/orders') ? 'text-black' : 'text-zinc-400'}`}>
                        <ClipboardList size={20} />
                        <span className="text-[10px] font-bold">cocina</span>
                    </Link>
                    <Link href="/admin/products" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${pathname.includes('/admin/products') ? 'text-black' : 'text-zinc-400'}`}>
                        <Package size={20} />
                        <span className="text-[10px] font-bold">menú</span>
                    </Link>
                    <Link href="/admin/config" className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${pathname.includes('/admin/config') ? 'text-black' : 'text-zinc-400'}`}>
                        <Settings size={20} />
                        <span className="text-[10px] font-bold">ajustes</span>
                    </Link>
                </nav>

                {/* --- DYNAMIC PAGE CONTENT --- */}
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>

            </div>
        );
    }

    return null;
}