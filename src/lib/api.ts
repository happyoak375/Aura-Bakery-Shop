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

// --- Delivery Configuration Interface ---
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

// --- POS & Inventory API Functions ---

/**
 * Fetches all inventory items (Raw, WIP, Finished) for the POS/Kitchen dashboard.
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
    console.error("Critical error fetching inventory items:", error);
    return []; 
  }
};

/**
 * Fetches inventory items filtered by their specific tier type.
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
    console.error(`Error fetching inventory for type ${type}:`, error);
    return [];
  }
};

/**
 * Processes a POS sale with Smart Deduction.
 * Pastries deduct from final stock. Drinks deduct from raw materials.
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
          batchUpdates.push({
            ref: snap.ref,
            newStock: productData.currentStock - quantityOrdered
          });
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

      batchUpdates.forEach(update => transaction.update(update.ref, { currentStock: update.newStock }));
      rawMaterialUpdates.forEach((newStock, id) => transaction.update(doc(db, "inventory_items", id), { currentStock: newStock }));

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
    console.error("Transaction failed: ", error);
    throw error; 
  }
};

/**
 * Allows the kitchen to record a batch of finished goods.
 * Deducts from raw materials based on the BOM and adds to finished_goods.
 */
export const recordProductionBatch = async (finishedGoodId: string, quantityProduced: number) => {
  try {
    await runTransaction(db, async (transaction) => {
      const finishedGoodRef = doc(db, "inventory_items", finishedGoodId);
      const finishedGoodSnap = await transaction.get(finishedGoodRef);

      if (!finishedGoodSnap.exists()) {
        throw new Error("Finished good not found in inventory.");
      }

      const finishedGoodData = finishedGoodSnap.data() as InventoryItem;
      const bom = finishedGoodData.bom || [];

      const ingredientRefs = bom.map(item => doc(db, "inventory_items", item.inventoryItemId));
      const ingredientSnaps = await Promise.all(ingredientRefs.map(ref => transaction.get(ref)));

      const newIngredientStock = new Map<string, number>();
      
      bom.forEach((bomItem, index) => {
        const snap = ingredientSnaps[index];
        if (!snap.exists()) {
          throw new Error(`Ingredient ${bomItem.inventoryItemId} is missing from the database.`);
        }

        const ingredientData = snap.data() as InventoryItem;
        const totalAmountNeeded = bomItem.quantity * quantityProduced;

        if (ingredientData.currentStock < totalAmountNeeded) {
          throw new Error(`Insufficient ${ingredientData.name} to produce this batch. Need ${totalAmountNeeded}, only have ${ingredientData.currentStock}.`);
        }

        newIngredientStock.set(snap.id, ingredientData.currentStock - totalAmountNeeded);
      });

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

// --- Admin Inventory CRUD ---
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

// --- Delivery Configuration & Setup ---
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

export const fetchFeaturedProducts = async (): Promise<any[]> => {
  try {
    const allProducts = await fetchProducts();
    return allProducts.slice(0, 4);
  } catch (error) {
    console.error("Error fetching featured products:", error);
    return [];
  }
};

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
    console.error("Error creating order:", error);
    throw error;
  }
};

export const fetchProducts = async (): Promise<any[]> => {
  try {
    const inventoryRef = collection(db, "inventory_items");
    const q = query(inventoryRef, where("type", "==", "finished_good"));
    const snapshot = await getDocs(q);
    
    const products: any[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      products.push({
        id: docSnap.id,
        name: data.name,
        description: data.category || "Delicioso producto de Aura",
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
    console.error("Error fetching windows:", error);
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
    console.error("Error fetching config:", error);
    return null;
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
        description: data.category || "",
        basePrice: data.costPerUnit,
        isActive: true,
        imageUrl: getLocalProductImage(data.name)
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching single product:", error);
    return null;
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

export const getLocalProductImage = (name: string) => {
  if (!name) return '/images/placeholder.png'; 
  
  const lowerName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (lowerName.includes('pasteis') || lowerName.includes('nata')) return '/products/pasteis-de-nata.png';
  if (lowerName.includes('vasca')) return '/products/tarta-vasca.png';
  if (lowerName.includes('latte')) return '/products/latte.png';
  if (lowerName.includes('doble chocolate')) return '/products/cookie-chocolate.png';
  if (lowerName.includes('red velvet')) return '/products/cookie-red.png';
  if (lowerName.includes('aura') && lowerName.includes('cookie')) return '/products/cookie-aura.png';
  if (lowerName.includes('cruller')) return '/products/cruller.png';
  if (lowerName.includes('maracuya') || lowerName.includes('passion')) return '/products/entremet-passion.png';
  if (lowerName.includes('dark') || lowerName.includes('entremet')) return '/products/entremet-chocolate.png';
  if (lowerName.includes('selva')) return '/products/selva-negra.png';
  if (lowerName.includes('tiramisu')) return '/products/tiramisu.png';
  if (lowerName.includes('brownie')) return '/products/brownie.png';
  if (lowerName.includes('smothie') || lowerName.includes('smoothie')) return '/products/smothie.png';
  if (lowerName.includes('cafe') || lowerName.includes('espresso') || lowerName.includes('americano')) return '/products/coffee-drinks.png';
  
  return '/images/placeholder.png'; 
};

export const seedRawMaterialsAndBOM = async () => {
  const batch = writeBatch(db);

  const rawMaterials = [
    { id: "cafe-grano", name: "Café en Grano (House Blend)", type: "raw_material", currentStock: 5000, minStockLevel: 1000, unit: "g", costPerUnit: 0.05 },
    { id: "leche-entera", name: "Leche Entera", type: "raw_material", currentStock: 10000, minStockLevel: 2000, unit: "ml", costPerUnit: 0.003 },
    { id: "harina-trigo", name: "Harina de Trigo", type: "raw_material", currentStock: 20000, minStockLevel: 5000, unit: "g", costPerUnit: 0.002 },
    { id: "mantequilla", name: "Mantequilla", type: "raw_material", currentStock: 5000, minStockLevel: 1000, unit: "g", costPerUnit: 0.015 },
    { id: "vaso-12oz", name: "Vaso de Cartón 12oz", type: "raw_material", currentStock: 500, minStockLevel: 100, unit: "unidades", costPerUnit: 0.20 },
  ];

  rawMaterials.forEach((item) => {
    const { id, ...data } = item;
    const ref = doc(db, "inventory_items", id);
    batch.set(ref, data);
  });

  const latteRef = doc(db, "inventory_items", "latte");
  batch.update(latteRef, {
    bom: [
      { inventoryItemId: "cafe-grano", quantity: 18 },
      { inventoryItemId: "leche-entera", quantity: 200 },
      { inventoryItemId: "vaso-12oz", quantity: 1 }
    ]
  });

  const americanoRef = doc(db, "inventory_items", "americano");
  batch.update(americanoRef, {
    bom: [
      { inventoryItemId: "cafe-grano", quantity: 36 },
      { inventoryItemId: "vaso-12oz", quantity: 1 }
    ]
  });

  const pasteisRef = doc(db, "inventory_items", "pasteis-de-nata");
  batch.update(pasteisRef, {
    bom: [
      { inventoryItemId: "harina-trigo", quantity: 25 },
      { inventoryItemId: "mantequilla", quantity: 15 }
    ]
  });

  await batch.commit();
  console.log("Raw Materials and Recipes seeded successfully!");
};