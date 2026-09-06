/**
 * @fileoverview Wompi Webhook Listener
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
    const transaction = data.transaction;

    if (event !== "transaction.updated") {
      return NextResponse.json({ message: "Event ignored" }, { status: 200 });
    }

    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
    if (!eventsSecret) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    // 1. Validate Wompi Signature
    let concatenatedString = "";
    signature.properties.forEach((prop: string) => {
      const keys = prop.split(".");
      concatenatedString += keys.reduce((obj: any, key: string) => obj && obj[key], data);
    });
    concatenatedString += timestamp + eventsSecret;

    const expectedChecksum = crypto.createHash("sha256").update(concatenatedString).digest("hex");

    if (expectedChecksum !== signature.checksum) {
      console.error("⚠️ Security Alert: Webhook signature mismatch!");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 2. Process Order Database Update
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
          
          // EXACT V2 keys synced from Checkout
          const customerName = orderData.customerName || "Cliente";
          const totalAmount = orderData.totalAmount || 0;

          // Send Customer Receipt
          if (customerPhone) {
            await sendWhatsAppConfirmation(customerPhone, orderId);
          }

          // Send Internal Admin Alert
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
      } catch (err) {
        console.error("Notification Error:", err);
      }
    } else if (paymentStatus === "DECLINED" || paymentStatus === "ERROR") {
      newStatus = paymentStatus; // Save specific failure reason
    }

    // Update Firestore
    await updateDoc(orderRef, {
      paymentStatus: newStatus,
      wompiTransactionId: transaction.id,
      updatedAt: new Date(),
    });

    return NextResponse.json({ message: "Success" }, { status: 200 });

  } catch (error) {
    console.error("Webhook Processing Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}