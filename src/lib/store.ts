/**
 * @fileoverview Global State Management (Zustand)
 * Manages the shopping cart, direct purchase flows (Buy Now), and dynamic
 * calculations for pricing and delivery availability.
 */

import { create } from "zustand";
import {
  Product,
  ProductVariant,
  ProductPreference,
  AvailabilityType,
} from "./mockData";

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

/**
 * Represents an item as it exists inside the shopping cart.
 * Extends the base Product model with specific user selections and calculated totals.
 */
export interface CartItem extends Product {
  /** * Unique hash generated from prodId + selectedVariantId + preferenceIds.
   * WHY WE NEED THIS: If a user adds "Pasteis (Arequipe)" and "Pasteis (Bocadillo)",
   * they share the same Product ID but must appear as separate line items in the cart.
   */
  cartItemId: string;
  selectedVariant: ProductVariant | null;
  selectedPreferences: ProductPreference[];
  /** The final price for one unit of this specific combination */
  calculatedPrice: number;
  quantity: number;
}

/**
 * The Zustand Store interface defining all state variables and actions.
 */
interface CartStore {
  // --- State ---
  items: CartItem[];
  /** * Stores a single item temporarily when the user clicks "Buy Now" (Compra Directa).
   * This bypasses the main cart so their existing cart items aren't overwritten.
   */
  directPurchaseItem: CartItem | null;

  // --- Actions ---
  setDirectPurchaseItem: (item: CartItem | null) => void;
  addItem: (
    product: Product,
    selectedVariant: ProductVariant | null,
    selectedPreferences: ProductPreference[],
  ) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;

  // --- Selectors ---
  getTotal: (isDirectPurchase?: boolean) => number;
  getTotalItems: (isDirectPurchase?: boolean) => number;
  getMostRestrictiveAvailability: (
    isDirectPurchase?: boolean,
  ) => AvailabilityType;
}

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================

/**
 * Generates a unique identifier for a specific product + variant + preference combination.
 */
const generateCartItemId = (
  productId: string,
  variant: ProductVariant | null,
  prefs: ProductPreference[],
): string => {
  const variantPart = variant ? variant.id : "novar";

  // We sort the preferences before joining to guarantee that selecting
  // [Arequipe, Fresa] generates the exact same hash as [Fresa, Arequipe].
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
 * Calculates the exact price of a product by adding the base price to any variant/preference deltas.
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
 * Determines the longest lead time required for an entire order.
 * If a cart has an "asap" cookie and a "48h" entremet, the whole order becomes "48h".
 */
const calculateMostRestrictiveAvailability = (
  items: CartItem[],
): AvailabilityType => {
  if (items.length === 0) return "asap";

  // Assign numeric weights to easily compare restrictiveness
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

// ==========================================
// 3. STORE IMPLEMENTATION
// ==========================================

export const useCartStore = create<CartStore>((set, get) => ({
  // --- Initial State ---
  items: [],
  directPurchaseItem: null,

  // --- State Mutators ---
  setDirectPurchaseItem: (item) => set({ directPurchaseItem: item }),

  addItem: (product, selectedVariant, selectedPreferences) => {
    const { items } = get();

    // 1. Generate unique ID for this specific combination
    const cartItemId = generateCartItemId(
      product.id,
      selectedVariant,
      selectedPreferences,
    );

    // 2. Calculate the correct unit price
    const calculatedPrice = calculateLinePrice(
      product,
      selectedVariant,
      selectedPreferences,
    );

    // 3. Check if this exact combination is already in the cart
    const existingItem = items.find((item) => item.cartItemId === cartItemId);

    if (existingItem) {
      // If it exists, just bump the quantity to prevent duplicate rows in the UI
      set({
        items: items.map((item) =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      });
    } else {
      // Otherwise, create a brand new line item
      const newItem: CartItem = {
        ...product, // Inherit base product data (name, image, etc.)
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
    // Failsafe: If a user clicks minus down to 0, completely remove the item.
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

  // --- Selectors (Data Retrieval) ---

  getTotal: (isDirectPurchase = false) => {
    // If user is in the "Buy Now" flow, calculate the total based ONLY on that one item.
    if (isDirectPurchase && get().directPurchaseItem) {
      const item = get().directPurchaseItem!;
      return item.calculatedPrice * item.quantity;
    }
    // Standard cart flow: Sum up (price * quantity) for every item.
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
