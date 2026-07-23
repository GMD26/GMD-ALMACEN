import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Database, 
  Layers, 
  Sparkles,
  Clipboard,
  RefreshCw
} from 'lucide-react';
import Papa from 'papaparse';
import { Product } from '../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkImport: (products: Omit<Product, 'id'>[], replaceExisting: boolean) => Promise<void>;
  existingProductCount: number;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onBulkImport,
  existingProductCount
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [rawText, setRawText] = useState('');
  const [parsedProducts, setParsedProducts] = useState<Omit<Product, 'id'>[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [forceZeroStock, setForceZeroStock] = useState(true);

  if (!isOpen) return null;

  // Function to process row object into Product model
  const normalizeRowToProduct = (row: Record<string, any>, idx: number): Omit<Product, 'id'> | null => {
    // Find keys matching SKU, Desc, etc.
    const keys = Object.keys(row);
    const findValue = (possibleNames: string[]) => {
      const match = keys.find(k => possibleNames.includes(k.trim().toUpperCase()));
      return match ? String(row[match]).trim() : '';
    };

    const sku = findValue(['SKU', 'CLAVE', 'CODIGO', 'CÓDIGO', 'ID', 'NO.']);
    const descripcion = findValue(['DESCRIPCION', 'DESCRIPCIÓN', 'PRODUCTO', 'NOMBRE', 'DETALLE', 'CONCEPTO']);
    
    if (!sku && !descripcion) return null; // skip empty rows

    const finalSku = sku || `SKU-${idx + 1}`;
    const finalDesc = descripcion || `Producto ${finalSku}`;
    const medida = findValue(['MEDIDA', 'MEDIDAS', 'TAMANO', 'TAMAÑO', 'PRESENTACION', 'PRESENTACIÓN']) || 'Estándar';
    const unidad = findValue(['UNIDAD', 'UM', 'U.M.', 'MEDIDA_UNIDAD']) || 'PZA';
    const categoria = findValue(['CATEGORIA', 'CATEGORÍA', 'FAMILIA', 'GRUPO', 'LINEA', 'LÍNEA']) || 'General';
    const ubicacion = findValue(['UBICACION', 'UBICACIÓN', 'ALMACEN', 'ALMACÉN', 'RACK', 'UBICACION_ALMACEN']) || 'Almacén Central';

    const parseNum = (val: string, fallback = 0) => {
      const num = parseFloat(val.replace(/[^0-9.-]+/g, ''));
      return isNaN(num) ? fallback : num;
    };

    const precio = parseNum(findValue(['PRECIO', 'PRECIO UNITARIO', 'PRECIO_UNITARIO', 'P.U.', 'PVP', 'PRECIO VENTA']), 100);
    const costo = parseNum(findValue(['COSTO', 'COSTO UNITARIO', 'COSTO_UNITARIO', 'PRECIO COSTO']), Math.round(precio * 0.65));
    const precioIva = Math.round(precio * 1.16 * 100) / 100;

    const rawStock = parseNum(findValue(['CANTIDAD', 'STOCK', 'EXISTENCIA', 'CANTIDAD_ACTUAL', 'CANTIDAD ACTUAL']), 0);
    const rawMinStock = parseNum(findValue(['MIN', 'STOCK MINIMO', 'STOCK MÍNIMO', 'MINIMO', 'MIN_STOCK']), 0);

    return {
      sku: finalSku.toUpperCase(),
      descripcion: finalDesc,
      medida,
      unidad: unidad.toUpperCase(),
      precio,
      precioIva,
      costo,
      cantidadActual: forceZeroStock ? 0 : rawStock,
      ubicacionAlmacen: ubicacion,
      minStock: forceZeroStock ? 0 : rawMinStock,
      categoria,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Importación Masiva'
    };
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);
    setParseErrors([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        setIsLoading(false);
        const products: Omit<Product, 'id'>[] = [];
        const errors: string[] = [];

        results.data.forEach((row: any, idx: number) => {
          const prod = normalizeRowToProduct(row, idx);
          if (prod) {
            products.push(prod);
          } else {
            errors.push(`Línea ${idx + 2}: Registro incompleto omitido.`);
          }
        });

        setParsedProducts(products);
        setParseErrors(errors);
      },
      error: (err) => {
        setIsLoading(false);
        setParseErrors([`Error al leer el archivo: ${err.message}`]);
      }
    });
  };

  // Handle Paste Text
  const handleProcessPastedText = () => {
    if (!rawText.trim()) return;

    setIsLoading(true);
    setParseErrors([]);

    Papa.parse(rawText.trim(), {
      header: true,
      delimiter: '', // auto-detect tab or comma
      skipEmptyLines: true,
      complete: (results) => {
        setIsLoading(false);
        const products: Omit<Product, 'id'>[] = [];
        const errors: string[] = [];

        results.data.forEach((row: any, idx: number) => {
          const prod = normalizeRowToProduct(row, idx);
          if (prod) {
            products.push(prod);
          } else {
            errors.push(`Línea ${idx + 1}: Fila no reconocida.`);
          }
        });

        setParsedProducts(products);
        setParseErrors(errors);
      }
    });
  };

  // Download Sample Template CSV
  const handleDownloadTemplate = () => {
    const csvContent = [
      'SKU,DESCRIPCION,MEDIDA,UNIDAD,CATEGORIA,PRECIO,COSTO,UBICACION,CANTIDAD_ACTUAL,MIN_STOCK',
      'DTF01,PELICULA DE IMPRESION DTF 30CM X 100M,30CM X 100M,ROLLO,CONSUMIBLES DTF,1850.00,1200.00,ALMACEN CENTRAL A1,0,0',
      'BP400,PAPEL BOND 40KG 90G 91.4CM X 100M,91.4CM X 100M,ROLLO,PAPELES Y BOND,850.00,550.00,ESTANTE B2,0,0',
      'VIN05,VINIL ADHESIVO BLANCO BRILLANTE 1.52M X 50M,1.52M X 50M,ROLLO,VINILES DE IMPRESION,2450.00,1600.00,RACK C1,0,0',
      'TIN01,TINTA DTF CYAN 1 LITRO,1 LITRO,LTR,TINTAS Y LUBRICANTES,950.00,600.00,GABINETE T1,0,0'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Plantilla_Catalogo_GrupoMasDigital.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Execute Import
  const handleConfirmImport = async () => {
    if (parsedProducts.length === 0) return;
    setIsLoading(true);
    try {
      // Re-apply zero stock if checked
      const finalProducts = parsedProducts.map(p => ({
        ...p,
        cantidadActual: forceZeroStock ? 0 : p.cantidadActual,
        minStock: forceZeroStock ? 0 : p.minStock
      }));

      await onBulkImport(finalProducts, replaceExisting);
      setIsLoading(false);
      onClose();
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      alert('Ocurrió un error al importar los productos. Revisa la consola o intenta de nuevo.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-extrabold text-white">Importación Masiva de Catálogo</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                  Excel / CSV
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Carga la lista completa de productos (ej. los 613 registros) en una sola operación.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Method Selector & Template Download */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="inline-flex rounded-lg bg-slate-200 p-1 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'upload' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Cargar Archivo (.csv / .xlsx)</span>
              </button>
              <button
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'paste' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Copiar y Pegar desde Excel</span>
              </button>
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="flex items-center justify-center space-x-1.5 text-xs font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Plantilla CSV</span>
            </button>
          </div>

          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-slate-300 hover:border-cyan-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-cyan-50/20 transition-all text-center">
                <Upload className="w-10 h-10 text-cyan-600 mb-2" />
                <span className="font-bold text-sm text-slate-800">
                  Haz clic para seleccionar o arrastra tu archivo aquí
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  Formatos compatibles: .CSV, .TSV, .TXT
                </span>
                <input
                  type="file"
                  accept=".csv, .tsv, .txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {fileName && (
                <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl font-medium">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Archivo cargado: <strong>{fileName}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PASTE TEXT */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Abre tu archivo de Excel o Google Sheets con los 613 productos, selecciona todas las celdas (incluyendo encabezados), presiona <strong>Ctrl+C</strong> y pégalas aquí abajo (<strong>Ctrl+V</strong>):
              </p>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={6}
                placeholder="SKU	DESCRIPCION	MEDIDA	UNIDAD	CATEGORIA	PRECIO	COSTO	UBICACION&#10;DTF01	PELICULA DTF 30CM	30CM X 100M	ROLLO	CONSUMIBLES	1850	1200	A1&#10;BP400	PAPEL BOND 90G	91.4CM X 100M	ROLLO	PAPELES	850	550	B2"
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-slate-50"
              />
              <button
                onClick={handleProcessPastedText}
                disabled={!rawText.trim() || isLoading}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                Procesar Texto Pegado
              </button>
            </div>
          )}

          {/* PARSED PREVIEW SECTION */}
          {parsedProducts.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              
              {/* Summary Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-500 text-white">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-emerald-950 text-sm">
                      {parsedProducts.length} Productos Listos para Importar
                    </h4>
                    <p className="text-xs text-emerald-700">
                      Verifica la vista previa antes de guardar en el catálogo.
                    </p>
                  </div>
                </div>

                {/* Force Zero Stock Option */}
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 bg-white px-3 py-2 rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceZeroStock}
                    onChange={(e) => setForceZeroStock(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>Establecer Stock Actual y Mínimo en 0</span>
                </label>
              </div>

              {/* Replace existing checkbox option */}
              {existingProductCount > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-slate-700">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Actualmente hay <strong>{existingProductCount} productos</strong> en el sistema.</span>
                  </div>
                  <label className="flex items-center space-x-2 font-bold text-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replaceExisting}
                      onChange={(e) => setReplaceExisting(e.target.checked)}
                      className="rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    <span>Reemplazar catálogo actual por estos {parsedProducts.length}</span>
                  </label>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">SKU</th>
                      <th className="p-2.5">Descripción</th>
                      <th className="p-2.5">Categoría</th>
                      <th className="p-2.5">Medida</th>
                      <th className="p-2.5">Precio</th>
                      <th className="p-2.5">Ubicación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedProducts.slice(0, 50).map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-extrabold text-slate-900">{p.sku}</td>
                        <td className="p-2.5 text-slate-700 max-w-xs truncate">{p.descripcion}</td>
                        <td className="p-2.5 text-slate-600">{p.categoria}</td>
                        <td className="p-2.5 text-slate-500">{p.medida} ({p.unidad})</td>
                        <td className="p-2.5 font-bold text-emerald-600">${p.precio.toLocaleString('es-MX')}</td>
                        <td className="p-2.5 text-slate-500">{p.ubicacionAlmacen}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedProducts.length > 50 && (
                  <div className="p-2.5 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-200 font-medium">
                    ... y {parsedProducts.length - 50} productos más.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Parse Errors List if any */}
          {parseErrors.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
              <span className="font-bold block">Notas de importación:</span>
              <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto">
                {parseErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {parsedProducts.length > 0 ? `${parsedProducts.length} productos listos para importación masiva.` : 'Esperando archivo o texto para procesar.'}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={parsedProducts.length === 0 || isLoading}
              className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              <span>{isLoading ? 'Guardando...' : `Importar ${parsedProducts.length} Productos`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
