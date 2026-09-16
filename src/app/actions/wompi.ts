"use server";

/**
 * @fileoverview Acciones del Servidor para la Pasarela de Pagos (Server Actions) - Wompi
 * 
 * Responsabilidades:
 * 1. Protección Criptográfica del Servidor:
 *    - La directiva "use server" garantiza que este archivo se ejecute exclusivamente en el entorno
 *      Node.js del backend, evitando que claves privadas se expongan en el código cliente de React.
 * 2. Generación de Firma de Integridad (SHA-256):
 *    - Calcula el hash criptográfico requerido por el widget de pago de Wompi para asegurar
 *      que ni el monto a cobrar ni la referencia del pedido sean manipulados por el usuario[cite: 1].
 * 3. Regla de Concatenación Oficial de Wompi:
 *    - Orden estricto: Cadena de Referencia + Monto en Centavos + 'COP' + WOMPI_INTEGRITY_SECRET[cite: 1].
 */

import crypto from "crypto";

/**
 * Genera la firma SHA-256 para validar la integridad de una transacción en Wompi[cite: 1].
 * 
 * @param reference ID único de la orden o venta generado previamente en Firestore (ej. 'POS-1005' o 'ORD-1005')[cite: 1, 5].
 * @param amountInCents Monto total de la compra multiplicado por 100 (ej. $10.000 COP -> 1000000)[cite: 1].
 * @returns Hash hexadecimal de 64 caracteres compatible con el parámetro 'signature:integrity' de Wompi[cite: 1, 2].
 * @throws {Error} Si la variable de entorno WOMPI_INTEGRITY_SECRET no está definida en el servidor[cite: 1].
 */
export async function getWompiSignature(
  reference: string,
  amountInCents: number
): Promise<string> {
  // Lectura directa del secreto de integridad desde el entorno seguro del servidor[cite: 1]
  const secret = process.env.WOMPI_INTEGRITY_SECRET;

  // Validación defensiva: Detiene el proceso si el servidor no tiene configurada la variable[cite: 1]
  if (!secret) {
    throw new Error("Falta WOMPI_INTEGRITY_SECRET en las variables de entorno del servidor[cite: 1].");
  }

  /**
   * REGLA DE CONCATENACIÓN OFICIAL DE WOMPI:
   * 1. ID de Referencia (reference)[cite: 1]
   * 2. Monto en centavos sin decimales (amountInCents)[cite: 1]
   * 3. Código ISO de la moneda (estrictamente 'COP')[cite: 1]
   * 4. Secreto de Integridad de la cuenta de Wompi (secret)[cite: 1]
   */
  const concatenatedString = `${reference}${amountInCents}COP${secret}`;

  /**
   * CÁLCULO CRIPTOGRÁFICO UNIDIRECCIONAL:
   * Emplea el módulo 'crypto' nativo de Node.js para generar el hash SHA-256 en formato hexadecimal[cite: 1].
   */
  const hashHex = crypto
    .createHash("sha256")
    .update(concatenatedString)
    .digest("hex");

  return hashHex;
}