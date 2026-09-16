/**
 * @fileoverview Modelos de Datos del Catálogo y Base de Datos Estática (mockData) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Definición de Tipos Nucleares:
 *    - `Product`: Estructura principal del catálogo comercial consumida por el escaparate web.
 *    - `AvailabilityType`: Categorización del tiempo de preparación requerido ('asap', '24h', '48h', 'advisor_only').
 *    - `ProductVariant` y `ProductPreference`: Modificadores de tamaño, porción o sabor con deltas de precio.
 * 2. Arquitectura de Precios Relativos (Price Delta):
 *    - Cada opción modifica el precio base con un diferencial (`price_delta`), permitiendo ajustes
 *      inflacionarios o promocionales al `basePrice` sin recalcular combinaciones individuales.
 * 3. Conjunto de Datos Semilla (Mock Dataset):
 *    - Productos artesanales clasificados por categorías ('Clásicos del Mundo', 'Entremets', 'Lava Cookies', 'Aura Signature').
 *    - Parámetros globales y ventanas horarias de referencia.
 */

// =========================================================================
// 1. DEFINICIÓN DE TIPOS E INTERFACES
// =========================================================================

/**
 * Define el tiempo de preparación y anticipación necesario para elaborar y despachar un ítem:
 * - 'asap': Elaboración y despacho inmediato en el mismo día (sujeto a hora de corte).
 * - '24h': Requiere 1 día de anticipación mínima.
 * - '48h': Requiere 2 días de anticipación mínima (repostería compleja o por capas).
 * - 'advisor_only': Producto personalizado que requiere atención directa por WhatsApp.
 */
export type AvailabilityType = "asap" | "24h" | "48h" | "advisor_only";

/**
 * Representa una variación física del producto (tamaño, peso o cantidad de unidades).
 */
export interface ProductVariant {
  id: string;
  name: string;
  /**
   * Valor diferencial (+/-) a sumar sobre el `basePrice` del producto.
   * Evita redefinir precios absolutos si el producto base cambia de valor.
   */
  price_delta: number;
}

/**
 * Elección personalizada del cliente (sabores, rellenos, adiciones).
 */
export interface ProductPreference {
  id: string;
  name: string;
  /** Valor incremental por ingredientes premium o modificaciones opcionales */
  price_delta: number;
}

/**
 * Modelo principal de un producto comercial en la vitrina web.
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  /** Precio inicial de la presentación estándar o más pequeña */
  basePrice: number;
  imageUrl: string;
  /** Interruptor lógico para deshabilitar o pausar la venta del producto */
  isActive: boolean;
  category: string;
  availabilityType: AvailabilityType;
  variants: ProductVariant[];
  preferences: ProductPreference[];
  delivery_allowed: boolean;
  pickup_allowed: boolean;
}

/**
 * Franja horaria para asignación logística de órdenes.
 */
export interface DeliveryWindow {
  id: string;
  label: string;
  date: string;
  /** Indica si la ventana acepta pedidos del mismo día */
  is_asap_compatible: boolean;
  /** Permite cerrar temporalmente franjas copadas o no disponibles */
  isActive: boolean;
}

// =========================================================================
// 2. CONFIGURACIÓN GLOBAL DE REFERENCIA
// =========================================================================

export const MOCK_GLOBAL_CONFIG = {
  same_day_cutoff_time: "12:00",
  flat_delivery_fee: 10000,
  whatsapp_number: "573173285832",
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

// =========================================================================
// 3. CATÁLOGO DE PRODUCTOS DE REFERENCIA
// =========================================================================

export const mockProducts: Product[] = [
  // --- CLÁSICOS DEL MUNDO ---
  {
    id: "prod_pasteis",
    name: "Pasteis de Nata",
    description: "Clásico de Portugal, hojaldre crujiente con crema de vainilla y caramelo tostado.",
    basePrice: 8000,
    imageUrl: "/products/pasteis-de-nata.jpg",
    isActive: true,
    category: "Clásicos del Mundo",
    availabilityType: "24h",
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
    description: "Bizcocho de chocolate con capas de crema y cerezas, decorado con virutas de chocolate.",
    basePrice: 14000,
    imageUrl: "/products/selva-negra.jpg",
    isActive: true,
    category: "Clásicos del Mundo",
    availabilityType: "24h",
    variants: [
      { id: "v_porc", name: "Porción", price_delta: 0 },
      { id: "v_comp", name: "Completo", price_delta: 166000 },
    ],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },
  {
    id: "prod_tiramisu",
    name: "Tiramisú Clásico",
    description: "Tiramisú clásico con capas de café, mascarpone y cacao.",
    basePrice: 16000,
    imageUrl: "/products/tiramisu.jpg",
    isActive: true,
    category: "Clásicos del Mundo",
    availabilityType: "24h",
    variants: [
      { id: "v_porc", name: "Porción", price_delta: 0 },
      { id: "v_comp", name: "Completa", price_delta: 164000 },
    ],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },
  {
    id: "prod_vasca",
    name: "Tarta Vasca",
    description: "Tarta vasca personal cremosa con exterior caramelizado. Ideal para los amantes del dulce consciente.",
    basePrice: 16000,
    imageUrl: "/products/tarta-vasca.jpg",
    isActive: true,
    category: "Clásicos del Mundo",
    availabilityType: "24h",
    variants: [
      { id: "v_porc", name: "Porción", price_delta: 0 },
      { id: "v_peq", name: "Tarta Pequeña", price_delta: 44000 },
      { id: "v_gra", name: "Tarta Grande", price_delta: 104000 },
    ],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },

  // --- ENTREMETS ---
  {
    id: "prod_mara_cloud",
    name: "Maracuyá Cloud",
    description: "Entremet individual por capas, con mousse de maracuyá, centro frutal y base de bizcocho.",
    basePrice: 20000,
    imageUrl: "/products/entremet-passion.jpg",
    isActive: true,
    category: "Entremets",
    availabilityType: "24h",
    variants: [],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },
  {
    id: "prod_dark_choc",
    name: "Entremet Dark Mocca",
    description: "Entremet individual por capas con bizcocho y mousse de chocolate y café con relleno cremoso.",
    basePrice: 22000,
    imageUrl: "/products/entremet-chocolate.jpg",
    isActive: true,
    category: "Entremets",
    availabilityType: "24h",
    variants: [],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },

  // --- LAVA COOKIES ---
  {
    id: "prod_cook_choc",
    name: "Lava Cookie Doble Chocolate",
    description: "Galleta de doble chocolate con chispas y centro de chocolate fundido.",
    basePrice: 14000,
    imageUrl: "/products/cookie-chocolate.jpg",
    isActive: true,
    category: "Lava Cookies",
    availabilityType: "24h",
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
    availabilityType: "24h",
    variants: [],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },

  // --- AURA SIGNATURE ---
  {
    id: "prod_brownie",
    name: "Pistachio Brownie",
    description: "Brownie húmedo con crema y trozos de pistacho.",
    basePrice: 18000,
    imageUrl: "/products/brownie.jpg",
    isActive: true,
    category: "Aura Signature",
    availabilityType: "24h",
    variants: [],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },
  {
    id: "prod_cruller",
    name: "Cruller",
    description: "Cruller: dona artesanal de masa de profiterol con glaseado fino.",
    basePrice: 12000,
    imageUrl: "/products/cruller.jpg",
    isActive: true,
    category: "Aura Signature",
    availabilityType: "24h",
    variants: [],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },
  {
    id: "prod_cook_aura",
    name: "Galleta Aura",
    description: "Galleta artesanal con trozos de chocolate, horneada fresca del día.",
    basePrice: 5000,
    imageUrl: "/products/cookie-aura.jpg",
    isActive: true,
    category: "Aura Signature",
    availabilityType: "24h",
    variants: [],
    preferences: [],
    delivery_allowed: true,
    pickup_allowed: true,
  },
];

// =========================================================================
// 4. FRANJAS HORARIAS DE ENTREGA DE REFERENCIA
// =========================================================================

export const mockWindows: DeliveryWindow[] = [
  {
    id: "win_1",
    label: "12:00 p.m. – 3:00 p.m.",
    date: "2026-03-28",
    is_asap_compatible: true,
    isActive: true,
  },
  {
    id: "win_2",
    label: "3:00 p.m. – 6:00 p.m.",
    date: "2026-03-28",
    is_asap_compatible: true,
    isActive: true,
  },
  {
    id: "win_3",
    label: "9:00 a.m. – 12:00 p.m.",
    date: "2026-03-28",
    is_asap_compatible: true,
    isActive: true,
  },
];