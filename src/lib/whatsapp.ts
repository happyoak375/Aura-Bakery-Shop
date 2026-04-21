/**
 * @fileoverview WhatsApp Cloud API Utility
 */

const token = process.env.WHATSAPP_API_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

const formatCOP = (amount: number) => {
  return new Intl.NumberFormat('es-CO').format(amount);
};

export async function sendWhatsAppConfirmation(phone: string, orderId: string) {
  if (!token || !phoneNumberId) return;
  const cleanPhone = phone.replace(/\D/g, "");
  
  const payload = {
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

export async function sendAdminNotification(
  phone: string,
  orderId: string,
  customer_name: string, // Updated parameter name
  totalAmount: number
) {
  if (!token || !phoneNumberId) return;

  const cleanPhone = phone.replace(/\D/g, "");
  const formattedPrice = formatCOP(totalAmount);

  const payload = {
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
            { type: "text", text: customer_name }, // Using customer_name
            { type: "text", text: formattedPrice },
            { type: "text", text: orderId },
          ],
        },
      ],
    },
  };

  return await callMetaAPI(payload);
}

async function callMetaAPI(payload: any) {
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
      console.error("❌ Meta API Error:", JSON.stringify(data, null, 2));
      return null;
    }
    return data;
  } catch (error) {
    console.error("❌ WhatsApp API Network Error:", error);
    return null;
  }
}