/**
 * @fileoverview Wompi Webhook Listener (Next.js API Route)
 * This serverless endpoint acts as the official source of truth for payment statuses.
 * Wompi's servers will asynchronously POST to this URL whenever a transaction changes
 * state (e.g., from pending to APPROVED or DECLINED).
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

/**
 * Handles incoming POST requests from the Wompi Event Webhook.
 * @param {Request} request - The incoming HTTP request containing the Wompi payload.
 * @returns {Promise<NextResponse>} HTTP status confirming receipt or indicating an error.
 */
export async function POST(request: Request) {
  try {
    // 1. Parse the incoming webhook payload
    const body = await request.json();

    const { event, data, signature, timestamp } = body;
    const transaction = data.transaction;

    /**
     * EVENT FILTERING:
     * Webhooks can trigger for many reasons. We strictly only care about
     * 'transaction.updated' to know if a payment succeeded or failed.
     */
    if (event !== "transaction.updated") {
      return NextResponse.json({ message: "Event ignored" }, { status: 200 });
    }

    // 2. Retrieve Webhook Secret
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
    if (!eventsSecret) {
      console.error("Falta WOMPI_EVENTS_SECRET");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 },
      );
    }

    /**
     * SECURITY: WEBHOOK SIGNATURE VALIDATION
     * To prevent malicious actors from sending fake "APPROVED" payloads to our server,
     * Wompi signs the payload. We must recreate the hash using our private events secret.
     * If our hash matches their hash, the payload is authentically from Wompi.
     */
    let concatenatedString = "";

    // Wompi dynamically specifies which properties were used for the signature
    signature.properties.forEach((prop: string) => {
      const keys = prop.split("."); // e.g., 'transaction.id'

      // Traverse the nested data object to extract the actual value for the hash
      concatenatedString += keys.reduce((obj, key) => obj[key], data);
    });

    // Append timestamp and secret to the end of the string as required by Wompi docs
    concatenatedString += timestamp;
    concatenatedString += eventsSecret;

    // Generate our own hash to compare against Wompi's checksum
    const expectedChecksum = crypto
      .createHash("sha256")
      .update(concatenatedString)
      .digest("hex");

    // Failsafe: Abort immediately if the signatures do not perfectly match
    if (expectedChecksum !== signature.checksum) {
      console.error("¡Alerta de Seguridad! La firma del webhook no coincide.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    /**
     * DATABASE UPDATE:
     * The signature is valid. We can safely update the database.
     * We use the 'reference' field because we passed our Firebase Document ID
     * into that field when we originally initialized the checkout widget.
     */
    const orderId = transaction.reference;
    const paymentStatus = transaction.status;

    const orderRef = doc(db, "orders", orderId);

    // Normalize Wompi's exact status strings to our application's UI states
    let newStatus = "pending";
    if (paymentStatus === "APPROVED") newStatus = "paid";
    if (paymentStatus === "DECLINED" || paymentStatus === "ERROR")
      newStatus = "failed";

    await updateDoc(orderRef, {
      paymentStatus: newStatus,
      wompiTransactionId: transaction.id, // Crucial to store for financial auditing/refunds
      updatedAt: new Date(),
    });

    console.log(`Orden ${orderId} actualizada a estado: ${newStatus}`);

    /**
     * ACKNOWLEDGEMENT:
     * We must return a 200 OK so Wompi knows we successfully received and processed
     * the event. If we don't, Wompi will keep retrying the webhook.
     */
    return NextResponse.json(
      { message: "Webhook procesado exitosamente" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error procesando webhook de Wompi:", error);
    // Returning a 500 tells Wompi our server crashed, prompting them to retry later.
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
