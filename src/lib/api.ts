import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase"; 
import { Product, DeliveryWindow } from "./mockData";

// 1. Fetch the Catalog (Solo los activos para la tienda pública)
export const fetchProducts = async (): Promise<Product[]> => {
  try {
    const productsRef = collection(db, "products");
    const snapshot = await getDocs(productsRef);
    
    const products: Product[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as Product;
      if (data.isActive) {
        products.push({ ...data, id: doc.id }); 
      }
    });
    
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
};

// 2. Fetch the Delivery Windows
export const fetchActiveWindows = async (): Promise<DeliveryWindow[]> => {
  try {
    const windowsRef = collection(db, "deliveryWindows");
    const snapshot = await getDocs(windowsRef);
    
    const windows: DeliveryWindow[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as DeliveryWindow;
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

// 3. Fetch the Global Configuration
export const fetchGlobalConfig = async () => {
  try {
    const configRef = doc(db, "config", "global_settings");
    const docSnap = await getDoc(configRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.warn("Global config document not found!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching config:", error);
    return null;
  }
};

// 4. Fetch a Single Product by ID
export const fetchProductById = async (productId: string): Promise<Product | null> => {
  try {
    const productRef = doc(db, "products", productId);
    const docSnap = await getDoc(productRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as Product;
      // We only want to show it if it's currently active
      if (data.isActive) {
        return { ...data, id: docSnap.id };
      } else {
        return null; // Product exists but is hidden/out of stock
      }
    } else {
      console.warn(`Product with ID ${productId} not found!`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching single product:", error);
    return null;
  }
};

// 5. Fetch ALL Products (para el Administrador - ignora si están activos o no)
export const fetchAllProductsAdmin = async (): Promise<Product[]> => {
  try {
    const productsRef = collection(db, "products");
    const snapshot = await getDocs(productsRef);
    
    const products: Product[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as Product;
      products.push({ ...data, id: doc.id }); 
    });
    
    return products;
  } catch (error) {
    console.error("Error fetching all products:", error);
    return [];
  }
};