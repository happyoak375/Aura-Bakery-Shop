import { DeliveryConfig } from './api';
import { AvailabilityType } from './mockData';

export function getAvailableDeliveryDates(
  cartItems: { availabilityType?: AvailabilityType }[],
  config: DeliveryConfig,
  daysToGenerate: number = 5
) {
  let maxLeadTimeHours = 0;
  let requiresAdvisor = false;

  for (const item of cartItems) {
    if (item.availabilityType === 'advisor_only') requiresAdvisor = true;
    if (item.availabilityType === '48h' && maxLeadTimeHours < 48) maxLeadTimeHours = 48;
    if (item.availabilityType === '24h' && maxLeadTimeHours < 24) maxLeadTimeHours = 24;
  }

  if (requiresAdvisor) return { requiresAdvisor: true, dates: [] };

  const now = new Date();

  // Safely fallback to 17 (5 PM) if cutoffTime is undefined
  const cutoff = config.cutoffTime ?? 17;

  if (now.getHours() >= cutoff) {
    now.setDate(now.getDate() + 1);
    now.setHours(8, 0, 0, 0);
  }

  let targetDate = new Date(now.getTime() + maxLeadTimeHours * 60 * 60 * 1000);
  const validDates: { dateString: string, display: string }[] = [];

  let attempts = 0;

  // DEFENSIVE FALLBACKS: If the DB is missing the arrays, use empty ones
  const closedDays = config.closedDaysOfWeek || [0];
  const holidays = config.blackoutDates || [];

  while (validDates.length < daysToGenerate && attempts < 30) {
    attempts++;

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    const dayOfWeek = targetDate.getDay();

    // Using our safe fallback arrays here
    const isClosedDay = closedDays.includes(dayOfWeek);
    const isHoliday = holidays.includes(formattedDate);

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

    targetDate.setDate(targetDate.getDate() + 1);
  }

  return { requiresAdvisor: false, dates: validDates };
}