export async function sendWhatsAppConfirmation(phone: string, orderId: string) {
  console.log("--- [WHATSAPP ATTEMPT START] ---");
  console.log(`1. Raw phone from database/input: "${phone}"`);
  console.log(`2. Order ID: "${orderId}"`);

  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  // Verify environment variables are actually loaded
  if (!token) {
    console.error("❌ ERROR: WHATSAPP_API_TOKEN is undefined. Check Vercel Env Vars.");
    return;
  }
  if (!phoneNumberId) {
    console.error("❌ ERROR: WHATSAPP_PHONE_NUMBER_ID is undefined. Check Vercel Env Vars.");
    return;
  }

  // Format the number: digits only
  const cleanPhone = phone.replace(/\D/g, "");
  console.log(`3. Cleaned phone for API: "${cleanPhone}"`);

  const payload = {
    messaging_product: "whatsapp",
    to: cleanPhone,
    type: "template",
    template: {
      name: "hello_world",
      language: { code: "en_US" },
    },
  };

  console.log("4. Sending request to Meta API...");

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
      console.error("❌ META API ERROR RESPONSE:");
      console.error(JSON.stringify(data, null, 2));
      throw new Error(`Meta API Error: ${data.error?.message || "Unknown Error"}`);
    }

    console.log(`✅ SUCCESS: Message sent to ${cleanPhone}`);
    console.log("--- [WHATSAPP ATTEMPT END] ---");
    return data;

  } catch (error) {
    console.error("❌ CRITICAL ERROR in sendWhatsAppConfirmation:");
    console.error(error);
    throw error;
  }
}