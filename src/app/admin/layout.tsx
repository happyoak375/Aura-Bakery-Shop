'use client';

/**
 * @fileoverview Layout de Administración con RBAC (Role-Based Access Control) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Control de Acceso y Verificación de Roles (RBAC):
 *    - Escucha de forma reactiva el estado de autenticación de Firebase (`onAuthStateChanged`).
 *    - Consulta el documento de rol en la colección 'staff_roles/{uid}' en Firestore.
 *    - Almacena el correo y el rol ('admin' | 'barista') en el store global de Zustand.
 * 2. Barrera Estricta de Rutas (Hard Route Guard):
 *    - Si un usuario con rol 'barista' intenta navegar hacia '/admin/config' o '/admin/inventory',
 *      el layout bloquea el acceso y lo expulsa automáticamente a '/admin'.
 * 3. Renderizado Condicional de Navegación:
 *    - Oculta dinámicamente los accesos a la configuración del sistema si el rol no es 'admin'.
 *    - Aísla la pantalla de inicio de sesión ('/admin/login') para omitir barras de navegación.
 * 4. Prevención de Hydration Mismatch:
 *    - Pausa el renderizado visual hasta que el componente se monte en el cliente (`isMounted`).
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, LayoutDashboard, Settings } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

// Autenticación y acceso a Firestore
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

    // Estado global de personal en Zustand
    const { isStaffLoggedIn, setStaffUser, employeeEmail, role, logout } = useAuthStore();
    const [isMounted, setIsMounted] = useState<boolean>(false);

    /**
     * ESCUCHA DE SESIÓN Y ASIGNACIÓN DE ROLES (RBAC):
     * Verifica la identidad en Firebase Auth, lee el rol asignado en Firestore
     * y aplica las restricciones de acceso según la ruta solicitada.
     */
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

                    // GUARDA DE SEGURIDAD ESTRICTA:
                    // Expulsa a los baristas si intentan acceder a configuración o inventario
                    if (
                        assignedRole === 'barista' &&
                        (pathname.includes('/config') || pathname.includes('/inventory'))
                    ) {
                        router.push('/admin');
                    }

                } catch (error) {
                    console.error("Error al obtener el rol del empleado:", error);
                    setStaffUser(user.email, 'barista');
                }
            } else {
                // Limpieza de sesión si el token expira o el usuario sale
                setStaffUser(null, null);
                if (pathname !== '/admin/login' && pathname !== '/') {
                    router.push('/admin/login');
                }
            }
        });

        return () => unsubscribe();
    }, [pathname, router, setStaffUser]);

    /**
     * Cierre de sesión y redirección al portal de autenticación administrativa.
     */
    const handleLogout = async () => {
        await logout();
        router.push('/admin/login');
    };

    // Previene errores de discrepancia de hidratación en Next.js
    if (!isMounted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-zinc-400 font-medium font-sans">
                iniciando sistema...
            </div>
        );
    }

    // Si la ruta activa es el portal de login, se renderiza sin barras de navegación
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    // Pantalla de carga intermedia mientras se valida la sesión para rutas protegidas
    if (!isStaffLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-zinc-400 font-medium font-sans">
                verificando accesos...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans pb-20 md:pb-0">

            {/* --- BARRA SUPERIOR PARA DISPOSITIVOS MÓVILES --- */}
            <div className="md:hidden bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
                <h2 className={`text-2xl text-zinc-900 ${cormorant.className}`}>aura admin</h2>
                <button
                    onClick={handleLogout}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Cerrar sesión"
                >
                    <LogOut size={20} />
                </button>
            </div>

            {/* --- BARRA LATERAL PARA ESCRITORIO (SIDEBAR) --- */}
            <aside className="w-64 bg-white border-r border-gray-100 flex-col hidden md:flex sticky top-0 h-screen">
                <div className="p-6 border-b border-gray-100">
                    <h2 className={`text-2xl text-zinc-900 ${cormorant.className}`}>aura admin</h2>
                    <p className="text-xs text-zinc-500 truncate mt-1">
                        {employeeEmail || 'Equipo Aura'}
                    </p>

                    {/* Insignia visual del rol activo */}
                    <span className={`inline-block mt-2 px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md ${role === 'admin' ? 'bg-black text-white' : 'bg-blue-100 text-blue-700'
                        }`}>
                        {role || 'Cargando...'}
                    </span>
                </div>

                {/* Enlaces de navegación principal */}
                <nav className="flex-1 p-4 space-y-2 mt-2">
                    <Link
                        href="/admin"
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${pathname === '/admin'
                                ? 'bg-black text-white shadow-md'
                                : 'text-zinc-600 hover:bg-gray-50'
                            }`}
                    >
                        <LayoutDashboard size={18} /> panel
                    </Link>

                    {/* RESTRICCIÓN RBAC: La configuración solo se expone a Administradores */}
                    {role === 'admin' && (
                        <Link
                            href="/admin/config"
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${pathname === '/admin/config'
                                    ? 'bg-black text-white shadow-md'
                                    : 'text-zinc-600 hover:bg-gray-50'
                                }`}
                        >
                            <Settings size={18} /> configuración
                        </Link>
                    )}
                </nav>

                {/* Botón de cierre de sesión */}
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={18} /> salir
                    </button>
                </div>
            </aside>

            {/* --- CONTENEDOR PRINCIPAL DINÁMICO --- */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>

            {/* --- BARRA DE NAVEGACIÓN INFERIOR PARA MÓVILES --- */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 flex items-center justify-around p-3 z-50 pb-safe">
                <Link
                    href="/admin"
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${pathname === '/admin' ? 'text-black' : 'text-zinc-400'
                        }`}
                    aria-label="Ir al panel principal"
                >
                    <LayoutDashboard size={20} />
                </Link>

                {/* RESTRICCIÓN RBAC MÓVIL */}
                {role === 'admin' && (
                    <Link
                        href="/admin/config"
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${pathname === '/admin/config' ? 'text-black' : 'text-zinc-400'
                            }`}
                        aria-label="Ir a configuración"
                    >
                        <Settings size={20} />
                    </Link>
                )}
            </nav>

        </div>
    );
}