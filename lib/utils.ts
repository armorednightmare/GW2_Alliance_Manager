/**
 * Absolut sichere Bereinigung von Daten für Next.js Client Components.
 * Wandelt Timestamps/Dates um und garantiert ein "Plain Object" ohne Prototypen-Ballast.
 */
export function sanitizeData(data: any): any {
  if (data === null || data === undefined) return data;

  // 1. Rekursive Bereinigung von Timestamps und Dates
  const deepClean = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(deepClean);
    }

    // Firestore Timestamp oder Date -> ISO String
    if (obj.toDate && typeof obj.toDate === 'function') {
      return obj.toDate().toISOString();
    }
    if (obj instanceof Date) {
      return obj.toISOString();
    }

    // Normales Objekt: neuen "sauberen" Container erstellen
    const cleanObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cleanObj[key] = deepClean(obj[key]);
      }
    }
    return cleanObj;
  };

  // 2. Den bereinigten Baum durch JSON jagen, um absolut sicherzugehen (entfernt Klassen/Prototypen)
  return JSON.parse(JSON.stringify(deepClean(data)));
}
