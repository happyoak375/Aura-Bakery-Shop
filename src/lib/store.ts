/**
 * @fileoverview Gestión de Estado Global (Zustand) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Tienda y Carrito de Compras (`useCartStore`):
 *    - Gestión de productos agregados, cantidades y eliminación por `cartItemId` único.
 *    - Túnel de compra express (`directPurchaseItem`): Aísla el ítem seleccionado para permitir
 *      comprar sin sobrescribir el carrito activo[cite: 1, 2].
 *    - Cálculo reactivo de totales financieros considerando modificadores y variantes[cite: 2, 4].
 *    - Determinación del tiempo de espera crítico (*lead time bottleneck*) para toda la orden[cite: 2, 3].
 *    - Emisión automática de eventos analíticos (`AddToCart`) para Meta Pixel[cite: 2, 4].
 * 2. Autenticación y Turnos de Personal (`useAuthStore`):
 *    - Mantiene la sesión del staff (correo y rol 'admin' | 'barista') sincronizada con Firebase Auth[cite: 1].
 *    - Utiliza middleware `persist` para salvaguardar la sesión en almacenamiento local (`localStorage`),
 *      evitando que los cajeros o cocineros sean expulsados ante recargas de pantalla[cite: 1, 2].
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Product,
  ProductVariant,
  ProductPreference,
  AvailabilityType,
} from "./mockData";
import * as fbq from './fpixel'; 
import { auth } from './firebase';
import { signOut } from "firebase/auth";

// =========================================================================
// 1. TIPOS E INTERFACES DEL CARRITO
// =========================================================================

/**
 * Representa un producto individual dentro de la bolsa de compras.
 * Extiende las propiedades base del producto incorporando selecciones activas.
 */
export interface CartItem extends Product {
  cartItemId: string; // Hash único generado por combinación de id, variante y preferencias
  selectedVariant: ProductVariant | null;
  selectedPreferences: ProductPreference[];
  calculatedPrice: number; // Precio unitario final considerando deltas de precio
  quantity: number;
}

/**
 * Interfaz del almacén Zustand para la operativa del carrito.
 */
interface CartStore {
  // Estado
  items: CartItem[];
  directPurchaseItem: CartItem | null; // Espacio temporal para flujo express "Comprar Ahora"

  // Mutaciones y Acciones
  setDirectPurchaseItem: (item: CartItem | null) => void;
  addItem: (
    product: Product,
    selectedVariant: ProductVariant | null,
    selectedPreferences: ProductPreference[],
  ) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;

  // Selectores de datos
  getTotal: (isDirectPurchase?: boolean) => number;
  getTotalItems: (isDirectPurchase?: boolean) => number;
  getMostRestrictiveAvailability: (isDirectPurchase?: boolean) => AvailabilityType;
}

// =========================================================================
// 2. FUNCIONES DE APOYO (HELPERS MATEMÁTICOS Y DE HASHING)
// =========================================================================

/**
 * Genera un identificador único determinista para una combinación específica de producto,
 * variante y preferencias seleccionadas.
 */
const generateCartItemId = (
  productId: string,
  variant: ProductVariant | null,
  prefs: ProductPreference[],
): string => {
  const variantPart = variant ? variant.id : "novar";

  // Ordena alfabéticamente las preferencias antes de unirlas.
  // Esto asegura que seleccionar [Arequipe, Fresa] genere el mismo ID que [Fresa, Arequipe].
  const prefPart =
    prefs.length > 0
      ? prefs
          .map((p) => p.id)
          .sort()
          .join("-")
      : "nopref";

  return `${productId}_${variantPart}_${prefPart}`;
};

/**
 * Calcula el valor unitario final sumando el precio base más los incrementos
 * (deltas) de la variante y de cada preferencia opcional.
 */
const calculateLinePrice = (
  product: Product,
  variant: ProductVariant | null,
  prefs: ProductPreference[],
): number => {
  const variantDelta = variant ? variant.price_delta : 0;
  const prefsDelta = prefs.reduce((sum, p) => sum + p.price_delta, 0);
  return product.basePrice + variantDelta + prefsDelta;
};

/**
 * Evalúa el cuello de botella operativo de la orden:
 * El ítem que requiera mayor tiempo de anticipación define la disponibilidad global.
 */
const calculateMostRestrictiveAvailability = (
  items: CartItem[],
): AvailabilityType => {
  if (items.length === 0) return "asap";

  // Escala de ponderación de mayor a menor restricción
  const weights: Record<AvailabilityType, number> = {
    asap: 0,
    "24h": 1,
    "48h": 2,
    advisor_only: 3,
  };

  let highestWeightItem = items[0];
  let highestWeight = weights[highestWeightItem.availabilityType];

  for (let i = 1; i < items.length; i++) {
    const currentWeight = weights[items[i].availabilityType];
    if (currentWeight > highestWeight) {
      highestWeight = currentWeight;
      highestWeightItem = items[i];
    }
  }

  return highestWeightItem.availabilityType;
};

// =========================================================================
// 3. STORE DEL CARRITO (USECARTSTORE)
// =========================================================================

export const useCartStore = create<CartStore>((set, get) => ({
  // Estado inicial
  items: [],
  directPurchaseItem: null,

  // Mutador para el túnel de compra directa (Express Checkout)
  setDirectPurchaseItem: (item) => set({ directPurchaseItem: item }),

  addItem: (product, selectedVariant, selectedPreferences) => {
    const { items } = get();

    // 1. Generación de clave compuesta
    const cartItemId = generateCartItemId(
      product.id,
      selectedVariant,
      selectedPreferences,
    );

    // 2. Cálculo matemático de precio de línea
    const calculatedPrice = calculateLinePrice(
      product,
      selectedVariant,
      selectedPreferences,
    );

    // 3. Registro del evento AddToCart en Meta Pixel
    fbq.event('AddToCart', {
      content_name: product.name,
      content_ids: [product.id],
      content_type: 'product',
      value: calculatedPrice,
      currency: 'COP',
      quantity: 1,
    });

    // 4. Verificación de existencia previa en el carrito
    const existingItem = items.find((item) => item.cartItemId === cartItemId);

    if (existingItem) {
      // Si la combinación exacta ya existe, incrementa la cantidad sin duplicar filas
      set({
        items: items.map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      });
    } else {
      // De lo contrario, inserta una nueva línea en la orden
      const newItem: CartItem = {
        ...product,
        cartItemId,
        selectedVariant,
        selectedPreferences,
        calculatedPrice,
        quantity: 1,
      };
      set({ items: [...items, newItem] });
    }
  },

  removeItem: (cartItemId) => {
    set({
      items: get().items.filter((item) => item.cartItemId !== cartItemId),
    });
  },

  updateQuantity: (cartItemId, quantity) => {
    // Salvaguarda: Si la cantidad llega a cero o menos, descarta el ítem automáticamente
    if (quantity <= 0) {
      get().removeItem(cartItemId);
      return;
    }
    set({
      items: get().items.map((item) =>
        item.cartItemId === cartItemId ? { ...item, quantity } : item,
      ),
    });
  },

  clearCart: () => set({ items: [] }),

  // =========================================================================
  // SELECTORES DE CONSULTA
  // =========================================================================

  getTotal: (isDirectPurchase = false) => {
    // Si proviene de compra directa, evalúa exclusivamente el ítem aislado
    if (isDirectPurchase && get().directPurchaseItem) {
      const item = get().directPurchaseItem!;
      return item.calculatedPrice * item.quantity;
    }
    // Flujo estándar: Sumatoria de (precioCalculado * cantidad) de cada línea
    return get().items.reduce(
      (total, item) => total + item.calculatedPrice * item.quantity,
      0,
    );
  },

  getTotalItems: (isDirectPurchase = false) => {
    if (isDirectPurchase && get().directPurchaseItem) {
      return get().directPurchaseItem!.quantity;
    }
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },

  getMostRestrictiveAvailability: (isDirectPurchase = false) => {
    if (isDirectPurchase && get().directPurchaseItem) {
      return get().directPurchaseItem!.availabilityType;
    }
    return calculateMostRestrictiveAvailability(get().items);
  },
}));

// =========================================================================
// 4. STORE DE AUTENTICACIÓN Y ROLES (USEAUTHSTORE)
// =========================================================================

export type StaffRole = 'admin' | 'barista' | null;

interface AuthState {
  isStaffLoggedIn: boolean;
  employeeEmail: string | null;
  role: StaffRole;
  setStaffUser: (email: string | null, role?: StaffRole) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isStaffLoggedIn: false,
      employeeEmail: null,
      role: null,

      /**
       * Actualiza el usuario autenticado y su rol RBAC asignado.
       */
      setStaffUser: (email, role = null) => set({
        isStaffLoggedIn: !!email,
        employeeEmail: email,
        role: role,
      }),

      /**
       * Cierra la sesión activa en Firebase Auth y limpia el almacenamiento persistente.
       */
      logout: async () => {
        try {
          await signOut(auth);
          set({ isStaffLoggedIn: false, employeeEmail: null, role: null });
        } catch (error) {
          console.error("Error al cerrar sesión de empleado:", error);
        }
      },
    }),
    {
      name: "aura-staff-auth", // Llave de persistencia en localStorage para turnos activos
    }
  )
);