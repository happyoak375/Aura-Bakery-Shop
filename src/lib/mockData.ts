/**
 * @fileoverview Catalog Data Models & Mock Database
 * Defines the core TypeScript interfaces for the bakery's products and exports
 * the static mock data used for the MVP. In a future iteration, the `mockProducts`
 * and `MOCK_GLOBAL_CONFIG` can be migrated directly to Firestore.
 */

// ==========================================
// 1. TYPE DEFINITIONS
// ==========================================

/**
 * Defines the lead time required to prepare and deliver a product.
 * Used by the checkout system to filter available delivery windows.
 */
export type AvailabilityType = "asap" | "24h" | "48h" | "advisor_only";

/**
 * Represents a physical variation of a product (e.g., Size, Quantity).
 * Impacts the final price of the item.
 */
export interface ProductVariant {
  id: string;
  name: string;
  /** * The amount to add or subtract from the Product's basePrice.
   * WHY WE USE DELTA: Using a delta instead of an absolute price allows the bakery
   * to increase the base price of a product without having to manually recalculate
   * and update the price of every single variant in the database.
   */
  price_delta: number;
}

/**
 * Represents a customer choice that usually doesn't affect price (e.g., Flavor, Color).
 */
export interface ProductPreference {
  id: string;
  name: string;
  /** Usually 0 for MVP, but kept as a number to allow premium flavors in the future */
  price_delta: number;
}

/**
 * The core Product model representing an item in the bakery catalog.
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  /** The starting price for the smallest/default version of the product */
  basePrice: number;
  imageUrl: string;
  /** Acts as a kill-switch to temporarily hide products that are out of stock */
  isActive: boolean;
  category: string;
  availabilityType: AvailabilityType;
  variants: ProductVariant[];
  preferences: ProductPreference[];
  delivery_allowed: boolean;
  pickup_allowed: boolean;
}

/**
 * Represents an available delivery time slot for the customer to choose.
 */
export interface DeliveryWindow {
  id: string;
  label: string;
  date: string;
  /** If false, products requiring 24h/48h notice cannot be assigned to this window */
  is_asap_compatible: boolean;
}

// ==========================================
// 2. GLOBAL CONFIGURATION
// ==========================================

/**
 * Store settings and operational parameters.
 * Kept here for the MVP to allow easy adjustments without digging through UI components.
 */
export const MOCK_GLOBAL_CONFIG = {
  same_day_cutoff_time: "12:00", // Orders placed after this time push 'asap' items to the next day
  flat_delivery_fee: 8900,
  whatsapp_number: "3173285832",
  areaMetropolitanaDropdown: [
    "Medellín",
    "Envigado",
    "Itagüí",
    "Sabaneta",
    "La Estrella",
    "Caldas",
    "Bello",
    "Copacabana",
    "Girardota",
    "Barbosa",
  ],
};

// ==========================================
// 3. MOCK DATABASE (PRODUCTS)
// ==========================================

export const mockProducts: Product[] = [
  // --- CLÁSICOS DEL MUNDO ---
  {
    id: "prod_pasteis",
    name: "Pasteis de Nata",
    description:
      "Clásico de Portugal, Hojaldre crujiente con crema de vainilla y caramelo tostado.",
    basePrice: 8000,
    imageUrl: "/products/pasteis-de-nata.jpg",
    isActive: true,
    category: "Clásicos del Mundo",
    availabilityType: "asap",
    variants: [
      { id: "v_1", name: "1 Unidad", price_delta: 0 },
      { id: "v_2", name: "2 Unidades", price_delta: 7000 },
      { id: "v_6", name: "6 Unidades", price_delta: 40000 },
      { id: "v_box", name: "Caja Mini Pasteis (20 unds)", price_delta: 72000 },
    ],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },
  {
    id: "prod_selva",
    name: "Selva Negra",
    description:
      "Bizcocho de chocolate con capas de crema y cerezas, decorado con virutas de chocolate.",
    basePrice: 14000,
    imageUrl: "/products/selva-negra.jpg",
    isActive: true,
    category: "Clásicos del Mundo",
    availabilityType: "24h",
    variants: [
      { id: "v_porc", name: "Porción", price_delta: 0 },
      { id: "v_comp", name: "Completo", price_delta: 166000 }, // Total: 180000
    ],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },
  {
    id: "prod_tiramisu",
    name: "Tiramisú Clásico",
    description: "Tiramisu Clásico con capas de café, mascarpone y cacao.",
    basePrice: 16000,
    imageUrl: "/products/tiramisu.jpg",
    isActive: true,
    category: "Clásicos del Mundo",
    availabilityType: "24h",
    variants: [
      { id: "v_porc", name: "Porción", price_delta: 0 },
      { id: "v_comp", name: "Completa", price_delta: 164000 }, // Total: 180000
    ],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },
  {
    id: "prod_vasca",
    name: "Tarta Vasca",
    description:
      "Tarta vasca personal cremosa con exterior caramelizado. Ideal para los amantes del dulce consciente.",
    basePrice: 16000,
    imageUrl: "/products/tarta-vasca.jpg",
    isActive: true,
    category: "Clásicos del Mundo",
    availabilityType: "24h",
    variants: [
      { id: "v_porc", name: "Porción", price_delta: 0 },
      { id: "v_peq", name: "Tarta Pequeña", price_delta: 44000 }, // Total: 60000
      { id: "v_gra", name: "Tarta Grande", price_delta: 104000 }, // Total: 120000
    ],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },

  // --- ENTREMETS ---
  {
    id: "prod_mara_cloud",
    name: "Maracuyá Cloud",
    description:
      "Entremet individual por capas, con mousse de maracuyá, centro frutal y base de bizcocho.",
    basePrice: 20000,
    imageUrl: "/products/entremet-passion.jpg",
    isActive: true,
    category: "Entremets",
    availabilityType: "48h",
    variants: [],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },
  {
    id: "prod_dark_choc",
    name: "Entremet Dark Mocca",
    description:
      "Entremet Individual por capas con bizcocho y mousse de chocolate y café con relleno cremoso.",
    basePrice: 22000,
    imageUrl: "/products/entremet-chocolate.jpg",
    isActive: true,
    category: "Entremets",
    availabilityType: "48h",
    variants: [],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },

  // --- LAVA COOKIES ---
  {
    id: "prod_cook_choc",
    name: "Lava Cookie Doble Chocolate",
    description:
      "Galleta de doble chocolate con chispas y centro de chocolate fundido.",
    basePrice: 14000,
    imageUrl: "/products/cookie-chocolate.jpg",
    isActive: true,
    category: "Lava Cookies",
    availabilityType: "asap",
    variants: [],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },
  {
    id: "prod_cook_red",
    name: "Lava Cookie Red Velvet",
    description: "Galleta red velvet con centro de chocolate blanco fundido.",
    basePrice: 14000,
    imageUrl: "/products/cookie-red.jpg",
    isActive: true,
    category: "Lava Cookies",
    availabilityType: "asap",
    variants: [],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },

  // --- AURA SIGNATURE ---
  {
    id: "prod_brownie",
    name: "Pistachio Brownie",
    description: "Brownie húmedo con crema y trozos de pistacho",
    basePrice: 18000,
    imageUrl: "/products/brownie.jpg",
    isActive: true,
    category: "Aura Signature",
    availabilityType: "asap",
    variants: [],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },
  {
    id: "prod_cruller",
    name: "Cruller",
    description: "Cruller: dona de masa de profiterol (churro) con glaseado.",
    basePrice: 12000,
    imageUrl: "/products/cruller.jpg",
    isActive: true,
    category: "Aura Signature",
    availabilityType: "asap",
    variants: [],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },
  {
    id: "prod_cook_aura",
    name: "Galleta Aura",
    description:
      "Galleta Aura con trozos de chocolate, artesanal y fresca del día.",
    basePrice: 5000,
    imageUrl: "/products/cookie-aura.jpg",
    isActive: true,
    category: "Aura Signature",
    availabilityType: "asap",
    variants: [],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },
];

// ==========================================
// 4. MOCK DATABASE (WINDOWS)
// ==========================================

export const mockWindows: DeliveryWindow[] = [
  {
    id: "win_1",
    label: "12:00 p.m. – 3:00 p.m.",
    date: "2026-03-28",
    is_asap_compatible: true,
  },
  {
    id: "win_2",
    label: "3:00 p.m. – 6:00 p.m.",
    date: "2026-03-28",
    is_asap_compatible: true,
  },
  {
    id: "win_3",
    label: "9:00 a.m. – 12:00 p.m.",
    date: "2026-03-28",
    is_asap_compatible: true,
  },
];
