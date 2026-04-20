// src/lib/whatsapp.ts

/**
 * Sends a WhatsApp confirmation message using the Meta Cloud API.
 * * @param phone - The customer's phone number (must include country code, e.g., '57' for Colombia)
 * @param orderId - The Firebase document ID for the order
 */
export async function sendWhatsAppConfirmation(phone: string, orderId: string) {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("WhatsApp environment variables are missing.");
    return;
  }

  // Ensure the phone number has the Colombian country code if not present
  const formattedPhone = phone.startsWith("57") ? phone : `57${phone}`;

  const payload = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: "order_confirmation", // Replace with your approved template name in Meta Business Manager
      language: {
        code: "es", // Spanish for your local customers
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: orderId, // Passes the order ID into the WhatsApp template
            },
          ],
        },
      ],
    },
  };

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
      throw new Error(`WhatsApp API Error: ${JSON.stringify(data)}`);
    }

    console.log(`WhatsApp message successfully sent to ${formattedPhone}`);
  } catch (error) {
    console.error("Failed to send WhatsApp confirmation:", error);
    throw error;
  }
}