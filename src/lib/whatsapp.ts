export async function sendWhatsAppConfirmation(phone: string, orderId: string) {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error("WhatsApp environment variables are missing.");
    return;
  }

  // 1. Limpiar el teléfono: quita el '+', espacios y guiones
  const cleanPhone = phone.replace(/\D/g, "");

  const payload = {
    messaging_product: "whatsapp",
    to: cleanPhone, // Ahora enviará 1908... o 57317... sin basura
    type: "template",
    template: {
      name: "hello_world", // USA ESTA PARA LA PRUEBA. Luego la cambias cuando aprueben la tuya.
      language: {
        code: "en_US", // La plantilla hello_world suele estar en inglés
      },
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

    console.log(`¡Mensaje enviado con éxito a ${cleanPhone}!`);
  } catch (error) {
    console.error("Error al enviar WhatsApp:", error);
    throw error;
  }
}