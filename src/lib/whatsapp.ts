/**
 * @fileoverview Utilidad de Integración con Meta WhatsApp Cloud API - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Envío Automatizado de Mensajería Transaccional:
 *    - Despacha notificaciones oficiales mediante plantillas pre-aprobadas de WhatsApp Business.
 * 2. Recibos de Compra para Clientes (`sendWhatsAppConfirmation`):
 *    - Activa la plantilla 'order_confirmation' enviando el número de orden generado al cliente.
 * 3. Alertas Operativas para Administración (`sendAdminNotification`):
 *    - Activa la plantilla 'admin_payment_alert' notificando en tiempo real al teléfono del negocio
 *      el nombre del cliente, el total recaudado formateado en COP y el ID del pedido.
 * 4. Normalización Telefónica:
 *    - Sanea los números de teléfono eliminando espacios, signos o guiones antes de la petición.
 */

// Variables de entorno requeridas para la comunicación con Meta Graph API
const token = process.env.WHATSAPP_API_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

/**
 * Estructuras de tipado para los componentes de plantilla de Meta Graph API
 */
interface WhatsAppTextParameter {
  type: "text";
  text: string | number;
}

interface WhatsAppBodyComponent {
  type: "body";
  parameters: WhatsAppTextParameter[];
}

interface WhatsAppTemplateMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: { code: string };
    components: WhatsAppBodyComponent[];
  };
}

/**
 * Da formato estándar de moneda colombiana (COP) a los montos numéricos.
 * 
 * @param amount Monto total en pesos
 * @returns Cadena formateada (ej. 45.000)
 */
const formatCOP = (amount: number): string => {
  return new Intl.NumberFormat('es-CO').format(amount);
};

/**
 * Envía la confirmación oficial del pedido al número de WhatsApp del cliente.
 * 
 * @param phone Número telefónico del comprador (con código de país)
 * @param orderId Identificador único del pedido en Firestore (ej. 'ORD-1002' o 'POS-1002')
 */
export async function sendWhatsAppConfirmation(phone: string, orderId: string) {
  if (!token || !phoneNumberId) {
    console.warn("WhatsApp API: Credenciales no configuradas en variables de entorno.");
    return null;
  }

  // Limpieza de caracteres no numéricos (espacios, guiones, símbolos)
  const cleanPhone = phone.replace(/\D/g, "");

  const payload: WhatsAppTemplateMessage = {
    messaging_product: "whatsapp",
    to: cleanPhone,
    type: "template",
    template: {
      name: "order_confirmation",
      language: { code: "es" },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: orderId }],
        },
      ],
    },
  };

  return await callMetaAPI(payload);
}

/**
 * Envía una alerta inmediata al administrador cuando un pago ha sido confirmado.
 * 
 * @param phone Teléfono de administración destinatario
 * @param orderId Identificador de la orden procesada
 * @param customerName Nombre del comprador
 * @param totalAmount Monto total liquidado
 */
export async function sendAdminNotification(
  phone: string,
  orderId: string,
  customerName: string, 
  totalAmount: number
) {
  if (!token || !phoneNumberId) {
    console.warn("WhatsApp API: Credenciales no configuradas en variables de entorno.");
    return null;
  }

  const cleanPhone = phone.replace(/\D/g, "");
  const formattedPrice = formatCOP(totalAmount);

  const payload: WhatsAppTemplateMessage = {
    messaging_product: "whatsapp",
    to: cleanPhone,
    type: "template",
    template: {
      name: "admin_payment_alert",
      language: { code: "es" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: customerName }, 
            { type: "text", text: formattedPrice },
            { type: "text", text: orderId },
          ],
        },
      ],
    },
  };

  return await callMetaAPI(payload);
}

/**
 * Cliente HTTP para realizar la petición POST hacia el endpoint oficial de Meta Graph API.
 * 
 * @param payload Objeto configurado con el estándar de Meta Messages API
 */
async function callMetaAPI(payload: WhatsAppTemplateMessage) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Error devuelto por Meta Graph API:", JSON.stringify(data, null, 2));
      return null;
    }

    return data;
  } catch (error) {
    console.error("❌ Error de red al comunicarse con WhatsApp Cloud API:", error);
    return null;
  }
}