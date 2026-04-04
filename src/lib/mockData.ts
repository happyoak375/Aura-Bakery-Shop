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
      "Hojaldre crujiente relleno con una crema suave de vainilla y caramelo tostado.",
    basePrice: 8000,
    imageUrl: "/products/pasteis-de-nata.png",
    isActive: true,
    category: "Clásicos del Mundo",
    availabilityType: "asap",
    variants: [
      { id: "v_1", name: "1 Unidad", price_delta: 0 },
      { id: "v_2", name: "2 Unidades", price_delta: 7000 }, // Total: 15000
      { id: "v_6", name: "6 Unidades", price_delta: 40000 }, // Total: 48000
      { id: "v_box", name: "Caja Mini Pasteis (20 unds)", price_delta: 72000 }, // Total: 80000
    ],
    preferences: [
      { id: "p_boca", name: "Sabor: Bocadillo", price_delta: 0 },
      { id: "p_areq", name: "Sabor: Arequipe", price_delta: 0 },
      { id: "p_rojos", name: "Sabor: Frutos Rojos", price_delta: 0 },
      { id: "p_ama", name: "Sabor: Frutos Amarillos", price_delta: 0 },
    ],
    delivery_allowed: true,
    pickup_allowed: true,
  },
  {
    id: "prod_selva",
    name: "Selva Negra",
    description:
      "Bizcocho de chocolate, crema y notas de cereza. Un clásico reinterpretado.",
    basePrice: 14000,
    imageUrl: "/products/selva-negra.png",
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
    description: "Capas de café, crema mascarpone suave y cacao intenso.",
    basePrice: 16000,
    imageUrl: "/products/tiramisu.png",
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
      "Cheesecake horneado, caracterizado por ser cremoso por dentro y caramelizado por fuera.",
    basePrice: 16000,
    imageUrl: "/products/tarta-vasca.png",
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
      "Una mousse ligera de maracuyá estructurada con capas y una base crocante.",
    basePrice: 20000,
    imageUrl: "/products/entremet-passion.png",
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
    name: "Dark Chocolate",
    description:
      "Postre de chocolate intenso, de textura cremosa y un acabado tipo espejo.",
    basePrice: 22000,
    imageUrl: "/products/entremet-chocolate.png",
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
    name: "Lava Cookie: Doble Chocolate",
    description:
      "Galleta con trozos de chocolate que esconde un centro de chocolate fundido.",
    basePrice: 14000,
    imageUrl: "/products/cookie-chocolate.png",
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
    name: "Lava Cookie: Red Velvet",
    description:
      "Galleta con el característico estilo red velvet y un centro de chocolate blanco fundido.",
    basePrice: 14000,
    imageUrl: "/products/cookie-red.png",
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
    description: "Un brownie húmedo que resalta por sus notas de pistacho.",
    basePrice: 18000,
    imageUrl: "/products/brownie.png",
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
    description:
      "Una dona elaborada con masa de churro y cubierta con un glaseado delicado.",
    basePrice: 12000,
    imageUrl: "/products/cruller.png",
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
    description: 'Galleta artesanal que varía como "del día".',
    basePrice: 5000,
    imageUrl: "/products/cookie-aura.png",
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
    label: "9:00 a.m. – 12:00 p.m.",
    date: "2026-03-28",
    is_asap_compatible: true,
  },
  {
    id: "win_2",
    label: "12:00 p.m. – 3:00 p.m.",
    date: "2026-03-28",
    is_asap_compatible: true,
  },
  {
    id: "win_3",
    label: "3:00 p.m. – 6:00 p.m.",
    date: "2026-03-28",
    is_asap_compatible: true,
  },
];
