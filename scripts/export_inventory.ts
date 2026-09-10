import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as fs from "fs";
import * as dotenv from "dotenv";

// 1. Cargar la configuración existente del proyecto Next.js
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

async function exportInventory() {
  console.log(`📡 Conectando al proyecto: ${firebaseConfig.projectId} en modo READ ONLY...`);

  try {
    const inventoryRef = collection(db, "inventory_items");
    const snapshot = await getDocs(inventoryRef);

    const rawItems: any[] = [];
    const itemMap = new Map<string, any>();
    const allFields = new Set<string>();

    // 1. Recolección principal
    snapshot.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;
      const fullItem = { id, ...data };
      
      rawItems.push(fullItem);
      itemMap.set(id, fullItem);
      
      Object.keys(data).forEach(key => allFields.add(key));
    });
    
    allFields.add("id"); // Asegurar que el ID está documentado

    const inventoryCsvRows: any[] = [];
    const bomCsvRows: any[] = [];
    const unresolvedBomRows: any[] = [];
    const uniqueUnits = new Set<string>();

    const summary = {
      total_inventory_items: 0,
      raw_material: 0,
      wip: 0,
      finished_good: 0,
      items_with_bom: 0,
      items_without_bom: 0,
      broken_bom_references: 0,
      distinct_units: [] as string[],
      document_fields: Array.from(allFields)
    };

    // 2. Procesamiento de datos y relaciones BOM
    rawItems.forEach(item => {
      summary.total_inventory_items++;
      
      if (item.type === 'raw_material') summary.raw_material++;
      if (item.type === 'wip') summary.wip++;
      if (item.type === 'finished_good') summary.finished_good++;
      
      if (item.unit) uniqueUnits.add(item.unit);

      // Manejar posibles variaciones históricas del campo itemId
      const hasBom = Array.isArray(item.bom) && item.bom.length > 0;
      if (hasBom) summary.items_with_bom++;
      else summary.items_without_bom++;

      const bomItemCount = hasBom ? item.bom.length : 0;

      // Construir fila para inventory_items.csv
      inventoryCsvRows.push({
        documentId: item.id,
        name: item.name || '',
        type: item.type || '',
        unit: item.unit || '',
        currentStock: item.currentStock ?? 0,
        costPerUnit: item.costPerUnit ?? 0,
        hasBom: hasBom,
        bomItemCount: bomItemCount,
        category: item.category || '' // Añadir otros campos relevantes
      });

      // Construir filas para bom.csv y unresolved_bom.csv
      if (hasBom) {
        item.bom.forEach((b: any) => {
          const componentId = b.inventoryItemId || b.itemId;
          const component = itemMap.get(componentId);

          if (component) {
            bomCsvRows.push({
              parentDocumentId: item.id,
              parentName: item.name || '',
              parentType: item.type || '',
              componentItemId: componentId,
              componentName: component.name || '',
              componentType: component.type || '',
              quantity: b.quantity || 0,
              componentUnit: component.unit || ''
            });
          } else {
            summary.broken_bom_references++;
            unresolvedBomRows.push({
              parentDocumentId: item.id,
              parentName: item.name || '',
              componentItemId: componentId
            });
          }
        });
      }
    });

    summary.distinct_units = Array.from(uniqueUnits);

    // 3. Función auxiliar segura para CSV
    const writeCsv = (filename: string, dataArray: any[]) => {
      if (dataArray.length === 0) {
        fs.writeFileSync(filename, "No hay datos\n");
        return;
      }
      const headers = Object.keys(dataArray[0]).join(",");
      const rows = dataArray.map(obj => 
        Object.values(obj).map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")
      ).join("\n");
      fs.writeFileSync(filename, `${headers}\n${rows}`);
    };

    // 4. Escritura de los 5 archivos
    console.log("💾 Escribiendo archivos locales...");
    fs.writeFileSync("inventory_items_raw.json", JSON.stringify(rawItems, null, 2));
    fs.writeFileSync("inventory_summary.json", JSON.stringify(summary, null, 2));
    writeCsv("inventory_items.csv", inventoryCsvRows);
    writeCsv("bom.csv", bomCsvRows);
    writeCsv("unresolved_bom.csv", unresolvedBomRows);

    console.log("✅ ¡Exportación finalizada de forma segura!");

  } catch (error) {
    console.error("❌ Error durante la exportación:", error);
  }
}

exportInventory();