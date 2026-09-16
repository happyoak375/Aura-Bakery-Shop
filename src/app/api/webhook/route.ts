/**
 * @fileoverview Listener de Webhooks de Pasarela de Pagos (Wompi) - Aura Bakery
 * 
 * Responsabilidades:
 * 1. Validación de Integridad Criptográfica:
 *    - Recibe eventos asíncronos 'transaction.updated' de Wompi[cite: 1, 2].
 *    - Reconstruye la cadena de verificación con `signature.properties`, `timestamp` y `WOMPI_EVENTS_SECRET`[cite: 1, 2].
 *    - Calcula el hash SHA-256 y descarta peticiones no autorizadas con código HTTP 401[cite: 1, 2].
 * 2. Conciliación y Actualización en Firestore:
 *    - Si el pago es 'APPROVED', actualiza `paymentStatus` a 'PAGADO'.
 *    - Si el pago es 'DECLINED' o 'ERROR', persiste la causa del fallo en la orden[cite: 1, 2].
 *    - Almacena el `wompiTransactionId` para trazabilidad bancaria[cite: 1, 2].
 * 3. Automatización de Mensajería (Meta WhatsApp Cloud API):
 *    - Lee los datos del cliente (`customerPhone`, `customerName`, `totalAmount`) bajo el esquema V2[cite: 1].
 *    - Envía automáticamente el recibo de compra al cliente (`sendWhatsAppConfirmation`)[cite: 1, 2].
 *    - Notifica al teléfono operativo de administración (`sendAdminNotification`)[cite: 1, 2].
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { sendWhatsAppConfirmation, sendAdminNotification } from "../../../lib/whatsapp";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, data, signature, timestamp } = body;
    const transaction = data?.transaction;

    // Se ignoran eventos ajenos a la actualización de transacciones
    if (event !== "transaction.updated" || !transaction) {
      return NextResponse.json({ message: "Evento ignorado" }, { status: 200 });
    }

    // Validación de variable de entorno requerida para validación de firma
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
    if (!eventsSecret) {
      console.error("Configuración de servidor incompleta: Falta WOMPI_EVENTS_SECRET");
      return NextResponse.json({ error: "Configuración inválida del servidor" }, { status: 500 });
    }

    // =========================================================================
    // 1. VALIDACIÓN CRIPTOGRÁFICA DE LA FIRMA (HMAC SHA-256)
    // =========================================================================
    let concatenatedString = "";
    signature.properties.forEach((prop: string) => {
      const keys = prop.split(".");
      concatenatedString += keys.reduce((obj: any, key: string) => obj && obj[key], data);
    });
    concatenatedString += timestamp + eventsSecret;

    const expectedChecksum = crypto
      .createHash("sha256")
      .update(concatenatedString)
      .digest("hex");

    if (expectedChecksum !== signature.checksum) {
      console.error("Alerta de Seguridad: La firma del webhook no coincide con el checksum esperado.");
      return NextResponse.json({ error: "Firma no autorizada" }, { status: 401 });
    }

    // =========================================================================
    // 2. CONCILIACIÓN DE ESTADOS Y NOTIFICACIONES
    // =========================================================================
    const orderId = transaction.reference;
    const paymentStatus = transaction.status;
    const orderRef = doc(db, "orders", orderId);

    let newStatus = "PENDIENTE";

    if (paymentStatus === "APPROVED") {
      newStatus = "PAGADO";

      try {
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
          const orderData = orderSnap.data();
          const customerPhone = orderData.customerPhone;
          
          // Mapeo sincronizado con los campos generados en el Checkout V2
          const customerName = orderData.customerName || "Cliente";
          const totalAmount = orderData.totalAmount || 0;

          // Despacho del recibo oficial por WhatsApp al comprador
          if (customerPhone) {
            await sendWhatsAppConfirmation(customerPhone, orderId);
          }

          // Despacho de alerta interna de ingreso a administración
          const adminPhone = process.env.ADMIN_PHONE_NUMBER;
          if (adminPhone) {
            await sendAdminNotification(
              adminPhone,
              orderId,
              customerName,
              totalAmount
            );
          }
        }
      } catch (notificationError) {
        console.error("Error al procesar notificaciones de WhatsApp:", notificationError);
      }
    } else if (paymentStatus === "DECLINED" || paymentStatus === "ERROR") {
      newStatus = paymentStatus; // Persiste el motivo exacto del rechazo
    }

    // Actualización atómica del estado del pago en Firestore
    await updateDoc(orderRef, {
      paymentStatus: newStatus,
      wompiTransactionId: transaction.id,
      updatedAt: new Date(),
    });

    return NextResponse.json({ message: "Transacción procesada exitosamente" }, { status: 200 });

  } catch (error) {
    console.error("Error crítico durante el procesamiento del webhook:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}