import { create } from 'zustand';
import { Product, ProductVariant, ProductPreference, AvailabilityType } from './mockData';

// --- TYPES ---

export interface CartItem extends Product {
  cartItemId: string; // Unique hash: prodId + selectedVariantId + preferenceIds
  selectedVariant: ProductVariant | null;
  selectedPreferences: ProductPreference[];
  calculatedPrice: number; // basePrice + variant_delta + sum(pref_delta)
  quantity: number;
}

interface CartStore {
  // Main Cart State
  items: CartItem[];
  
  // Direct Purchase State (Sec. 8: Camino 1 compra directa)
  directPurchaseItem: CartItem | null; 
  setDirectPurchaseItem: (item: CartItem | null) => void;

  // Actions
  addItem: (product: Product, selectedVariant: ProductVariant | null, selectedPreferences: ProductPreference[]) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;

  // Selectors/Helpers
  getTotal: (isDirectPurchase?: boolean) => number;
  getTotalItems: (isDirectPurchase?: boolean) => number;
  // Sec 6: Get most restrictive availability type (asap < 24h < 48h)
  getMostRestrictiveAvailability: (isDirectPurchase?: boolean) => AvailabilityType;
}

// --- HELPER FUNCTIONS ---

// Unique ID based on choices
const generateCartItemId = (productId: string, variant: ProductVariant | null, prefs: ProductPreference[]): string => {
  const variantPart = variant ? variant.id : 'novar';
  // Sort prefs to ensure ID consistency
  const prefPart = prefs.length > 0 ? prefs.map(p => p.id).sort().join('-') : 'nopref';
  return `${productId}_${variantPart}_${prefPart}`;
};

// Calculate final line-item price
const calculateLinePrice = (product: Product, variant: ProductVariant | null, prefs: ProductPreference[]): number => {
  const variantDelta = variant ? variant.price_delta : 0;
  const prefsDelta = prefs.reduce((sum, p) => sum + p.price_delta, 0);
  return product.basePrice + variantDelta + prefsDelta;
};

// Sec 6 logic: Mixed order restriction calculation
const calculateMostRestrictiveAvailability = (items: CartItem[]): AvailabilityType => {
  if (items.length === 0) return 'asap';
  
  // Weights: higher means more restrictive
  const weights: Record<AvailabilityType, number> = {
    'asap': 0,
    '24h': 1,
    '48h': 2,
    'advisor_only': 3
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

// --- STORE IMPLEMENTATION ---

export const useCartStore = create<CartStore>((set, get) => ({
  // State initialization
  items: [],
  directPurchaseItem: null,

  // Direct purchase state action
  setDirectPurchaseItem: (item) => set({ directPurchaseItem: item }),

  // ADD ITEM Action (Updated to handle variants/preferences)
  addItem: (product, selectedVariant, selectedPreferences) => {
    const { items } = get();
    
    // 1. Generate unique ID for this specific combination
    const cartItemId = generateCartItemId(product.id, selectedVariant, selectedPreferences);
    
    // 2. Calculate the correct price for this combination
    const calculatedPrice = calculateLinePrice(product, selectedVariant, selectedPreferences);

    const existingItem = items.find((item) => item.cartItemId === cartItemId);

    if (existingItem) {
      // If same combination exists, just increase quantity
      set({
        items: items.map((item) =>
          item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
        ),
      });
    } else {
      // Create new unique CartItem
      const newItem: CartItem = {
        ...product, // Inherits basic product data
        cartItemId,
        selectedVariant,
        selectedPreferences,
        calculatedPrice, // Important for checkout
        quantity: 1,
      };
      set({ items: [...items, newItem] });
    }
  },

  // Use unique cartItemId for removal/updates
  removeItem: (cartItemId) => {
    set({ items: get().items.filter((item) => item.cartItemId !== cartItemId) });
  },

  updateQuantity: (cartItemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(cartItemId);
      return;
    }
    set({
      items: get().items.map((item) =>
        item.cartItemId === cartItemId ? { ...item, quantity } : item
      ),
    });
  },

  clearCart: () => set({ items: [] }),

  // Dynamic Total Calculation
  getTotal: (isDirectPurchase = false) => {
    // Section 8: Direct purchase flow doesn't use the main cart items
    if (isDirectPurchase && get().directPurchaseItem) {
        const item = get().directPurchaseItem!;
        return item.calculatedPrice * item.quantity;
    }
    // Main cart flow
    return get().items.reduce((total, item) => total + (item.calculatedPrice * item.quantity), 0);
  },

  getTotalItems: (isDirectPurchase = false) => {
    if (isDirectPurchase && get().directPurchaseItem) {
        return get().directPurchaseItem!.quantity;
    }
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },

  // Sec 6 Mixed Orders Selector
  getMostRestrictiveAvailability: (isDirectPurchase = false) => {
    if (isDirectPurchase && get().directPurchaseItem) {
        return get().directPurchaseItem!.availabilityType;
    }
    return calculateMostRestrictiveAvailability(get().items);
  },
}));