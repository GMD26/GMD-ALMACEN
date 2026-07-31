/**
 * Sanitizes a document ID string for Firestore.
 * Replaces forward slashes `/` and invalid characters to avoid segment path errors.
 */
export function toSafeDocId(rawId: string): string {
  if (!rawId) return `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const sanitized = String(rawId)
    .trim()
    .replace(/[\/\s\\#$\[\]\.]/g, '_')
    .replace(/_+/g, '_');
  return sanitized || `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Utility to sanitize objects before sending to Firestore.
 * Recursively removes any keys with `undefined` values and converts `NaN` to numbers,
 * as Firestore throws errors on undefined or NaN properties.
 */
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'number') {
    return (isNaN(obj) ? 0 : obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj
      .map(item => cleanFirestoreData(item))
      .filter(item => item !== undefined) as unknown as T;
  }

  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as T;
  }

  return obj;
}
