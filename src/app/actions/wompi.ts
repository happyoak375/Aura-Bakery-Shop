// src/app/actions/wompi.ts (o src/actions/wompi.ts)
'use server'

import crypto from 'crypto';

export async function getWompiSignature(reference: string, amountInCents: number) {
  const secret = process.env.WOMPI_INTEGRITY_SECRET;
  
  if (!secret) {
    throw new Error('Falta WOMPI_INTEGRITY_SECRET en las variables de entorno');
  }

  // Wompi exige estrictamente este orden: referencia + precio + moneda + secreto
  const concatenatedString = `${reference}${amountInCents}COP${secret}`;

  // Encriptamos la firma usando SHA-256
  const hashHex = crypto.createHash('sha256').update(concatenatedString).digest('hex');

  return hashHex;
}