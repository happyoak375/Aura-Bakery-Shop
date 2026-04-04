/**
 * @fileoverview Main Admin Dashboard Component
 * Serves as the central command hub for the bakery. It includes a real-time feed 
 * of incoming orders, a time-slot capacity manager, and a secure portal for 
 * creating new employee accounts without disrupting the current admin session.
 */

'use client';

// ==========================================
// 1. IMPORTS
// ==========================================
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Users, ShoppingBag, Clock } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

// Firebase Frontend SDK (Auth & Firestore)
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';

// Firebase "Secondary App" SDK imports for safely creating users
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as signOutSecondary } from 'firebase/auth';

// ==========================================
// 2. FONTS & CONFIGURATION
// ==========================================
const cormorant = Cormorant_Garamond({ 
  subsets: ["latin"],
  weight: ['600']
});

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
export default function AdminDashboard() {
  const router = useRouter();
  
  // --- Global UI State ---
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'team'>('orders');

  // --- Team Management State ---
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [teamMessage, setTeamMessage] = useState({ type: '', text: '' });

  // --- Orders & Time Slots State ---
  const [orders, setOrders] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  // ==========================================
  // 4. EFFECTS & LISTENERS
  // ==========================================

  /**
   * SECURITY WRAPPER: Route Protection
   * Listens for Firebase auth state changes. If a user tries to manually type 
   * `/admin` into the URL bar without being logged in, this kicks them back to `/admin/login`.
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/admin/login');
      } else {
        setIsCheckingAuth(false);
      }
    });
    // Cleanup listener on unmount to prevent memory leaks
    return () => unsubscribe();
  }, [router]);

  /**
   * LIVE DATABASE FEED: Firestore Real-time Listeners
   * Uses `onSnapshot` instead of standard `getDocs`. This creates a persistent WebSocket 
   * connection to the database. The UI will instantly re-render the moment a customer 
   * places an order or a time slot capacity changes.
   */
  useEffect(() => {
    if (isCheckingAuth) return; // Wait until we verify the admin is logged in

    // 1. Subscribing to Orders (Sorted newest first)
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(qOrders, (querySnapshot) => {
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      setIsLoadingOrders(false);
    });

    // 2. Subscribing to Time Slots
    const qSlots = query(collection(db, 'time_slots'));
    const unsubscribeSlots = onSnapshot(qSlots, (querySnapshot) => {
      const slotsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort slots alphabetically/by ID so the timeline renders in chronological order
      slotsData.sort((a, b) => a.id.localeCompare(b.id));
      setTimeSlots(slotsData);
    });

    // Disconnect from the database when the admin closes the tab or navigates away
    return () => {
      unsubscribeOrders();
      unsubscribeSlots();
    };
  }, [isCheckingAuth]);


  // ==========================================
  // 5. ACTION HANDLERS
  // ==========================================

  /**
   * Terminates the current admin session.
   */
  const handleLogout = async () => {
    await signOut(auth);
    router.push('/admin/login');
  };

  /**
   * ARCHITECTURE NOTE: The "Secondary App" Workaround
   * By default, Firebase's `createUserWithEmailAndPassword` automatically logs the 
   * newly created user in. If we used the main `auth` instance, creating a team 
   * member would instantly kick the Admin out of their dashboard.
   * * To fix this, we spin up an isolated, temporary secondary Firebase instance just 
   * to create the account, and then immediately destroy it.
   */
  const handleCreateTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    setTeamMessage({ type: '', text: '' });

    try {
      // 1. Steal the configuration keys from the main app
      const mainApp = getApp();
      const firebaseConfig = mainApp.options;

      // 2. Initialize or retrieve the isolated secondary app
      const secondaryAppName = 'SecondaryApp';
      const secondaryApp = getApps().find(app => app.name === secondaryAppName) 
        || initializeApp(firebaseConfig, secondaryAppName);
      
      const secondaryAuth = getAuth(secondaryApp);

      // 3. Create the user within the isolated instance
      await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      
      // 4. Terminate the isolated session to prevent ghost logins
      await signOutSecondary(secondaryAuth);

      setTeamMessage({ type: 'success', text: '¡Cuenta de empleado creada exitosamente!' });
      setNewEmail('');
      setNewPassword('');

    } catch (error: any) {
      console.error("Error creating user:", error);
      setTeamMessage({ type: 'error', text: 'Hubo un error al crear la cuenta. Verifica que el correo no exista ya.' });
    } finally {
      setIsCreatingUser(false);
    }
  };
  
  /**
   * Updates the kitchen progression state of an order.
   */
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { orderStatus: newStatus });
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Hubo un error al actualizar el estado.");
    }
  };

  /**
   * Manual override for WhatsApp/Cash orders. Switches pending status to paid.
   */
  const handleMarkAsPaid = async (orderId: string) => {
    // Failsafe confirmation to prevent accidental clicks by staff
    if (!window.confirm('¿Confirmar que este pedido ya fue pagado?')) return;
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { paymentStatus: 'paid' });
    } catch (error) {
      console.error("Error updating payment status:", error);
      alert("Hubo un error al actualizar el pago.");
    }
  };

  /**
   * Toggles a time slot on or off, instantly removing it from the public checkout.
   */
  const handleToggleTimeSlot = async (slotId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'time_slots', slotId), { isActive: !currentStatus });
    } catch (error) {
      console.error("Error toggling slot:", error);
    }
  };

  /**
   * Clears the current orders count back to 0. Used at the start of a new day.
   */
  const handleResetTimeSlot = async (slotId: string) => {
    if (!window.confirm('¿Estás seguro de reiniciar los pedidos a 0 para este horario?')) return;
    try {
      await updateDoc(doc(db, 'time_slots', slotId), { currentOrders: 0 });
    } catch (error) {
      console.error("Error resetting slot:", error);
    }
  };

  // ==========================================
  // 6. RENDER HELPERS
  // ==========================================

  // Prevents the dashboard UI from flashing on screen for a split second 
  // before the router kicks unauthorized users out.
  if (isCheckingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 lowercase text-zinc-400">verificando credenciales...</div>;
  }

  // ==========================================
  // 7. MAIN RENDER
  // ==========================================
  return (
    <main className="min-h-screen bg-gray-50 font-sans">
      
      {/* --- HEADER --- */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <h1 className={`text-2xl text-zinc-900 ${cormorant.className}`}>panel de control</h1>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-red-500 transition-colors lowercase font-medium"
        >
          <LogOut size={16} /> salir
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        
        {/* --- TABS NAVIGATION --- */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 pb-4 px-2 border-b-2 transition-all font-medium lowercase ${
              activeTab === 'orders' ? 'border-black text-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <ShoppingBag size={18} /> pedidos y horarios
          </button>
          
          <button 
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 pb-4 px-2 border-b-2 transition-all font-medium lowercase ${
              activeTab === 'team' ? 'border-black text-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <Users size={18} /> equipo
          </button>
        </div>

        {/* --- TAB CONTENT --- */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[400px]">
          
          {/* ORDERS & TIME SLOTS TAB */}
          {activeTab === 'orders' ? (
            <div>
              
              {/* --- TIME SLOTS MANAGER UI --- */}
              <div className="mb-10 pb-8 border-b border-gray-100">
                <h2 className="text-xl font-bold text-zinc-900 mb-6 lowercase flex items-center gap-2">
                  <Clock size={20} /> gestión de horarios
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {timeSlots.map((slot) => (
                    <div key={slot.id} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className={`font-bold lowercase ${!slot.isActive ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>
                          {slot.label}
                        </span>
                        <span className="text-xs font-bold text-zinc-500 bg-white px-2 py-1 rounded-md border border-gray-100 lowercase">
                          {slot.currentOrders} / {slot.maxCapacity} pedidos
                        </span>
                      </div>
                      
                      <div className="flex gap-2 mt-1">
                        <button 
                          onClick={() => handleToggleTimeSlot(slot.id, slot.isActive)}
                          className={`flex-1 text-xs font-bold py-2 rounded-xl transition-colors lowercase ${
                            slot.isActive 
                              ? 'bg-white border border-gray-200 text-zinc-600 hover:bg-gray-100' 
                              : 'bg-black text-white hover:bg-zinc-800'
                          }`}
                        >
                          {slot.isActive ? 'pausar horario' : 'activar horario'}
                        </button>
                        
                        <button 
                          onClick={() => handleResetTimeSlot(slot.id)}
                          disabled={slot.currentOrders === 0}
                          className="flex-1 bg-white border border-gray-200 text-xs font-bold text-zinc-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 py-2 rounded-xl transition-colors lowercase disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          reiniciar a 0
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* --- ORDERS FEED --- */}
              <h2 className="text-xl font-bold text-zinc-900 mb-6 lowercase flex items-center gap-2">
                <ShoppingBag size={20} /> pedidos recientes
              </h2>
              
              {isLoadingOrders ? (
                <div className="text-zinc-400 lowercase animate-pulse">cargando pedidos...</div>
              ) : orders.length === 0 ? (
                <div className="text-zinc-500 lowercase bg-gray-50 p-6 rounded-2xl text-center border border-gray-100">
                  no hay pedidos registrados aún.
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-zinc-900 lowercase">{order.customerName}</p>
                          <p className="text-xs text-zinc-500 lowercase">ID: {order.id.substring(0, 8)}...</p>
                        </div>
                        
                        <div className="text-right flex flex-col items-end gap-2">
                          <p className="font-bold text-zinc-900">${order.totalAmount?.toLocaleString('es-CO')}</p>
                          
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-2">
                              
                              <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                                order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                                order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {order.paymentStatus === 'paid' ? 'pagado' : order.paymentStatus === 'pending' ? 'pendiente' : order.paymentStatus}
                              </span>

                              <select 
                                value={order.orderStatus || 'nuevo'} 
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                className={`text-[10px] font-bold uppercase tracking-wider rounded-md px-2 py-1 outline-none cursor-pointer border ${
                                  (order.orderStatus || 'nuevo') === 'nuevo' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                  order.orderStatus === 'preparando' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                  'bg-gray-100 text-gray-700 border-gray-200'
                                }`}
                              >
                                <option value="nuevo">nuevo</option>
                                <option value="preparando">preparando</option>
                                <option value="entregado">entregado</option>
                              </select>
                            </div>

                            {order.paymentStatus === 'pending' && (
                              <button 
                                onClick={() => handleMarkAsPaid(order.id)}
                                className="text-[10px] font-medium text-zinc-400 hover:text-green-600 transition-colors lowercase underline"
                              >
                                marcar como pagado
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-zinc-600 lowercase bg-gray-50 p-3 rounded-xl mb-3 space-y-1">
                        <p><span className="font-semibold text-zinc-900">tel:</span> {order.customerPhone}</p>
                        <p><span className="font-semibold text-zinc-900">método:</span> {order.deliveryMethod === 'delivery' ? 'domicilio' : 'recoger'}</p>
                        {order.deliveryMethod === 'delivery' && (
                          <p><span className="font-semibold text-zinc-900">dirección:</span> {order.address}, {order.neighborhood}</p>
                        )}
                      </div>

                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">productos</p>
                        <ul className="text-sm text-zinc-700 lowercase space-y-1">
                          {order.items?.map((item: any, index: number) => (
                            <li key={index}>• {item.quantity}x {item.name}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          /* --- TEAM TAB --- */
          ) : (
            <div className="max-w-md">
              <h2 className="text-xl font-bold text-zinc-900 mb-6 lowercase flex items-center gap-2">
                <Users size={20} /> agregar nuevo empleado
              </h2>
              
              <form onSubmit={handleCreateTeamMember} className="space-y-4">
                {teamMessage.text && (
                  <div className={`text-sm p-3 rounded-xl border text-center lowercase ${
                    teamMessage.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-500 border-red-100'
                  }`}>
                    {teamMessage.text}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">correo electrónico</label>
                  <input 
                    type="email" 
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all lowercase"
                    placeholder="empleado@aurabakery.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">contraseña temporal</label>
                  <input 
                    type="password" 
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    placeholder="mínimo 6 caracteres"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isCreatingUser}
                  className="w-full bg-black text-white font-bold py-3 rounded-xl transition-all hover:bg-zinc-800 active:scale-95 mt-2 lowercase disabled:opacity-70"
                >
                  {isCreatingUser ? 'creando cuenta...' : 'crear acceso'}
                </button>
              </form>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}