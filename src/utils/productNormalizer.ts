import { Product } from '../types';

export const parseNumberValue = (val: any, fallback = 0): number => {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (val === null || val === undefined) return fallback;
  const str = String(val).trim();
  if (!str) return fallback;
  const cleaned = str.replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
};

export const normalizeRowToProduct = (
  row: Record<string, any> | any[], 
  idx: number,
  updatedByLabel = 'Carga Excel/CSV'
): Omit<Product, 'id'> | null => {
  if (!row) return null;

  const cleanKey = (str: string) => 
    String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  let sku = '';
  let descripcion = '';
  let medida = '';
  let unidad = '';
  let rawPrecio = '';
  let rawPrecioIva = '';
  let rawPrecioDesc = '';
  let raw114 = '';
  let raw116 = '';
  let raw12798 = '';
  let rawCosto = '';
  let categoria = '';
  let ubicacion = '';
  let rawStock = '';
  let rawMinStock = '';

  if (Array.isArray(row)) {
    // Skip if array is completely empty
    const nonNullCells = row.map(c => c !== null && c !== undefined ? String(c).trim() : '').filter(Boolean);
    if (nonNullCells.length === 0) return null;

    // Check if this array row is a header row
    const firstTwoNorm = nonNullCells.slice(0, 3).map(cleanKey);
    if (
      firstTwoNorm.some(k => k === 'codigo' || k === 'sku' || k === 'clave' || k === 'art') &&
      firstTwoNorm.some(k => k === 'descripcion' || k === 'producto' || k === 'nombre' || k === 'detalle')
    ) {
      return null;
    }

    // Positional extraction with flexible column shift detection
    // If row[0] is just a sequence number (1, 2, 3...) and row[1] looks like SKU/Desc
    let colOffset = 0;
    const str0 = String(row[0] || '').trim();
    const str1 = String(row[1] || '').trim();
    if (/^\d{1,4}$/.test(str0) && str1.length > 0 && row.length > 3) {
      // row[0] is likely line number
      colOffset = 1;
    }

    sku = String(row[0 + colOffset] || '').trim();
    descripcion = String(row[1 + colOffset] || '').trim();
    medida = String(row[2 + colOffset] || '').trim();
    unidad = String(row[3 + colOffset] || '').trim();
    rawPrecio = String(row[4 + colOffset] || '');
    rawPrecioIva = String(row[5 + colOffset] || '');
    rawPrecioDesc = String(row[6 + colOffset] || '');
    raw114 = String(row[7 + colOffset] || '');
    raw116 = String(row[8 + colOffset] || '');
    raw12798 = String(row[9 + colOffset] || '');
    rawCosto = String(row[10 + colOffset] || '');

    // Fallback if sku/descripcion are empty but row has non-empty cells
    if (!sku && !descripcion) {
      if (nonNullCells.length >= 2) {
        sku = nonNullCells[0];
        descripcion = nonNullCells[1];
      } else if (nonNullCells.length === 1) {
        sku = `SKU-${idx + 1}`;
        descripcion = nonNullCells[0];
      }
    }
  } else if (typeof row === 'object') {
    const keys = Object.keys(row);
    if (keys.length === 0) return null;

    // Build normalized map of column names
    const normMap = new Map<string, { key: string; val: any }>();
    keys.forEach(k => {
      const c = cleanKey(k);
      if (c && !normMap.has(c)) {
        normMap.set(c, { key: k, val: row[k] });
      }
    });

    const findValue = (possibleCleanNames: string[]): string => {
      // 1. Exact clean key match
      for (const name of possibleCleanNames) {
        const item = normMap.get(cleanKey(name));
        if (item && item.val !== null && item.val !== undefined) {
          const valStr = String(item.val).trim();
          if (valStr !== '') return valStr;
        }
      }
      // 2. Partial clean key match
      for (const [ckey, item] of normMap.entries()) {
        if (possibleCleanNames.some(p => ckey.includes(cleanKey(p)))) {
          if (item.val !== null && item.val !== undefined) {
            const valStr = String(item.val).trim();
            if (valStr !== '') return valStr;
          }
        }
      }
      return '';
    };

    sku = findValue(['CODIGO', 'SKU', 'CLAVE', 'ID', 'NO', 'NUMERO', 'ARTICULO', 'COD', 'ITEM', 'REFERENCIA', 'REF', 'PARTNUMBER', 'PN', 'CLAVEPROD', 'CVE']);
    descripcion = findValue(['DESCRIPCIÓN', 'DESCRIPCION', 'PRODUCTO', 'NOMBRE', 'DETALLE', 'CONCEPTO', 'DENOMINACION', 'TITULO', 'ARTICULO', 'ITEM', 'DESCRIP', 'NOM']);
    medida = findValue(['MEDIDA', 'MEDIDAS', 'TAMAÑO', 'PRESENTACIÓN', 'ANCHO', 'ESPECIFICACION', 'ESPECIFICACIÓN', 'DIMENSION']);
    unidad = findValue(['UNIDAD', 'UM', 'UMEDIDA', 'UNIDADMEDIDA']);
    rawPrecio = findValue(['PRECIO', 'PRECIOBASE', 'PVP', 'PRECIOVENTA', 'PRECIOUNITARIO', 'PRECIOPUBLICO', 'PRECIO1']);
    rawPrecioIva = findValue(['PRECIOMASIVA', 'PRECIO+IVA', 'IVAINCLUIDO', 'PRECIOCONIVA', 'MASIVA']);
    rawPrecioDesc = findValue(['PRECIODESCUENTO', 'DESCUENTO', 'PRECIOMAYOREO', 'PRECIODISTRIBUIDOR']);
    raw114 = findValue(['114', 'FACTOR114', 'PRECIO114', '114IVA']);
    raw116 = findValue(['116', 'FACTOR116', 'PRECIO116', '116IVA']);
    raw12798 = findValue(['12798', 'FACTOR12798', 'PRECIO12798']);
    rawCosto = findValue(['COSTO', 'COSTOUNITARIO', 'PRECIOCOSTO', 'COSTOBASE']);
    categoria = findValue(['CATEGORIA', 'FAMILIA', 'GRUPO', 'LINEA']);
    ubicacion = findValue(['UBICACION', 'ALMACEN', 'RACK']);
    rawStock = findValue(['CANTIDAD', 'EXISTENCIA', 'EXISTENCIAS', 'STOCK', 'CANTIDADACTUAL', 'INVENTARIO']);
    rawMinStock = findValue(['MINSTOCK', 'STOCKMINIMO', 'MINIMO']);

    // Positional Fallback if headers were numeric, __EMPTY, or unmapped
    if (!sku && !descripcion) {
      const nonNullVals = keys
        .map(k => String(row[k] || '').trim())
        .filter(Boolean);
      
      if (nonNullVals.length >= 2) {
        sku = nonNullVals[0];
        descripcion = nonNullVals[1];
      } else if (nonNullVals.length === 1) {
        sku = `SKU-${idx + 1}`;
        descripcion = nonNullVals[0];
      }
    }
  }

  // Skip table header row if it was parsed as a data row
  const normSku = cleanKey(sku);
  const normDesc = cleanKey(descripcion);
  if (
    (normSku === 'codigo' || normSku === 'sku' || normSku === 'clave' || normSku === 'art') &&
    (normDesc === 'descripcion' || normDesc === 'producto' || normDesc === 'nombre' || normDesc === 'detalle')
  ) {
    return null;
  }

  // Reject completely empty rows
  if (!sku && !descripcion) return null;

  const finalSku = (sku || `SKU-${idx + 1}`).trim().toUpperCase();
  const finalDesc = descripcion || `Producto ${finalSku}`;

  const precio = parseNumberValue(rawPrecio, 100);
  const precioIva = rawPrecioIva ? parseNumberValue(rawPrecioIva) : Math.round(precio * 1.16 * 100) / 100;
  const precioDescuento = rawPrecioDesc ? parseNumberValue(rawPrecioDesc) : Math.round(precio * 0.90 * 100) / 100;
  const precio114 = raw114 ? parseNumberValue(raw114) : Math.round(precio * 1.14 * 100) / 100;
  const precio116 = raw116 ? parseNumberValue(raw116) : Math.round(precio * 1.16 * 100) / 100;
  const precio12798 = raw12798 ? parseNumberValue(raw12798) : Math.round(precio * 1.2798 * 100) / 100;
  const costo = rawCosto ? parseNumberValue(rawCosto) : Math.round(precio * 0.65 * 100) / 100;

  return {
    sku: finalSku,
    descripcion: finalDesc,
    medida: medida || 'Estándar',
    unidad: (unidad || 'RL').trim().toUpperCase(),
    precio,
    precioIva,
    precioDescuento,
    precio114,
    precio116,
    precio12798,
    costo,
    cantidadActual: rawStock ? parseNumberValue(rawStock) : 0,
    ubicacionAlmacen: ubicacion || 'Almacén Central',
    minStock: rawMinStock ? parseNumberValue(rawMinStock) : 0,
    categoria: categoria || 'General',
    updatedAt: new Date().toISOString(),
    updatedBy: updatedByLabel
  };
};
