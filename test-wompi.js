const crypto = require("crypto");

// ==========================================
// 1. CONFIGURA ESTOS 3 VALORES
// ==========================================
const secret = "test_events_BjzqSj9qC8CQ6TSDjF3NJnbYFeKXEybS";
const orderId = "8tiZymsNqdmZ7p5HKsAc";
const vercelUrl = "https://aura-bakery-shop.vercel.app/api/webhook";

// ==========================================
// 2. CONSTRUIMOS EL MENSAJE COMO SI FUERAMOS WOMPI
// ==========================================
const payload = {
  event: "transaction.updated",
  data: {
    transaction: {
      id: "simulacion-12345",
      status: "APPROVED",
      amount_in_cents: 1500000,
      reference: orderId, // Tu base de datos buscará este ID
    },
  },
  timestamp: Math.floor(Date.now() / 1000),
};

// 3. GENERAMOS LA FIRMA CRIPTOGRÁFICA (SHA-256)
const stringToSign = `${payload.data.transaction.id}${payload.data.transaction.status}${payload.data.transaction.amount_in_cents}${payload.timestamp}${secret}`;
const checksum = crypto.createHash("sha256").update(stringToSign).digest("hex");

payload.signature = {
  properties: [
    "transaction.id",
    "transaction.status",
    "transaction.amount_in_cents",
  ],
  checksum: checksum,
};

// 4. DISPARAMOS EL WEBHOOK HACIA VERCEL
console.log("🚀 Disparando webhook a Vercel...");

fetch(vercelUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
})
  .then((response) => response.text())
  .then((result) => console.log("✅ Respuesta de Vercel:", result))
  .catch((error) => console.error("❌ Error:", error));
