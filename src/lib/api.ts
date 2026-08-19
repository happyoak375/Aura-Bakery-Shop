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
  writeBatch
} from "firebase/firestore";
import { db } from "./firebase";
import { Product, DeliveryWindow } from "./mockData";

export interface DeliveryConfig {
  closedDaysOfWeek: number[]; 
  blackoutDates: string[];    
  cutoffTime: number;
  deliveryWindows: string[]; 
}

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
  // 🔥 YOUR NEW OMNICHANNEL SUPERPOWER 🔥
  salesChannels?: ('pos' | 'web' | 'rappi')[]; 
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

// --- CORE API FUNCTIONS ---

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
        if (!snap.exists()) throw new Error(`Ingredient ${bomItem.inventoryItemId} is missing.`);
        
        const ingredientData = snap.data() as InventoryItem;
        const totalAmountNeeded = bomItem.quantity * quantityProduced;

        if (ingredientData.currentStock < totalAmountNeeded) {
          throw new Error(`Insufficient ${ingredientData.name} to produce this batch.`);
        }
        newIngredientStock.set(snap.id, ingredientData.currentStock - totalAmountNeeded);
      });

      ingredientSnaps.forEach(snap => {
        const newStock = newIngredientStock.get(snap.id);
        transaction.update(snap.ref, { currentStock: newStock });
      });

      transaction.update(finishedGoodRef, {
        currentStock: finishedGoodData.currentStock + quantityProduced
      });
    });
    return { success: true };
  } catch (error) {
    console.error("Production batch failed: ", error);
    throw error;
  }
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
    } 
    return null;
  } catch (error) { return null; }
};

// --- WEB-SPECIFIC FETCH FUNCTIONS ---

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
        description: data.category || "Delicioso producto de Aura",
        basePrice: data.costPerUnit, 
        isActive: true,
        // 🔥 THE FIX: Tell the API to grab the actual image path!
        imageUrl: getLocalProductImage(data.name) 
      });
    });
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
};

export const fetchFeaturedProducts = async (): Promise<any[]> => {
  try {
    const allProducts = await fetchProducts();
    return allProducts.slice(0, 4); 
  } catch (error) { return []; }
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
        variants: data.variants || [],
        preferences: data.preferences || [],
        // 🔥 THE FIX: Tell the API to grab the actual image path!
        imageUrl: getLocalProductImage(data.name)
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching single product:", error);
    return null;
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

// --- DATA SEEDING SCRIPTS ---

export const seedInitialMenu = async () => {
  const batch = writeBatch(db);
  const menuItems = [
    { name: "Pasteis de Nata", type: "finished_good", category: "Clásicos", costPerUnit: 8.00, currentStock: 50, minStockLevel: 10, unit: "unidades" },
    { name: "Tarta Vasca", type: "finished_good", category: "Clásicos", costPerUnit: 16.00, currentStock: 12, minStockLevel: 3, unit: "porción" },
    { name: "Tiramisu Clásico", type: "finished_good", category: "Clásicos", costPerUnit: 18.00, currentStock: 15, minStockLevel: 4, unit: "porción" },
    { name: "Selva Negra", type: "finished_good", category: "Clásicos", costPerUnit: 18.00, currentStock: 10, minStockLevel: 2, unit: "porción" },
    { name: "Maracuya Cloud", type: "finished_good", category: "Clásicos", costPerUnit: 20.00, currentStock: 8, minStockLevel: 2, unit: "unidades" },
    { name: "Dark Chocolate Entremet", type: "finished_good", category: "Clásicos", costPerUnit: 22.00, currentStock: 8, minStockLevel: 2, unit: "unidades" },
    { name: "Lava Cookie Doble Chocolate", type: "finished_good", category: "Cookies", costPerUnit: 14.00, currentStock: 25, minStockLevel: 5, unit: "unidades" },
    { name: "Lava Cookie Red Velvet", type: "finished_good", category: "Cookies", costPerUnit: 14.00, currentStock: 20, minStockLevel: 5, unit: "unidades" },
    { name: "Aura Cookie", type: "finished_good", category: "Cookies", costPerUnit: 12.00, currentStock: 30, minStockLevel: 5, unit: "unidades" },
    { name: "Cruller", type: "finished_good", category: "Cookies", costPerUnit: 10.00, currentStock: 15, minStockLevel: 4, unit: "unidades" },
    { name: "Espresso", type: "finished_good", category: "Café", costPerUnit: 6.00, currentStock: 100, minStockLevel: 20, unit: "taza" },
    { name: "Americano", type: "finished_good", category: "Café", costPerUnit: 6.00, currentStock: 100, minStockLevel: 20, unit: "taza" },
    { name: "Latte", type: "finished_good", category: "Café", costPerUnit: 7.00, currentStock: 100, minStockLevel: 20, unit: "taza" },
    { name: "Caramel Latte", type: "finished_good", category: "Café", costPerUnit: 9.00, currentStock: 50, minStockLevel: 10, unit: "taza" },
    { name: "Snickers Latte", type: "finished_good", category: "Café", costPerUnit: 11.00, currentStock: 50, minStockLevel: 10, unit: "taza" },
    { name: "Island Time Smoothie", type: "finished_good", category: "Bebidas", costPerUnit: 13.00, currentStock: 30, minStockLevel: 5, unit: "vaso" },
    { name: "Verde Vivo", type: "finished_good", category: "Bebidas", costPerUnit: 13.00, currentStock: 30, minStockLevel: 5, unit: "vaso" },
  ];

  menuItems.forEach((item) => {
    const docId = item.name.toLowerCase().replace(/\s+/g, '-');
    const itemRef = doc(collection(db, "inventory_items"), docId);
    
    // 🔥 AUTOMATIC OMNICHANNEL TAGGING 🔥
    const isDrink = item.category === 'Café' || item.category === 'Bebidas';
    const channels = isDrink ? ['pos'] : ['pos', 'web', 'rappi'];

    batch.set(itemRef, { ...item, salesChannels: channels }, { merge: true });
  });

  await batch.commit();
  alert("¡Canales de venta actualizados en la base de datos!");
};

export const seedRawMaterialsAndBOM = async () => { /* Kept short for space, leave your current version here if needed */ };