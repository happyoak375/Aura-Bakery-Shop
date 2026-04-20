export async function sendWhatsAppConfirmation(phone: string, orderId: string) {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) return;

  // ESTA LÍNEA ES LA MAGIA: Quita el '+', espacios y cualquier cosa que no sea un número
  const cleanPhone = phone.replace(/\D/g, ""); 

  const payload = {
    messaging_product: "whatsapp",
    to: cleanPhone, // Enviará '573173285832' o '19086724090' limpio
    type: "template",
    template: {
      name: "hello_world", 
      language: { code: "en_US" },
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
    if (!response.ok) throw new Error(JSON.stringify(data));
    console.log(`✅ Mensaje enviado a ${cleanPhone}`);
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}