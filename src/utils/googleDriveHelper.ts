import Papa from 'papaparse';
import { Product } from '../types';
import { normalizeRowToProduct } from './productNormalizer';

export interface DriveFetchResult {
  success: boolean;
  type: 'catalog' | 'json';
  products?: Omit<Product, 'id'>[];
  backupData?: any;
  message: string;
}

/**
 * Extracts Google Drive / Google Sheets ID from any shareable URL format.
 * Supports:
 * - https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit?usp=drive_link
 * - https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/open?id=FILE_ID
 */
export function extractDriveOrSheetId(url: string): { id: string; isSheet: boolean; gid?: string } | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  // Extract gid if present
  const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/i);
  const gid = gidMatch ? gidMatch[1] : undefined;

  // 1. Google Spreadsheets URL
  const sheetMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i);
  if (sheetMatch && sheetMatch[1]) {
    return { id: sheetMatch[1], isSheet: true, gid };
  }

  // 2. Google Drive File View URL
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileMatch && fileMatch[1]) {
    return { id: fileMatch[1], isSheet: false, gid };
  }

  // 3. ID Parameter URL
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (idParamMatch && idParamMatch[1]) {
    return { id: idParamMatch[1], isSheet: false, gid };
  }

  // 4. Naked ID string
  if (/^[a-zA-Z0-9_-]{20,60}$/.test(trimmed)) {
    return { id: trimmed, isSheet: false, gid };
  }

  return null;
}

/**
 * Downloads and parses Google Drive or Google Sheets link
 */
export async function fetchAndParseDriveUrl(rawUrl: string): Promise<DriveFetchResult> {
  const extracted = extractDriveOrSheetId(rawUrl);

  if (!extracted) {
    throw new Error('El enlace ingresado no es un formato válido de Google Drive o Google Sheets. Verifique la URL copiando el enlace de compartir desde Google Drive.');
  }

  const { id, isSheet, gid } = extracted;

  // 1. If it's a Google Spreadsheet (e.g. docs.google.com/spreadsheets/d/...)
  if (isSheet || rawUrl.includes('spreadsheets')) {
    const gidParam = gid ? `&gid=${gid}` : '';
    const csvExportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gidParam}`;
    const gvizExportUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv${gidParam}`;

    let csvText = '';
    let response = await fetch(csvExportUrl);

    if (!response.ok) {
      // Try alternate endpoint
      response = await fetch(gvizExportUrl);
    }

    if (!response.ok) {
      throw new Error('No se pudo acceder a la Hoja de Google Drive. Asegúrese de configurar los permisos del enlace en Google Drive como "Cualquier persona con el enlace puede ver".');
    }

    csvText = await response.text();

    if (!csvText || csvText.trim().length === 0) {
      throw new Error('La hoja de Google Drive no contiene texto o está vacía.');
    }

    // Parse CSV content
    const parsed: Papa.ParseResult<Record<string, any>> = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false
    });

    let products: Omit<Product, 'id'>[] = [];
    if (parsed.data && parsed.data.length > 0) {
      parsed.data.forEach((row, idx) => {
        const prod = normalizeRowToProduct(row, idx, 'Sincronización Google Sheets');
        if (prod) products.push(prod);
      });
    }

    // If object header parsing returned very few or no rows, fallback to matrix array parsing
    if (products.length < 50) {
      const rawParsed: Papa.ParseResult<any[]> = Papa.parse(csvText, {
        header: false,
        skipEmptyLines: 'greedy'
      });

      if (rawParsed.data && rawParsed.data.length > products.length) {
        const arrayProducts: Omit<Product, 'id'>[] = [];
        rawParsed.data.forEach((row, idx) => {
          const prod = normalizeRowToProduct(row, idx, 'Sincronización Google Sheets');
          if (prod) arrayProducts.push(prod);
        });
        if (arrayProducts.length > products.length) {
          products = arrayProducts;
        }
      }
    }

    if (products.length === 0) {
      throw new Error('No se detectaron columnas válidas de productos (ej. CÓDIGO/SKU, DESCRIPCIÓN, PRECIO) en la hoja de Google Drive.');
    }

    return {
      success: true,
      type: 'catalog',
      products,
      message: `Se procesaron exitosamente ${products.length} productos desde la Hoja de Google Drive.`
    };
  }

  // 2. Generic File Download (e.g. JSON Backup)
  const ucDownloadUrl = `https://drive.google.com/uc?export=download&id=${id}`;
  const response = await fetch(ucDownloadUrl);

  if (!response.ok) {
    throw new Error('No se pudo descargar el archivo desde Google Drive. Verifique que los permisos del enlace sean públicos.');
  }

  const text = await response.text();

  // Try parsing as JSON first
  try {
    const jsonObj = JSON.parse(text);
    if (jsonObj && typeof jsonObj === 'object' && (jsonObj.products || jsonObj.inventory_movements)) {
      return {
        success: true,
        type: 'json',
        backupData: jsonObj,
        message: 'Respaldo JSON descargado correctamente desde Google Drive.'
      };
    }
  } catch (e) {
    // Not JSON, try parsing as CSV
  }

  // Try parsing as CSV text
  const parsed = Papa.parse<Record<string, any>>(text, {
    header: true,
    skipEmptyLines: true
  });

  const products: Omit<Product, 'id'>[] = [];
  parsed.data.forEach((row, idx) => {
    const prod = normalizeRowToProduct(row, idx, 'Google Drive Direct File');
    if (prod) products.push(prod);
  });

  if (products.length > 0) {
    return {
      success: true,
      type: 'catalog',
      products,
      message: `Se leyeron ${products.length} productos del archivo en Google Drive.`
    };
  }

  throw new Error('El archivo de Google Drive no contiene un formato de catálogo Excel/CSV ni un respaldo JSON válido.');
}
