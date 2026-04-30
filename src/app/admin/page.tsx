/**
 * @fileoverview Main Admin Dashboard Component
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, ShoppingBag, ClipboardList, Package } from 'lucide-react';
import { Cormorant_Garamond } from 'next/font/google';

import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as signOutSecondary } from 'firebase/auth';

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ['600']
});

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'team'>('orders');

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [teamMessage, setTeamMessage] = useState({ type: '', text: '' });

  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  // --- FILTROS DE ESTADO ---
  const allStatuses = ['NUEVO', 'CONFIRMADO', 'PREPARANDO', 'ENTREGADO', 'CANCELADO'];
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['NUEVO', 'CONFIRMADO', 'PREPARANDO']);

  useEffect(() => {
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(qOrders, (querySnapshot) => {
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      setIsLoadingOrders(false);
    });

    return () => {
      unsubscribeOrders();
    };
  }, []);

  const handleCreateTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    setTeamMessage({ type: '', text: '' });

    try {
      const mainApp = getApp();
      const firebaseConfig = mainApp.options;

      const secondaryAppName = 'SecondaryApp';
      const secondaryApp = getApps().find(app => app.name === secondaryAppName)
        || initializeApp(firebaseConfig, secondaryAppName);

      const secondaryAuth = getAuth(secondaryApp);

      await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
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

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { orderStatus: newStatus });
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Hubo un error al actualizar el estado.");
    }
  };

  const handleMarkAsPaid = async (orderId: string) => {
    if (!window.confirm('¿Confirmar que este pedido ya fue pagado?')) return;
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { paymentStatus: 'PAGADO' });
    } catch (error) {
      console.error("Error updating payment status:", error);
      alert("Hubo un error al actualizar el pago.");
    }
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const filteredOrders = orders.filter(order =>
    selectedStatuses.includes(order.orderStatus || 'NUEVO')
  );

  return (
    <div className="max-w-5xl mx-auto px-8 py-10 font-sans">

      <h1 className={`text-4xl text-zinc-900 mb-8 ${cormorant.className}`}>panel de control</h1>

      {/* --- QUICK ACCESS BUTTONS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <Link href="/admin/orders" className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
          <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <ClipboardList size={24} />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 text-lg">tablero de cocina</h3>
            <p className="text-zinc-500 text-sm">gestiona los pedidos activos</p>
          </div>
        </Link>

        <Link href="/admin/products" className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Package size={24} />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 text-lg">inventario</h3>
            <p className="text-zinc-500 text-sm">agrega o edita productos</p>
          </div>
        </Link>
      </div>

      <div className="flex gap-4 mb-8 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 pb-4 px-2 border-b-2 transition-all font-medium ${activeTab === 'orders' ? 'border-black text-black' : 'border-transparent text-zinc-400 hover:text-zinc-600' }`}
        >
          <ShoppingBag size={18} /> listado de pedidos
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 pb-4 px-2 border-b-2 transition-all font-medium ${activeTab === 'team' ? 'border-black text-black' : 'border-transparent text-zinc-400 hover:text-zinc-600' }`}
        >
          <Users size={18} /> equipo
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[400px]">
        {activeTab === 'orders' ? (
          <div>
            <h2 className="text-xl font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <ShoppingBag size={20} /> listado
            </h2>

            {/* CONTROLES DE FILTROS MÚLTIPLES */}
            <div className="flex flex-wrap gap-2 mb-6">
              {allStatuses.map(status => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${selectedStatuses.includes(status) ? 'bg-black text-white border-black shadow-sm' : 'bg-white text-zinc-400 border-gray-200 hover:border-zinc-300' }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {isLoadingOrders ? (
              <div className="text-zinc-400 animate-pulse mt-8">cargando pedidos...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-zinc-500 bg-gray-50 p-6 rounded-2xl text-center border border-gray-100 mt-8">
                no hay pedidos en los estados seleccionados.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-zinc-900">{order.customerName}</p>
                        <p className="text-xs text-zinc-500">ID: {order.id.substring(0, 8)}...</p>
                      </div>

                      <div className="text-right flex flex-col items-end gap-2">
                        <p className="font-bold text-zinc-900">${order.totalAmount?.toLocaleString('es-CO')}</p>

                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${order.paymentStatus === 'PAGADO' ? 'bg-green-100 text-green-700' : order.paymentStatus === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700' }`}>
                              {order.paymentStatus}
                            </span>

                            <select
                              value={order.orderStatus || 'NUEVO'}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              className={`text-[10px] font-bold uppercase tracking-wider rounded-md px-2 py-1 outline-none cursor-pointer border ${(order.orderStatus || 'NUEVO') === 'NUEVO' ? 'bg-blue-50 text-blue-700 border-blue-100' : order.orderStatus === 'CONFIRMADO' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : order.orderStatus === 'PREPARANDO' ? 'bg-orange-50 text-orange-700 border-orange-100' : order.orderStatus === 'ENTREGADO' ? 'bg-green-50 text-green-700 border-green-100' : order.orderStatus === 'CANCELADO' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-gray-100 text-gray-700 border-gray-200' }`}
                            >
                              <option value="NUEVO">NUEVO</option>
                              <option value="CONFIRMADO">CONFIRMADO</option>
                              <option value="PREPARANDO">PREPARANDO</option>
                              <option value="ENTREGADO">ENTREGADO</option>
                              <option value="CANCELADO">CANCELADO</option>
                            </select>
                          </div>

                          {order.paymentStatus === 'PENDIENTE' && (
                            <button
                              onClick={() => handleMarkAsPaid(order.id)}
                              className="text-[10px] font-medium text-zinc-400 hover:text-green-600 transition-colors underline"
                            >
                              marcar como pagado
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-zinc-600 bg-gray-50 p-3 rounded-xl mb-3 space-y-1">
                      <p><span className="font-semibold text-zinc-900">tel:</span> {order.customerPhone}</p>
                      <p><span className="font-semibold text-zinc-900">método:</span> {order.deliveryMethod === 'delivery' ? 'domicilio' : 'recoger'}</p>
                      <p><span className="font-semibold text-zinc-900">fecha entrega:</span> {order.deliveryDate}</p>
                      {order.deliveryMethod === 'delivery' && (
                        <p><span className="font-semibold text-zinc-900">dirección:</span> {order.address}, {order.neighborhood}</p>
                      )}
                      {order.notes && (
                        <p><span className="font-semibold text-zinc-900">notas:</span> {order.notes}</p>
                      )}
                    </div>

                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">productos</p>
                      <ul className="text-sm text-zinc-700 space-y-1">
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
        ) : (
          <div className="max-w-md">
            <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
              <Users size={20} /> agregar nuevo empleado
            </h2>

            <form onSubmit={handleCreateTeamMember} className="space-y-4">
              {teamMessage.text && (
                <div className={`text-sm p-3 rounded-xl border text-center ${teamMessage.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-500 border-red-100' }`}>
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
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
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
                className="w-full bg-black text-white font-bold py-3 rounded-xl transition-all hover:bg-zinc-800 active:scale-95 mt-2 disabled:opacity-70"
              >
                {isCreatingUser ? 'creando cuenta...' : 'crear acceso'}
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
}
