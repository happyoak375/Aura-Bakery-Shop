import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
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

// --- Configuration Interfaces ---
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

// --- 3-Tier Inventory Interfaces ---
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

// --- Image Helper ---
export const getLocalProductImage = (name: string) => {
  // 1. Use your logo as the ultimate fallback
  if (!name) return '/images/logo-aura.png'; 
  
  const lowerName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // 2. Exact matches for your .jpg files
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
  
  // 3. If a file is missing (like latte or smoothie), fallback to the logo
  return '/images/logo-aura.png'; 
};

// ==========================================
// 1. INVENTORY API
// ==========================================

export const fetchInventoryItems = async (): Promise<InventoryItem[]> => {
  try {
    const inventoryRef = collection(db, "inventory_items");
    const snapshot = await getDocs(inventoryRef);
    const items: InventoryItem[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as Omit<InventoryItem, 'id'>;
      items.push({ id: doc.id, ...data });
    });
    return items.sort((a, b) => {
      const typeComparison = a.type.localeCompare(b.type);
      if (typeComparison !== 0) return typeComparison;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("Critical error fetching inventory items:", error);
    return []; 
  }
};

export const fetchInventoryByType = async (type: InventoryType): Promise<InventoryItem[]> => {
  try {
    const inventoryRef = collection(db, "inventory_items");
    const q = query(inventoryRef, where("type", "==", type));
    const snapshot = await getDocs(q);
    const items: InventoryItem[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as Omit<InventoryItem, 'id'>;
      items.push({ id: doc.id, ...data });
    });
    return items.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error(`Error fetching inventory for type ${type}:`, error);
    return [];
  }
};

// ==========================================
// 2. POS & KITCHEN TRANSACTIONS
// ==========================================

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
          throw new Error(`El producto no existe en el inventario actual. Por favor, vacía tu carrito y vuelve a agregarlo.`);
        }
        
        const productData = snap.data() as InventoryItem;
        const quantityOrdered = orderData.items[index].quantity;
        const isMadeToOrder = productData.category === 'Café' || productData.category === 'Bebidas';

        if (isMadeToOrder) {
          const bom = productData.bom || [];
          bom.forEach((ingredient: any) => {
            rawMaterialReads.push({
              ref: doc(db, "inventory_items", ingredient.inventoryItemId),
              qtyNeeded: ingredient.quantity * quantityOrdered
            });
          });
        } else {
          if (productData.currentStock < quantityOrdered) {
            throw new Error(`Stock insuficiente para ${productData.name}.`);
          }
          batchUpdates.push({ ref: snap.ref, newStock: productData.currentStock - quantityOrdered });
        }
      });

      const rawSnaps = await Promise.all(rawMaterialReads.map(rm => transaction.get(rm.ref)));
      const rawMaterialUpdates = new Map<string, number>();

      rawSnaps.forEach((snap, index) => {
        const rawData = snap.data() as InventoryItem;
        const currentRawStock = rawMaterialUpdates.has(snap.id) ? rawMaterialUpdates.get(snap.id)! : rawData.currentStock;
        const needed = rawMaterialReads[index].qtyNeeded;
        rawMaterialUpdates.set(snap.id, currentRawStock - needed);
      });

      // Write updates
      batchUpdates.forEach(update => transaction.update(update.ref, { currentStock: update.newStock }));
      rawMaterialUpdates.forEach((newStock, id) => transaction.update(doc(db, "inventory_items", id), { currentStock: newStock }));

      // Write actual order
      const orderRef = doc(db, "orders", orderId);
      transaction.set(orderRef, {
        ...orderData,
        orderId,
        orderNumber,
        createdAt: serverTimestamp()
      });
    });

    console.log(`Successfully processed order ${orderId}`);
    return { success: true, orderId };
  } catch (error) {
    console.error("Order processing failed: ", error);
    throw error;
  }
};

export const recordProductionBatch = async (finishedGoodId: string, quantityProduced: number) => {
  try {
    await runTransaction(db, async (transaction) => {
      const finishedGoodRef = doc(db, "inventory_items", finishedGoodId);
      const finishedGoodSnap = await transaction.get(finishedGoodRef);

      if (!finishedGoodSnap.exists()) throw new Error("Finished good not found in inventory.");
      
      const finishedGoodData = finishedGoodSnap.data() as InventoryItem;
      const bom = finishedGoodData.bom || [];
      const ingredientRefs = bom.map(item => doc(db, "inventory_items", item.inventoryItemId));
      const ingredientSnaps = await Promise.all(ingredientRefs.map(ref => transaction.get(ref)));
      const newIngredientStock = new Map<string, number>();
      
      bom.forEach((bomItem, index) => {
        const snap = ingredientSnaps[index];
        if (!snap.exists()) throw new Error(`Ingredient ${bomItem.inventoryItemId} is missing from the database.`);
        
        const ingredientData = snap.data() as InventoryItem;
        const totalAmountNeeded = bomItem.quantity * quantityProduced;
        
        if (ingredientData.currentStock < totalAmountNeeded) {
          throw new Error(`Insufficient ${ingredientData.name} to produce this batch.`);
        }
        newIngredientStock.set(snap.id, ingredientData.currentStock - totalAmountNeeded);
      });

      // Deduct ingredients & log
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
          notes: `Consumed for production of ${finishedGoodData.name}`
        });
      });

      // Add Finished Goods & log
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
        notes: `Kitchen Batch Produced`
      });
    });

    console.log(`Successfully recorded production of ${quantityProduced} units of ${finishedGoodId}`);
    return { success: true };

  } catch (error) {
    console.error("Production batch failed: ", error);
    throw error;
  }
};

// ==========================================
// 3. UTILITIES & CONFIG
// ==========================================

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
    console.error("Error fetching delivery config:", error);
    return null;
  }
};

export const fetchActiveWindows = async (): Promise<DeliveryWindow[]> => {
  try {
    const windowsRef = collection(db, "deliveryWindows");
    const snapshot = await getDocs(windowsRef);
    const windows: DeliveryWindow[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as any;
      if (data.isActive) {
        windows.push({ ...data, id: doc.id });
      }
    });
    return windows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error("Error fetching windows:", error);
    return [];
  }
};

export const fetchGlobalConfig = async () => {
  try {
    const configRef = doc(db, "config", "global_settings");
    const docSnap = await getDoc(configRef);
    if (docSnap.exists()) return docSnap.data() as any;
    return null;
  } catch (error) {
    console.error("Error fetching config:", error);
    return null;
  }
};

// ==========================================
// 4. WEB STOREFRONT COMPATIBILITY LAYER
// ==========================================

export const fetchProducts = async (): Promise<any[]> => {
  try {
    const inventoryRef = collection(db, "inventory_items");
    const q = query(inventoryRef, where("type", "==", "finished_good"));
    const snapshot = await getDocs(q);
    
    const products: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const channels = data.salesChannels || [];

      // Only show on the web if the 'web' flag exists!
      if (!channels.includes('web')) {
        return; 
      }

      products.push({ 
        id: doc.id, 
        name: data.name,
        description: data.description || "Delicioso producto de Aura",
        category: data.category || "Otros", // <-- RESTORED CATEGORY FIELD
        basePrice: data.costPerUnit, 
        isActive: true,
        imageUrl: getLocalProductImage(data.name) 
      });
    });
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
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
        description: data.description || "",
        category: data.category || "Otros", // <-- RESTORED CATEGORY FIELD
        basePrice: data.costPerUnit,
        isActive: true,
        variants: data.variants || [],
        preferences: data.preferences || [],
        imageUrl: getLocalProductImage(data.name)
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching single product:", error);
    return null;
  }
};

// export const fetchProductById = async (productId: string): Promise<any | null> => {
//   try {
//     const productRef = doc(db, "inventory_items", productId);
//     const docSnap = await getDoc(productRef);
    
//     if (docSnap.exists()) {
//       const data = docSnap.data() as any;
//       return {
//         id: docSnap.id,
//         name: data.name,
//         description: data.category || "",
//         basePrice: data.costPerUnit,
//         isActive: true
//       };
//     }
//     return null;
//   } catch (error) {
//     console.error("Error fetching single product:", error);
//     return null;
//   }
// };

export const fetchFeaturedProducts = async (): Promise<any[]> => {
  try {
    const allProducts = await fetchProducts();
    return allProducts.slice(0, 4);
  } catch (error) {
    console.error("Error fetching featured products:", error);
    return [];
  }
};

export const fetchAllProductsAdmin = async (): Promise<any[]> => {
    return fetchProducts();
};

export const seedInitialMenu = async () => {
  const batch = writeBatch(db);
  const menuItems = [
    { name: "Pasteis de Nata", type: "finished_good", category: "Clásicos", costPerUnit: 8.00, currentStock: 50, minStockLevel: 10, unit: "unidades" },
    { name: "Tarta Vasca", type: "finished_good", category: "Clásicos", costPerUnit: 16.00, currentStock: 12, minStockLevel: 3, unit: "porción" },
    { name: "Espresso", type: "finished_good", category: "Café", costPerUnit: 6.00, currentStock: 100, minStockLevel: 20, unit: "taza" }
  ];

  menuItems.forEach((item) => {
    const docId = item.name.toLowerCase().replace(/\s+/g, '-');
    const itemRef = doc(collection(db, "inventory_items"), docId);
    batch.set(itemRef, item);
  });

  await batch.commit();
  console.log("Database seeded successfully!");
};

// ==========================================
// 5. ADMIN INVENTORY CRUD
// ==========================================

export const addInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, "inventory_items"), itemData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding item:", error);
    throw error;
  }
};

export const updateInventoryItem = async (id: string, itemData: Partial<InventoryItem>) => {
  try {
    const itemRef = doc(db, "inventory_items", id);
    await updateDoc(itemRef, itemData);
    return { success: true };
  } catch (error) {
    console.error("Error updating item:", error);
    throw error;
  }
};

export const deleteInventoryItem = async (id: string) => {
  try {
    const itemRef = doc(db, "inventory_items", id);
    await deleteDoc(itemRef);
    return { success: true };
  } catch (error) {
    console.error("Error deleting item:", error);
    throw error;
  }
};