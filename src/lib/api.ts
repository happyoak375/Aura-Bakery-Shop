/**
 * @fileoverview Motor de Datos, Inventario de 3 Niveles y Transacciones - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Modelo de Inventario 3-Tier:
 *    - 'raw_material': Insumos primarios (café, harina, leche, vasos).
 *    - 'wip': Pre-producciones intermedias (masas base, rellenos).
 *    - 'finished_good': Productos para la venta final al consumidor.
 * 2. Transacciones Atómicas (ACID):
 *    - `processPOSOrder`: Descuento inteligente en ventas de caja o web (insumos BOM para bebidas, stock físico para pasteles).
 *    - `recordProductionBatch`: Deducción de materias primas e incremento de stock al hornear lotes.
 * 3. Operaciones CRUD en Firestore:
 *    - Gestión completa de `inventory_items`, lectura de pedidos y configuración de entregas.
 * 4. Generación de Tickets Secuenciales:
 *    - `generateOrderNumber`: Contador incremental atómico en 'config/order_counter'.
 * 5. Helpers de Respaldo Visual:
 *    - `getLocalProductImage`: Enrutamiento a imágenes locales con fallback al logotipo institucional.
 */

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  runTransaction,
  setDoc,
  serverTimestamp,
  writeBatch,
  addDoc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { Product, DeliveryWindow } from "./mockData";

// =========================================================================
// 1. INTERFACES Y DEFINICIONES DE TIPOS
// =========================================================================

export interface DeliveryConfig {
  closedDaysOfWeek: number[]; 
  blackoutDates: string[];    
  cutoffTime: number;
  deliveryWindows: string[];
}

export const DEFAULT_DELIVERY_TIME_SLOTS = [
  "Mañana (8:00 AM - 12:00 PM)",
  "Tarde (1:00 PM - 5:00 PM)",
];

export type InventoryType = 'raw_material' | 'wip' | 'finished_good';

export interface BillOfMaterials {
  inventoryItemId: string; 
  quantity: number; 
}

export interface InventoryItem {
  id?: string;
  name: string;
  type: InventoryType;
  unit: string; 
  currentStock: number;
  minStockLevel: number; 
  costPerUnit: number;
  category?: string; 
  bom?: BillOfMaterials[];
  salesChannels?: ('pos' | 'web' | 'rappi')[];
  imageUrl?: string;
  description?: string;
  variants?: any[];
  preferences?: any[];
}

export interface POSOrder {
  orderId?: string;
  orderNumber: number;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    name?: string;
  }>;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  status: 'completed' | 'refunded' | 'pending';
  source: 'pos' | 'web';
  createdAt: any;
  customerName?: string;
  customerPhone?: string;
  deliveryMethod?: 'delivery' | 'pickup';
  address?: string | null;
  neighborhood?: string | null;
  deliveryDate?: string;
  notes?: string;
  subTotal?: number;
  deliveryFee?: number;
  orderStatus?: string;
}

// =========================================================================
// 2. CONSULTAS DE INVENTARIO
// =========================================================================

/**
 * Obtiene todos los artículos de inventario organizados por tipo y orden alfabético.
 */
export const fetchInventoryItems = async (): Promise<InventoryItem[]> => {
  try {
    const inventoryRef = collection(db, "inventory_items");
    const snapshot = await getDocs(inventoryRef);
    
    const items: InventoryItem[] = [];
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<InventoryItem, 'id'>;
      items.push({ 
        id: docSnap.id, 
        ...data 
      });
    });
    
    return items.sort((a, b) => {
      const typeComparison = a.type.localeCompare(b.type);
      if (typeComparison !== 0) return typeComparison;
      return a.name.localeCompare(b.name);
    });
    
  } catch (error) {
    console.error("Error al obtener inventario completo:", error);
    return []; 
  }
};

/**
 * Obtiene artículos de inventario filtrados por su nivel en la cadena (Tier).
 */
export const fetchInventoryByType = async (type: InventoryType): Promise<InventoryItem[]> => {
  try {
    const inventoryRef = collection(db, "inventory_items");
    const q = query(inventoryRef, where("type", "==", type));
    
    const snapshot = await getDocs(q);
    const items: InventoryItem[] = [];
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<InventoryItem, 'id'>;
      items.push({ id: docSnap.id, ...data });
    });
    
    return items.sort((a, b) => a.name.localeCompare(b.name));
    
  } catch (error) {
    console.error(`Error al filtrar inventario por tipo ${type}:`, error);
    return [];
  }
};

// =========================================================================
// 3. TRANSACCIONES OPERATIVAS (POS & PRODUCCIÓN)
// =========================================================================

/**
 * Procesa ventas omnicanal (POS o Web) con deducción inteligente de stock.
 * Las bebidas descuentan ingredientes mediante receta BOM; la pastelería descuenta de su stock final.
 */
export const processPOSOrder = async (orderData: Omit<POSOrder, 'orderId' | 'orderNumber' | 'createdAt'>) => {
  try {
    const orderNumber = await generateOrderNumber();
    const orderId = `POS-${orderNumber}`;

    await runTransaction(db, async (transaction) => {
      const itemRefs = orderData.items.map(item => doc(db, "inventory_items", item.productId));
      const itemSnapshots = await Promise.all(itemRefs.map(ref => transaction.get(ref)));

      const rawMaterialReads: { ref: any, qtyNeeded: number }[] = [];
      const batchUpdates: { ref: any, newStock: number }[] = [];

      itemSnapshots.forEach((snap, index) => {
        if (!snap.exists()) {
          throw new Error(`El producto no existe en el inventario actual. Por favor actualiza tu pedido.`);
        }
        
        const productData = snap.data() as InventoryItem;
        const quantityOrdered = orderData.items[index].quantity;
        const isMadeToOrder = productData.category === 'Café' || productData.category === 'Bebidas';

        if (isMadeToOrder) {
          const bom = productData.bom || [];
          bom.forEach((ingredient) => {
            rawMaterialReads.push({
              ref: doc(db, "inventory_items", ingredient.inventoryItemId),
              qtyNeeded: ingredient.quantity * quantityOrdered
            });
          });
        } else {
          if (productData.currentStock < quantityOrdered) {
            throw new Error(`Stock insuficiente para ${productData.name}.`);
          }
          batchUpdates.push({
            ref: snap.ref,
            newStock: productData.currentStock - quantityOrdered
          });
        }
      });

      // Lectura y acumulación de materias primas
      const rawSnaps = await Promise.all(rawMaterialReads.map(rm => transaction.get(rm.ref)));
      const rawMaterialUpdates = new Map<string, number>();

      rawSnaps.forEach((snap, index) => {
        const rawData = snap.data() as InventoryItem;
        const currentRawStock = rawMaterialUpdates.has(snap.id) ? rawMaterialUpdates.get(snap.id)! : rawData.currentStock;
        const needed = rawMaterialReads[index].qtyNeeded;
        rawMaterialUpdates.set(snap.id, currentRawStock - needed);
      });

      // Escrituras en la base de datos
      batchUpdates.forEach(update => transaction.update(update.ref, { currentStock: update.newStock }));
      rawMaterialUpdates.forEach((newStock, id) => transaction.update(doc(db, "inventory_items", id), { currentStock: newStock }));

      // Registro del documento final de orden
      const orderRef = doc(db, "orders", orderId);
      transaction.set(orderRef, {
        ...orderData,
        orderId,
        orderNumber,
        createdAt: serverTimestamp(),
      });
    });

    return { success: true, orderId };
  } catch (error) {
    console.error("Fallo en la transacción de orden:", error);
    throw error; 
  }
};

/**
 * Registra un lote de producción horneado por la cocina.
 * Deduce insumos según la receta BOM y añade las unidades elaboradas a existencias.
 */
export const recordProductionBatch = async (finishedGoodId: string, quantityProduced: number) => {
  try {
    await runTransaction(db, async (transaction) => {
      const finishedGoodRef = doc(db, "inventory_items", finishedGoodId);
      const finishedGoodSnap = await transaction.get(finishedGoodRef);

      if (!finishedGoodSnap.exists()) {
        throw new Error("El producto terminado no existe en el inventario.");
      }

      const finishedGoodData = finishedGoodSnap.data() as InventoryItem;
      const bom = finishedGoodData.bom || [];

      const ingredientRefs = bom.map(item => doc(db, "inventory_items", item.inventoryItemId));
      const ingredientSnaps = await Promise.all(ingredientRefs.map(ref => transaction.get(ref)));

      const newIngredientStock = new Map<string, number>();
      
      bom.forEach((bomItem, index) => {
        const snap = ingredientSnaps[index];
        if (!snap.exists()) {
          throw new Error(`El insumo ${bomItem.inventoryItemId} no está registrado en la base de datos.`);
        }

        const ingredientData = snap.data() as InventoryItem;
        const totalAmountNeeded = bomItem.quantity * quantityProduced;

        if (ingredientData.currentStock < totalAmountNeeded) {
          throw new Error(`Insumos insuficientes de ${ingredientData.name} para producir este lote.`);
        }

        newIngredientStock.set(snap.id, ingredientData.currentStock - totalAmountNeeded);
      });

      // Actualización de materias primas y registro de movimientos
      ingredientSnaps.forEach(snap => {
        const newStock = newIngredientStock.get(snap.id);
        transaction.update(snap.ref, { currentStock: newStock });
        
        const movementRef = doc(collection(db, "inventory_movements"));
        transaction.set(movementRef, {
          inventoryItemId: snap.id,
          change: -(bom.find(b => b.inventoryItemId === snap.id)?.quantity || 0) * quantityProduced,
          type: 'production_consumption',
          referenceId: `BATCH-${Date.now()}`,
          timestamp: serverTimestamp(),
          notes: `Consumido para la producción de ${finishedGoodData.name}`
        });
      });

      // Incremento de producto elaborado
      transaction.update(finishedGoodRef, {
        currentStock: finishedGoodData.currentStock + quantityProduced
      });

      const batchMovementRef = doc(collection(db, "inventory_movements"));
      transaction.set(batchMovementRef, {
        inventoryItemId: finishedGoodId,
        change: quantityProduced,
        type: 'production_yield',
        referenceId: `BATCH-${Date.now()}`,
        timestamp: serverTimestamp(),
        notes: `Lote de cocina producido`
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error al registrar lote de producción:", error);
    throw error;
  }
};

// =========================================================================
// 4. CRUD DE ADMINISTRACIÓN DE INVENTARIO
// =========================================================================

export const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, "inventory_items"), itemData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error al agregar ítem al inventario:", error);
    throw error;
  }
};

export const updateInventoryItem = async (id: string, itemData: Partial<InventoryItem>) => {
  try {
    const itemRef = doc(db, "inventory_items", id);
    await updateDoc(itemRef, itemData);
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar ítem de inventario:", error);
    throw error;
  }
};

export const deleteInventoryItem = async (id: string) => {
  try {
    const itemRef = doc(db, "inventory_items", id);
    await deleteDoc(itemRef);
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar ítem de inventario:", error);
    throw error;
  }
};

// =========================================================================
// 5. PARÁMETROS OPERATIVOS Y PEDIDOS
// =========================================================================

export const fetchDeliveryConfig = async (): Promise<DeliveryConfig | null> => {
  try {
    const configRef = doc(db, "settings", "delivery");
    const docSnap = await getDoc(configRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as any;
      return {
        closedDaysOfWeek: data.closedDaysOfWeek || [0],
        blackoutDates: data.blackoutDates || [],
        cutoffTime: data.cutoffTime ?? 17,
        deliveryWindows: data.deliveryWindows || ["Mañana (8:00 AM - 12:00 PM)", "Tarde (1:00 PM - 5:00 PM)"]
      } as DeliveryConfig;
    } else {
      return {
        closedDaysOfWeek: [0],
        blackoutDates: [],
        cutoffTime: 17,
        deliveryWindows: ["Mañana (8:00 AM - 12:00 PM)", "Tarde (1:00 PM - 5:00 PM)"]
      };
    }
  } catch (error) {
    console.error("Error al obtener configuración de entrega:", error);
    return null;
  }
};

/**
 * Generador atómico de números secuenciales para tickets de orden.
 */
export const generateOrderNumber = async (): Promise<number> => {
  const counterRef = doc(db, "config", "order_counter");
  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    if (!counterDoc.exists()) {
      transaction.set(counterRef, { lastNumber: 1000 });
      return 1001;
    }
    const data = counterDoc.data() as any;
    const newNumber = data.lastNumber + 1;
    transaction.update(counterRef, { lastNumber: newNumber });
    return newNumber;
  });
};

export const createOrder = async (orderData: any) => {
  try {
    const orderNumber = await generateOrderNumber();
    const orderId = `ORD-${orderNumber}`;
    await setDoc(doc(db, "orders", orderId), {
      ...orderData,
      orderNumber,
      createdAt: serverTimestamp(),
      status: 'pending'
    });
    return { success: true, orderId };
  } catch (error) {
    console.error("Error al crear la orden:", error);
    throw error;
  }
};

// =========================================================================
// 6. ADAPTADORES PARA LA TIENDA WEB
// =========================================================================

/**
 * Obtiene los productos del menú autorizados para el canal 'web'.
 */
export const fetchProducts = async (): Promise<any[]> => {
  try {
    const inventoryRef = collection(db, "inventory_items");
    const q = query(inventoryRef, where("type", "==", "finished_good"));
    const snapshot = await getDocs(q);
    
    const products: any[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const channels = data.salesChannels || [];

      // Muestra en la web únicamente productos con el canal habilitado
      if (channels.length > 0 && !channels.includes('web')) {
        return;
      }

      products.push({
        id: docSnap.id,
        name: data.name,
        description: data.description || data.category || "Delicioso producto de Aura",
        category: data.category || "Otros",
        basePrice: data.costPerUnit,
        isActive: true,
        imageUrl: data.imageUrl || getLocalProductImage(data.name)
      });
    });
    return products;
  } catch (error) {
    console.error("Error al cargar productos de la tienda web:", error);
    return [];
  }
};

export const fetchFeaturedProducts = async (): Promise<any[]> => {
  try {
    const allProducts = await fetchProducts();
    return allProducts.slice(0, 4);
  } catch (error) {
    console.error("Error al obtener productos destacados:", error);
    return [];
  }
};

export const fetchProductById = async (productId: string): Promise<any | null> => {
  try {
    const productRef = doc(db, "inventory_items", productId);
    const docSnap = await getDoc(productRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        description: data.description || data.category || "",
        category: data.category || "Otros",
        basePrice: data.costPerUnit,
        isActive: true,
        variants: data.variants || [],
        preferences: data.preferences || [],
        imageUrl: data.imageUrl || getLocalProductImage(data.name)
      };
    }
    return null;
  } catch (error) {
    console.error("Error al buscar producto por ID:", error);
    return null;
  }
};

export const fetchActiveWindows = async (): Promise<DeliveryWindow[]> => {
  try {
    const windowsRef = collection(db, "deliveryWindows");
    const snapshot = await getDocs(windowsRef);
    const windows: DeliveryWindow[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      if (data.isActive) {
        windows.push({ ...data, id: docSnap.id });
      }
    });
    return windows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error("Error al obtener ventanas de entrega:", error);
    return [];
  }
};

export const fetchGlobalConfig = async () => {
  try {
    const configRef = doc(db, "config", "global_settings");
    const docSnap = await getDoc(configRef);
    if (docSnap.exists()) return docSnap.data();
    return null;
  } catch (error) {
    console.error("Error al obtener configuración global:", error);
    return null;
  }
};

// =========================================================================
// 7. RESOLUCIÓN DE IMÁGENES LOCALES
// =========================================================================

/**
 * Resuelve la ruta estática de imagen correspondiente según el nombre del ítem.
 */
export const getLocalProductImage = (name: string): string => {
  if (!name) return '/images/logo-aura.png'; 
  
  const lowerName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (lowerName.includes('pasteis') || lowerName.includes('nata')) return '/products/pasteis-de-nata.jpg';
  if (lowerName.includes('vasca')) return '/products/tarta-vasca.jpg';
  if (lowerName.includes('doble chocolate')) return '/products/cookie-chocolate.jpg';
  if (lowerName.includes('red velvet')) return '/products/cookie-red.jpg';
  if (lowerName.includes('aura') && lowerName.includes('cookie')) return '/products/cookie-aura.jpg';
  if (lowerName.includes('cruller')) return '/products/cruller.jpg';
  if (lowerName.includes('maracuya') || lowerName.includes('passion')) return '/products/entremet-passion.jpg';
  if (lowerName.includes('dark') || lowerName.includes('entremet')) return '/products/entremet-chocolate.jpg';
  if (lowerName.includes('selva')) return '/products/selva-negra.jpg';
  if (lowerName.includes('tiramisu')) return '/products/tiramisu.jpg';
  if (lowerName.includes('brownie')) return '/products/brownie.jpg';
  if (lowerName.includes('torta')) return '/products/selva-negra.jpg';
  
  
  return '/images/logo-aura.png'; 
};