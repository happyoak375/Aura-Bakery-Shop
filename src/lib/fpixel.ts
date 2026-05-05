// src/lib/fpixel.ts
export const FB_PIXEL_ID = '1429407425866509';

/**
 * Dispara el evento estándar PageView
 */
export const pageview = () => {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'PageView');
  }
};

/**
 * Dispara eventos estándar o personalizados con parámetros dinámicos
 */
export const event = (name: string, options = {}) => {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', name, options);
  }
};