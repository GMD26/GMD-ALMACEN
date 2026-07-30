import { Product } from '../types';

export const parseNumberValue = (val: any, fallback = 0): number => {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (!val) return fallback;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
};

export const normalizeRowToProduct = (
  row: Record<string, any>, 
  idx: number,
  updatedByLabel = 'Carga Excel/CSV'
): Omit<Product, 'id'> | null => {
  if (!row || typeof row !== 'object') return null;

  const keys = Object.keys(row);

  const findValue = (possibleNames: string[]) => {
    const match = keys.find(k => {
      const cleanKey = k.trim().toUpperCase();
      return possibleNames.some(name => cleanKey === name.toUpperCase());
    });
    return match !== undefined && row[match] !== null && row[match] !== undefined 
      ? String(row[match]).trim() 
      : '';
  };

  // 1. SKU / Código
  const sku = findValue(['CÓDIGO', 'CODIGO', 'SKU', 'CLAVE', 'ID', 'NO.']);
  
  // 2. Descripción
  const descripcion = findValue(['DESCRIPCIÓN', 'DESCRIPCION', 'PRODUCTO', 'NOMBRE', 'DETALLE', 'CONCEPTO']);

  if (!sku && !descripcion) return null;

  const finalSku = (sku || `SKU-${idx + 1}`).toUpperCase();
  const finalDesc = descripcion || `Producto ${finalSku}`;

  // 3. Medida
  const medida = findValue(['MEDIDA', 'MEDIDAS', 'TAMAÑO', 'TAMANO', 'PRESENTACIÓN', 'PRESENTACION']) || 'Estándar';

  // 4. Unidad
  const unidad = (findValue(['UNIDAD', 'UM', 'U.M.', 'MEDIDA_UNIDAD']) || 'RL').toUpperCase();

  // 5. Precio Base (Public)
  const rawPrecio = findValue(['PRECIO', 'PRECIO BASE', 'PVP', 'PRECIO VENTA', 'PRECIO UNITARIO']);
  const precio = parseNumberValue(rawPrecio, 100);

  // 6. Precio más IVA (1.16 of base if not provided)
  const rawPrecioIva = findValue(['PRECIO MÁS IVA', 'PRECIO MAS IVA', 'PRECIO+IVA', 'IVA INCLUIDO', 'PRECIO CON IVA']);
  const precioIva = rawPrecioIva ? parseNumberValue(rawPrecioIva) : Math.round(precio * 1.16 * 100) / 100;

  // 7. Precio Descuento (0.90 of base if not provided)
  const rawPrecioDesc = findValue(['PRECIO DESCUENTO', 'DESCUENTO', 'P. DESCUENTO']);
  const precioDescuento = rawPrecioDesc ? parseNumberValue(rawPrecioDesc) : Math.round(precio * 0.90 * 100) / 100;

  // 8. Factor 1.14
  const raw114 = findValue(['1.14', 'FACTOR 1.14', 'PRECIO 1.14', '1,14']);
  const precio114 = raw114 ? parseNumberValue(raw114) : Math.round(precio * 1.14 * 100) / 100;

  // 9. Factor 1.16
  const raw116 = findValue(['1.16', 'FACTOR 1.16', 'PRECIO 1.16', '1,16']);
  const precio116 = raw116 ? parseNumberValue(raw116) : Math.round(precio * 1.16 * 100) / 100;

  // 10. Factor 1.2798
  const raw12798 = findValue(['1.2798', 'FACTOR 1.2798', 'PRECIO 1.2798', '1,2798']);
  const precio12798 = raw12798 ? parseNumberValue(raw12798) : Math.round(precio * 1.2798 * 100) / 100;

  // 11. COSTO
  const rawCosto = findValue(['COSTO', 'COSTO UNITARIO', 'PRECIO COSTO', 'P. COSTO']);
  const costo = rawCosto ? parseNumberValue(rawCosto) : Math.round(precio * 0.65 * 100) / 100;

  // Categoría & Almacén
  const categoria = findValue(['CATEGORIA', 'CATEGORÍA', 'FAMILIA', 'GRUPO', 'LINEA', 'LÍNEA']) || 'General';
  const ubicacion = findValue(['UBICACION', 'UBICACIÓN', 'ALMACEN', 'ALMACÉN', 'RACK', 'UBICACION_ALMACEN']) || 'Almacén Central';

  return {
    sku: finalSku,
    descripcion: finalDesc,
    medida,
    unidad,
    precio,
    precioIva,
    precioDescuento,
    precio114,
    precio116,
    precio12798,
    costo,
    cantidadActual: 0,
    ubicacionAlmacen: ubicacion,
    minStock: 0,
    categoria,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedByLabel
  };
};
