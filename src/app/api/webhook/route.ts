import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from 'clear../../../lib/firebase'; // Ajusta la ruta a tu config de Firebase

export async function POST(request: Request) {
  try {
    // 1. Parse the incoming webhook payload from Wompi
    const body = await request.json();
    
    const { event, data, signature, timestamp } = body;
    const transaction = data.transaction;

    // We only care about transaction updates
    if (event !== 'transaction.updated') {
      return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
    }

    // 2. Verify the Webhook Signature (Security Check)
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
    if (!eventsSecret) {
      console.error("Falta WOMPI_EVENTS_SECRET");
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // Wompi tells us exactly which properties they used to create the hash
    let concatenatedString = '';
    signature.properties.forEach((prop: string) => {
      const keys = prop.split('.'); // e.g., 'transaction.id'
      // @ts-ignore - Dynamically accessing nested object properties
      concatenatedString += keys.reduce((obj, key) => obj[key], body);
    });

    // Add the timestamp and your secret to the end of the string
    concatenatedString += timestamp;
    concatenatedString += eventsSecret;

    // Generate our own hash to compare against Wompi's
    const expectedChecksum = crypto.createHash('sha256').update(concatenatedString).digest('hex');

    if (expectedChecksum !== signature.checksum) {
      console.error("¡Alerta de Seguridad! La firma del webhook no coincide.");
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. Signature is valid! Now update Firebase.
    const orderId = transaction.reference; // This is the Firebase Document ID we sent earlier
    const paymentStatus = transaction.status; // 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR'

    const orderRef = doc(db, 'orders', orderId);

    // Map Wompi's status to our database status
    let newStatus = 'pending';
    if (paymentStatus === 'APPROVED') newStatus = 'paid';
    if (paymentStatus === 'DECLINED' || paymentStatus === 'ERROR') newStatus = 'failed';

    await updateDoc(orderRef, {
      paymentStatus: newStatus,
      wompiTransactionId: transaction.id, // Good to save for accounting
      updatedAt: new Date()
    });

    console.log(`Orden ${orderId} actualizada a estado: ${newStatus}`);

    // 4. Always return a 200 OK so Wompi knows we received it
    return NextResponse.json({ message: 'Webhook procesado exitosamente' }, { status: 200 });

  } catch (error) {
    console.error('Error procesando webhook de Wompi:', error);
    // Even if we fail, we return a 200 sometimes so Wompi doesn't retry infinitely, 
    // but returning a 500 will make Wompi try again later.
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}