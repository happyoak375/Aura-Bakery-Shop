import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import * as dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Diccionario exacto mapeado de tu exportación
const idDictionary: Record<string, string> = {
  "00001": "cafe-grano-bolsa",
  "3H7iJvrsjkIpd8eKbgcf": "cocoa-polvo",
  "5FIacFGS6CaOe6HCm4pP": "cobertura-chocolate-blanco",
  "74kNjeFiFgVcRBxzrMHj": "muffin-chocolate",
  "7WYgRxOXPTBm56pwpcpu": "crema-de-leche",
  "9xzNG6ivbiENiE8h9y86": "huevos-aa",
  "BTPWgEc3BZMUocStZRQn": "limon",
  "M62EOPptlXniVvK7WAoF": "yogurt-griego",
  "NDzXFrN40mqLGLOIH2IZ": "chocolate-semiamargo",
  "NYfE213uC3PCsCy0L9sU": "azucar-morena",
  "Nrr8wh6hMoDnCORZrAgA": "glucosa",
  "Qo55xfJsLpKq39LVybOX": "arandanos",
  "TN3dhXTrPsYp5FB5jPdM": "bicarbonato",
  "U2eprL2TAPvPj5ePHEDA": "canela",
  "U9U6XuZLRBIgyplbEnQv": "colorante-rojo",
  "dV9UT22L8rOC07KJi8Sh": "wip-nata-pasteis",
  "dhicyzVKxsJHIgzf0cUe": "wip-crema-base-pasteis",
  "ec6jcnCIMjsQGgHJVUg1": "queso-crema",
  "fSnWb6KZSBWpI0IIhE4h": "harina-trigo-fuerte",
  "hfYmna1OS0ddFuRqK2iM": "esencia-vainilla",
  "jJTe3BNFobMdb1t3TnJI": "cobertura-chocolate-negro",
  "mYI7llFK5LUVAZGjbUtE": "muffin-queso-tocineta",
  "oOMMzk0HddSbyo5M0TEJ": "wip-masa-muffins-salados",
  "p6WA104EyTBbXPexjilZ": "sal",
  "pVUiLPehraHcBycL5C3u": "aceite-girasol",
  "qCfIUm3YZZmy85FwuDFJ": "muffin-queso",
  "srbEmhYf69vViqFDCcBQ": "polvo-hornear",
  "tiJfHqAK2ZUHVI43CdRS": "azucar-blanca",
  "u0GMPhut4XYrFWG5wJqc": "wip-jarabe-pasteis",
  "u2wegdOYcF4LNiZL1TcL": "wip-hojaldre",
  "w6QF1akLmOmOXbSzkWar": "agua",
  "xSVhaS3BDKYaE74nvtrn": "muffin-arandanos",
  "zEe63tU8FSbscLSnzq07": "cocoa-alcalina"
};

async function migrateDatabase() {
  console.log("Iniciando la limpieza de base de datos...");
  const batch = writeBatch(db);
  const inventoryRef = collection(db, "inventory_items");
  const snapshot = await getDocs(inventoryRef);

  let updatedCount = 0;
  let migratedCount = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const oldId = docSnap.id;
    let needsUpdate = false;
    let newData = { ...data };

    // 1. Corregir errores tipográficos conocidos
    if (newData.name === "Arándalos") newData.name = "Arándanos";
    if (newData.name === "Muffin de Arándalos") newData.name = "Muffin de Arándanos";

    // 2. Limpiar el BOM si existe
    if (Array.isArray(newData.bom)) {
      newData.bom = newData.bom.map((b: any) => {
        // Tu código usa inventoryItemId
        const targetId = b.inventoryItemId || b.itemId;
        if (idDictionary[targetId]) {
          needsUpdate = true;
          return { ...b, inventoryItemId: idDictionary[targetId] };
        }
        return b;
      });
    }

    // 3. Determinar qué hacer con el documento
    if (idDictionary[oldId]) {
      // El documento tiene un ID feo. Creamos uno nuevo limpio y borramos el viejo.
      const newId = idDictionary[oldId];
      const newRef = doc(db, "inventory_items", newId);
      const oldRef = doc(db, "inventory_items", oldId);
      
      batch.set(newRef, newData);
      batch.delete(oldRef);
      migratedCount++;
      console.log(`✅ Migrado: ${oldId} -> ${newId}`);
    } else if (needsUpdate) {
      // El ID del documento está bien (ej. "aura-cookie"), pero su receta cambió
      const currentRef = doc(db, "inventory_items", oldId);
      batch.set(currentRef, newData); // Usamos set con newData para sobreescribir limpio
      updatedCount++;
      console.log(`🔄 Receta actualizada: ${oldId}`);
    }
  });

  console.log(`Preparando ${migratedCount + updatedCount} operaciones. Ejecutando Batch...`);
  
  try {
    await batch.commit();
    console.log("🚀 ¡Migración completada con éxito!");
  } catch (error) {
    console.error("❌ Error durante el batch commit:", error);
  }
}

migrateDatabase();
