/**
 * @fileoverview Motor de Cálculo de Fechas y Disponibilidad de Entrega - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Detección del Producto Más Restrictivo (Lead Time Bottleneck):
 *    - Si un producto requiere asesor ('advisor_only'), todo el pedido pasa a gestión manual.
 *    - Si coexisten productos 'asap' (para hoy) y '48h', el pedido completo se programa a 48h.
 * 2. Aplicación de Hora de Corte (Cutoff Time):
 *    - Si el pedido se realiza después de la hora límite (ej. 17:00 / 5:00 PM), se traslada 
 *      automáticamente el punto de partida al día siguiente a las 8:00 AM.
 * 3. Filtrado de Días No Laborales y Festivos:
 *    - Omite días regulares de cierre semanal (ej. domingos) configurados en 'closedDaysOfWeek'.
 *    - Omite fechas festivas o de cierre excepcional configuradas en 'blackoutDates'.
 * 4. Generación Dinámica de Fechas Válidas:
 *    - Proyecta una lista de días hábiles consecutivos formateados en español (Colombia).
 */

import { DeliveryConfig } from './api';
import { AvailabilityType } from './mockData';

/**
 * Representa una fecha hábil calculada para entrega o recogida.
 */
export interface AvailableDeliveryDate {
  dateString: string; // Formato ISO simplificado 'YYYY-MM-DD'
  display: string;    // Formato legible en español (ej. 'viernes, 28 mar')
}

/**
 * Resultado estructurado del cálculo de fechas disponibles.
 */
export interface DeliveryCalculationResult {
  requiresAdvisor: boolean;
  dates: AvailableDeliveryDate[];
}

/**
 * Calcula las fechas hábiles de entrega considerando lead times, cortes de horario y cierres.
 * 
 * @param cartItems Lista de productos en la orden con su tipo de disponibilidad
 * @param config Configuración operativa leída desde Firestore ('settings/delivery')
 * @param daysToGenerate Cantidad de fechas hábiles a proyectar (por defecto 5)
 * @returns Objeto con bandera de asesor requerido y lista de fechas seleccionables
 */
export function getAvailableDeliveryDates(
  cartItems: { availabilityType?: AvailabilityType }[],
  config: DeliveryConfig,
  daysToGenerate: number = 5
): DeliveryCalculationResult {
  let maxLeadTimeHours = 0;
  let requiresAdvisor = false;

  // =========================================================================
  // 1. EVALUACIÓN DEL ÍTEM MÁS RESTRICTIVO (LEAD TIME)
  // =========================================================================
  for (const item of cartItems) {
    if (item.availabilityType === 'advisor_only') requiresAdvisor = true;
    if (item.availabilityType === '48h' && maxLeadTimeHours < 48) maxLeadTimeHours = 48;
    if (item.availabilityType === '24h' && maxLeadTimeHours < 24) maxLeadTimeHours = 24;
  }

  // Si requiere atención de un asesor comercial (ej. tortas temáticas), no calcula fechas automáticas
  if (requiresAdvisor) {
    return { requiresAdvisor: true, dates: [] };
  }

  const now = new Date();

  // =========================================================================
  // 2. CONTROL DE HORA DE CORTE OPERACIONAL (CUTOFF TIME)
  // =========================================================================
  // Fallback seguro a las 17:00 (5:00 PM) en caso de ausencia en la base de datos
  const cutoff = config.cutoffTime ?? 17;

  // Si el cliente pide pasada la hora de corte, el primer turno de horneado arranca mañana
  if (now.getHours() >= cutoff) {
    now.setDate(now.getDate() + 1);
    now.setHours(8, 0, 0, 0);
  }

  // Desplaza el cursor temporal sumando las horas de anticipación necesarias
  let targetDate = new Date(now.getTime() + maxLeadTimeHours * 60 * 60 * 1000);
  const validDates: AvailableDeliveryDate[] = [];

  // =========================================================================
  // 3. PROYECCIÓN DE DÍAS HÁBILES Y SALVAGUARDAS DEFENSIVAS
  // =========================================================================
  const closedDays = config.closedDaysOfWeek || [0]; // Por defecto 0 (Domingo cerrado)
  const holidays = config.blackoutDates || [];

  let attempts = 0;

  // Busca fechas válidas incrementando día a día; tope de 30 iteraciones de seguridad
  while (validDates.length < daysToGenerate && attempts < 30) {
    attempts++;

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    const dayOfWeek = targetDate.getDay();

    // Verificación de reglas de cierre
    const isClosedDay = closedDays.includes(dayOfWeek);
    const isHoliday = holidays.includes(formattedDate);

    // Si el día está operativo, se incluye en las opciones disponibles
    if (!isClosedDay && !isHoliday) {
      validDates.push({
        dateString: formattedDate,
        display: targetDate.toLocaleDateString('es-CO', {
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        })
      });
    }

    // Avanza al siguiente día calendario para la siguiente comprobación
    targetDate.setDate(targetDate.getDate() + 1);
  }

  return { requiresAdvisor: false, dates: validDates };
}