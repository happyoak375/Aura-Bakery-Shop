/**
 * @fileoverview Utilidad Centralizadora de Eventos de Meta Pixel (Facebook Pixel) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Abstracción Global del SDK de Meta:
 *    - Centraliza todas las llamadas a la función global `window.fbq` del cliente.
 *    - Previene errores en tiempo de compilación y ejecución verificando la existencia del objeto `window`.
 * 2. Mapeo del Embudo de Comercio Electrónico (E-commerce Funnel):
 *    - PageView: Medición de tráfico general y navegación por rutas (activado en FacebookPixel.tsx).
 *    - ViewContent: Visualización de fichas de producto y selección dinámica de variantes/precios.
 *    - AddToCart: Captura de intención de compra al agregar productos a la bolsa desde el Store.
 *    - InitiateCheckout: Activación al ingresar al formulario de entrega y medios de pago.
 *    - Purchase: Confirmación de orden y conversión definitiva con valor liquidado en COP.
 */

/**
 * Extensión de la interfaz Window para tipar la función global de Meta Pixel en TypeScript.
 */
declare global {
  interface Window {
    fbq?: (
      action: "track" | "trackCustom" | "init",
      eventName: string,
      params?: Record<string, any>
    ) => void;
  }
}

/**
 * Identificador principal del conjunto de datos de Meta Pixel registrado para Aura Bakery.
 * Utiliza fallback a variable de entorno si se encuentra configurada en .env.local.
 */
export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || '1429407425866509';

/**
 * Dispara el evento estándar 'PageView'.
 * Utilizado primordialmente en transiciones de ruta o recargas completas de la aplicación.
 */
export const pageview = (): void => {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq('track', 'PageView');
  }
};

/**
 * Dispara eventos estándar o personalizados con parámetros dinámicos (monto, moneda, IDs de producto).
 * 
 * @param name Nombre oficial del evento de Meta (ej. 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase')
 * @param options Parámetros complementarios del evento (value, currency, content_name, content_ids, etc.)
 */
export const event = (name: string, options: Record<string, any> = {}): void => {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq('track', name, options);
  }
};