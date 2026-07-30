import React, { useState } from 'react';
import { 
  Tag, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  FileText, 
  Download, 
  CheckCircle2, 
  Calendar, 
  Database, 
  Edit3, 
  Save, 
  X, 
  Grid, 
  Table, 
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PrecioListaItem, Product } from '../types';
import { GMDLogo } from './GMDHeaderLogo';

interface ListasPreciosViewProps {
  listasPrecios: PrecioListaItem[];
  products: Product[];
  onAddPrecioItem: (item: Omit<PrecioListaItem, 'id'>) => Promise<void>;
  onUpdatePrecioItem: (id: string, updates: Partial<PrecioListaItem>) => Promise<void>;
  onDeletePrecioItem: (id: string) => Promise<void>;
  onSyncFromCatalog: () => Promise<void>;
}

export const ListasPreciosView: React.FC<ListasPreciosViewProps> = ({
  listasPrecios,
  products,
  onAddPrecioItem,
  onUpdatePrecioItem,
  onDeletePrecioItem,
  onSyncFromCatalog
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'matrix' | 'cards'>('matrix');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PrecioListaItem | null>(null);

  // Persistence & File Metadata State
  const [fileNameLabel, setFileNameLabel] = useState<string>(() => {
    return localStorage.getItem('gmd_price_list_filename') || 'Lista_de_Precios_Oficial_GMD.xlsx';
  });
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [tempFileName, setTempFileName] = useState(fileNameLabel);

  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string>(() => {
    return localStorage.getItem('gmd_price_list_timestamp') || new Date().toLocaleString('es-MX');
  });

  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  // Form State
  const [formSku, setFormSku] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formMedida, setFormMedida] = useState('');
  const [formUnidad, setFormUnidad] = useState('RL');
  const [formPrecio, setFormPrecio] = useState<number>(0);
  const [formCosto, setFormCosto] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Price formatting helper rule:
  // Math.ceil rounding up to whole integer, thousands comma separator, ends with .00
  const formatPrecio = (val?: number): string => {
    if (val === undefined || val === null || isNaN(val)) return '0.00';
    const ceiled = Math.ceil(val);
    return ceiled.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Build 11-column matrix rows from products or listasPrecios
  const displayRows = React.useMemo(() => {
    if (products && products.length > 0) {
      return products.map(p => {
        const base = p.precio || 0;
        return {
          id: p.id || p.sku,
          codigo: p.sku,
          descripcion: p.descripcion,
          medida: p.medida || 'Estándar',
          unidad: p.unidad || 'PZA',
          precio: base,
          precioIva: p.precioIva || Math.ceil(base * 1.16),
          precioDescuento: p.precioDescuento || Math.ceil(base * 0.90),
          precio114: p.precio114 || Math.ceil(base * 1.14),
          precio116: p.precio116 || Math.ceil(base * 1.16),
          precio12798: p.precio12798 || Math.ceil(base * 1.2798),
          costo: p.costo || Math.ceil(base * 0.65)
        };
      });
    }

    // Fallback if only listasPrecios items exist
    const mapBySku = new Map<string, any>();
    listasPrecios.forEach(item => {
      const sku = item.sku || item.codigo || item.descripcion.slice(0, 15);
      if (!mapBySku.has(sku)) {
        mapBySku.set(sku, {
          id: item.id,
          codigo: sku,
          descripcion: item.descripcion,
          medida: item.medida || 'Estándar',
          unidad: item.unidad || 'RL',
          precio: item.precio || 0,
          precioIva: item.precioIva || Math.ceil((item.precio || 0) * 1.16),
          precioDescuento: item.precioDescuento || Math.ceil((item.precio || 0) * 0.90),
          precio114: item.precio114 || Math.ceil((item.precio || 0) * 1.14),
          precio116: item.precio116 || Math.ceil((item.precio || 0) * 1.16),
          precio12798: item.precio12798 || Math.ceil((item.precio || 0) * 1.2798),
          costo: item.costo || Math.ceil((item.precio || 0) * 0.65)
        });
      }
    });
    return Array.from(mapBySku.values());
  }, [products, listasPrecios]);

  // Filter rows based on search
  const filteredRows = displayRows.filter(row => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (row.codigo || '').toLowerCase().includes(term) ||
      (row.descripcion || '').toLowerCase().includes(term) ||
      (row.medida || '').toLowerCase().includes(term) ||
      (row.unidad || '').toLowerCase().includes(term)
    );
  });

  // Save filename label change
  const handleSaveFileName = () => {
    const trimmed = tempFileName.trim() || 'Lista_de_Precios_Oficial_GMD.xlsx';
    setFileNameLabel(trimmed);
    localStorage.setItem('gmd_price_list_filename', trimmed);
    setIsEditingFileName(false);
  };

  // Confirm manual save
  const handleConfirmSave = () => {
    const nowStr = new Date().toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    setLastSavedTimestamp(nowStr);
    localStorage.setItem('gmd_price_list_timestamp', nowStr);
    setSaveStatusMessage('¡Guardado Local Confirmado! Matriz de precios resguardada.');
    setTimeout(() => setSaveStatusMessage(null), 4000);
  };

  // Export 11-column Excel file
  const handleDownloadBackup = () => {
    try {
      const exportData = filteredRows.map(row => ({
        'Código': row.codigo,
        'Descripción': row.descripcion,
        'Medida': row.medida,
        'Unidad': row.unidad,
        'Precio': Math.ceil(row.precio),
        'Precio más IVA': Math.ceil(row.precioIva),
        'Precio descuento': Math.ceil(row.precioDescuento),
        '1.14': Math.ceil(row.precio114),
        '1.16': Math.ceil(row.precio116),
        '1.2798': Math.ceil(row.precio12798),
        'COSTO': Math.ceil(row.costo)
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Lista de Precios');

      const cleanName = fileNameLabel.endsWith('.xlsx') ? fileNameLabel : `${fileNameLabel}.xlsx`;
      XLSX.writeFile(workbook, cleanName);

      setSaveStatusMessage(`✨ Lista de precios exportada exitosamente en Excel: ${cleanName}`);
      setTimeout(() => setSaveStatusMessage(null), 4000);
    } catch (err) {
      console.error('Error al exportar Excel:', err);
      alert('Error al generar la lista de precios en Excel.');
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormSku('');
    setFormDesc('');
    setFormMedida('');
    setFormUnidad('RL');
    setFormPrecio(0);
    setFormCosto(0);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc || formPrecio < 0) return;

    setIsSubmitting(true);
    try {
      const base = formPrecio;
      await onAddPrecioItem({
        sku: formSku || `SKU-${Date.now()}`,
        codigo: formSku || `SKU-${Date.now()}`,
        descripcion: formDesc,
        medida: formMedida || 'Estándar',
        unidad: formUnidad || 'RL',
        precio: base,
        precioIva: Math.ceil(base * 1.16),
        precioDescuento: Math.ceil(base * 0.90),
        precio114: Math.ceil(base * 1.14),
        precio116: Math.ceil(base * 1.16),
        precio12798: Math.ceil(base * 1.2798),
        costo: formCosto || Math.ceil(base * 0.65),
        categoria: 'Precio Base',
        updatedAt: new Date().toISOString()
      });
      handleConfirmSave();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSyncFromCatalog();
      handleConfirmSave();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {saveStatusMessage && (
        <div className="bg-emerald-600 text-white p-3 px-4 rounded-xl shadow-lg font-bold text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <span>{saveStatusMessage}</span>
          </div>
          <button onClick={() => setSaveStatusMessage(null)} className="text-emerald-200 hover:text-white font-black text-sm cursor-pointer">✕</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-800 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30 shrink-0">
            <Tag className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <GMDLogo variant="dark" size="sm" showSubtitle={false} />
            <h1 className="text-xl sm:text-2xl font-black text-white">Lista de Precios Oficial (11 Columnas)</h1>
            <p className="text-slate-300 text-xs mt-0.5">
              Matriz completa con Código, Descripción, Medida, Unidad y las 7 categorías de precio (Precio, IVA, Descuento, 1.14, 1.16, 1.2798 y Costo).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle (Mobile / Matrix) */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 shrink-0">
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'matrix' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Vista de Tabla Matriz Completa"
            >
              <Table className="w-4 h-4" />
              <span className="hidden sm:inline">Tabla Matriz</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
              title="Vista Móvil de Tarjetas Táctiles"
            >
              <Grid className="w-4 h-4" />
              <span>Vista Móvil</span>
            </button>
          </div>

          {/* Confirm Save */}
          <button
            onClick={handleConfirmSave}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span className="hidden sm:inline">Confirmar Guardado</span>
          </button>

          {/* Download Excel */}
          <button
            onClick={handleDownloadBackup}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow transition-all cursor-pointer"
            title="Descargar archivo Excel con las 11 columnas"
          >
            <Download className="w-4 h-4 text-blue-200" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* Sync */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>

          {/* Add Price */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center space-x-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Item</span>
          </button>
        </div>
      </div>

      {/* Metadata Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-cyan-600" />
              <span>Archivo de Origen</span>
            </span>
            {!isEditingFileName && (
              <button
                onClick={() => {
                  setTempFileName(fileNameLabel);
                  setIsEditingFileName(true);
                }}
                className="text-slate-400 hover:text-cyan-600 p-0.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="mt-1.5">
            {isEditingFileName ? (
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={tempFileName}
                  onChange={(e) => setTempFileName(e.target.value)}
                  className="w-full text-xs font-bold px-2 py-1 border border-cyan-400 rounded-lg focus:ring-1 focus:ring-cyan-500 bg-cyan-50/50"
                />
                <button onClick={handleSaveFileName} className="bg-cyan-600 text-white p-1 rounded-lg text-xs font-bold cursor-pointer">
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="text-xs font-black text-slate-900 truncate" title={fileNameLabel}>
                {fileNameLabel}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Estado de Guardado</span>
          </div>
          <div className="mt-1.5 flex items-center space-x-1.5">
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-900 rounded-full text-xs font-black border border-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Guardado Confirmado</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Última Confirmación</span>
          </div>
          <div className="mt-1.5 text-xs font-bold text-slate-800">
            {lastSavedTimestamp}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
            <Database className="w-3.5 h-3.5 text-purple-600" />
            <span>Artículos en Lista</span>
          </div>
          <div className="mt-1.5 text-xs font-black text-purple-900 flex items-center space-x-1">
            <span className="text-base">{filteredRows.length}</span>
            <span className="text-slate-500 font-semibold text-[11px]">de {displayRows.length} artículos</span>
          </div>
        </div>
      </div>

      {/* Quick Search & SKU Chips */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96 flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por código, descripción, medida o unidad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-500 mr-1">Filtro SKU:</span>
            {[
              { label: 'Todos', code: '' },
              { label: 'PA', code: 'PA' },
              { label: 'PH', code: 'PH' },
              { label: 'BP', code: 'BP' },
              { label: 'DTF', code: 'DTF' },
              { label: 'GV', code: 'GV' },
              { label: 'CV', code: 'CV' },
              { label: 'ART', code: 'ART' },
              { label: 'KE', code: 'KE' }
            ].map(chip => (
              <button
                key={chip.label}
                type="button"
                onClick={() => setSearchTerm(chip.code)}
                className={`px-2.5 py-1 min-h-[36px] rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  searchTerm === chip.code && chip.code !== ''
                    ? 'bg-cyan-600 text-white border-cyan-500'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-cyan-50'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MATRIX VIEW (11 COLUMNS) */}
      {viewMode === 'matrix' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap min-w-[1200px]">
              <thead className="bg-slate-900 text-slate-200 uppercase text-[10px] font-extrabold sticky top-0 z-10">
                <tr>
                  <th className="py-3.5 px-3 bg-slate-900 text-cyan-400 sticky left-0 z-20 shadow-md">Código</th>
                  <th className="py-3.5 px-4 min-w-[280px]">Descripción</th>
                  <th className="py-3.5 px-3 text-center">Medida</th>
                  <th className="py-3.5 px-3 text-center">Unidad</th>
                  <th className="py-3.5 px-3 text-right bg-cyan-950/80 text-cyan-300 border-l border-cyan-800/40">Precio</th>
                  <th className="py-3.5 px-3 text-right bg-blue-950/80 text-blue-300">Precio + IVA</th>
                  <th className="py-3.5 px-3 text-right bg-emerald-950/80 text-emerald-300">Precio Desc</th>
                  <th className="py-3.5 px-3 text-right bg-slate-800/90 text-purple-300">1.14</th>
                  <th className="py-3.5 px-3 text-right bg-slate-800/90 text-purple-300">1.16</th>
                  <th className="py-3.5 px-3 text-right bg-slate-800/90 text-purple-300">1.2798</th>
                  <th className="py-3.5 px-3 text-right bg-amber-950/80 text-amber-300 border-r border-amber-800/40">COSTO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-slate-400">
                      No se encontraron productos en la lista de precios. Realice una búsqueda o presione "Sincronizar".
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-cyan-50/40 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3 font-black text-cyan-700 dark:text-cyan-400 sticky left-0 z-10 bg-white dark:bg-slate-900 shadow-sm border-r border-slate-100 dark:border-slate-800">
                        {row.codigo}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white max-w-[320px] truncate" title={row.descripcion}>
                        {row.descripcion}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {row.medida}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-black text-[10px]">
                          {row.unidad}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-cyan-900 dark:text-cyan-300 bg-cyan-50/20 dark:bg-cyan-950/10">
                        ${formatPrecio(row.precio)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-blue-900 dark:text-blue-300 bg-blue-50/20 dark:bg-blue-950/10">
                        ${formatPrecio(row.precioIva)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10">
                        ${formatPrecio(row.precioDescuento)}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-800 dark:text-slate-300">
                        ${formatPrecio(row.precio114)}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-800 dark:text-slate-300">
                        ${formatPrecio(row.precio116)}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-800 dark:text-slate-300">
                        ${formatPrecio(row.precio12798)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-amber-900 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10">
                        ${formatPrecio(row.costo)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MOBILE CARDS VIEW */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRows.length === 0 ? (
            <div className="col-span-full bg-white p-8 rounded-2xl text-center text-slate-400 font-bold border border-slate-200">
              No hay productos coincidentes.
            </div>
          ) : (
            filteredRows.map((row, idx) => {
              const isExpanded = expandedCardId === row.id;
              return (
                <div 
                  key={row.id || idx}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <span className="px-3 py-1 bg-cyan-900 text-cyan-200 rounded-xl text-xs font-black tracking-wide">
                      {row.codigo}
                    </span>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                        {row.medida}
                      </span>
                      <span className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400">
                        {row.unidad}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <h3 className="text-xs font-black text-slate-900 dark:text-white leading-relaxed">
                    {row.descripcion}
                  </h3>

                  {/* Highlighted Key Prices */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-cyan-50 dark:bg-cyan-950/40 p-2.5 rounded-xl border border-cyan-200 dark:border-cyan-800/40">
                      <div className="text-[10px] font-extrabold uppercase text-cyan-800 dark:text-cyan-300">
                        Precio Base
                      </div>
                      <div className="text-sm font-black text-cyan-950 dark:text-cyan-200">
                        ${formatPrecio(row.precio)}
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800/40">
                      <div className="text-[10px] font-extrabold uppercase text-blue-800 dark:text-blue-300">
                        Precio + IVA
                      </div>
                      <div className="text-sm font-black text-blue-950 dark:text-blue-200">
                        ${formatPrecio(row.precioIva)}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Card Details Button */}
                  <button
                    onClick={() => setExpandedCardId(isExpanded ? null : row.id)}
                    className="w-full min-h-[44px] py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                  >
                    <span>{isExpanded ? 'Ocultar Desglose de Precios' : 'Ver 7 Categorías de Precio'}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {/* Full 7 Category Price Breakdown */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs animate-fadeIn">
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800/30">
                        <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 block">Precio Descuento</span>
                        <span className="font-black text-emerald-950 dark:text-emerald-200">${formatPrecio(row.precioDescuento)}</span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 block">Factor 1.14</span>
                        <span className="font-bold text-slate-900 dark:text-white">${formatPrecio(row.precio114)}</span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 block">Factor 1.16</span>
                        <span className="font-bold text-slate-900 dark:text-white">${formatPrecio(row.precio116)}</span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 block">Factor 1.2798</span>
                        <span className="font-bold text-slate-900 dark:text-white">${formatPrecio(row.precio12798)}</span>
                      </div>

                      <div className="col-span-2 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-800/30 flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase text-amber-800 dark:text-amber-300">COSTO</span>
                        <span className="font-black text-amber-950 dark:text-amber-200">${formatPrecio(row.costo)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Agregar Item */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-base">
                <Tag className="w-5 h-5 text-cyan-600" />
                <span>Agregar Artículo a Lista de Precios</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Código (SKU) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. AL690"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Descripción del Producto / Material *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Descripción completa..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Medida</label>
                  <input
                    type="text"
                    placeholder="Ej. 0.91 x 30 m"
                    value={formMedida}
                    onChange={(e) => setFormMedida(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Unidad</label>
                  <input
                    type="text"
                    placeholder="Ej. RL, PAQ, m²"
                    value={formUnidad}
                    onChange={(e) => setFormUnidad(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Precio Base ($ MXN) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formPrecio}
                    onChange={(e) => setFormPrecio(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Costo ($ MXN)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formCosto}
                    onChange={(e) => setFormCosto(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Artículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
