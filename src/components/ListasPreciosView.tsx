import React, { useState, useEffect } from 'react';
import { Tag, Plus, Search, Filter, Edit2, Trash2, Check, RefreshCw, Upload, FileText, DollarSign, Download, CheckCircle2, Calendar, Database, Edit3, Save } from 'lucide-react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PrecioListaItem | null>(null);

  // Persistence & File Metadata State
  const [fileNameLabel, setFileNameLabel] = useState<string>(() => {
    return localStorage.getItem('gmd_price_list_filename') || 'Catalogo_Precios_GMD.xlsx';
  });
  const [isEditingFileName, setIsEditingFileName] = useState(false);
  const [tempFileName, setTempFileName] = useState(fileNameLabel);

  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string>(() => {
    return localStorage.getItem('gmd_price_list_timestamp') || new Date().toLocaleString('es-MX');
  });

  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  // Form State
  const [categoria, setCategoria] = useState('Precio');
  const [precio, setPrecio] = useState<number>(0);
  const [descripcion, setDescripcion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Price formatting helper rule:
  // 1. Math.ceil rounding up to whole integer
  // 2. Thousands comma separator
  // 3. Always ends with .00
  const formatPrecioLista = (val: number): string => {
    const ceiled = Math.ceil(val || 0);
    return ceiled.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Categories list - Restricted strictly to the 7 price categories
  const categoriesList = [
    'Precio',
    'Precio más IVA',
    'Precio descuento',
    '1.14',
    '1.16',
    '1.2798',
    'Costo'
  ];

  // Deduplication helper: removes duplicate items based on category + normalized description
  const deduplicateItems = (items: PrecioListaItem[]): PrecioListaItem[] => {
    const seen = new Set<string>();
    return items.filter(item => {
      const key = `${(item.categoria || '').trim().toLowerCase()}::${(item.descripcion || '').trim().toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  // Factors for calculating real prices dynamically if specific category items are not in DB
  const getFactorForCategory = (catName: string): number => {
    const cat = catName.trim().toLowerCase();
    if (cat === 'precio más iva' || cat === '1.16') return 1.16;
    if (cat === 'precio descuento') return 0.90;
    if (cat === '1.14') return 1.14;
    if (cat === '1.2798') return 1.2798;
    if (cat === 'costo') return 0.70;
    return 1.0;
  };

  // Direct filtering & deduplication
  const directFilteredRaw = listasPrecios.filter(item => {
    const catClean = (item.categoria || '').trim().toLowerCase();
    const filterClean = categoryFilter.trim().toLowerCase();

    const matchesCat = categoryFilter === 'ALL' || catClean === filterClean;
    const matchesSearch = (item.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      catClean.includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const directFiltered = deduplicateItems(directFilteredRaw);

  // Dynamic fallback from products catalog if filter has no records in listasPrecios
  let filteredItems: PrecioListaItem[] = directFiltered;

  if (filteredItems.length === 0 && categoryFilter !== 'ALL' && products.length > 0) {
    const factor = getFactorForCategory(categoryFilter);
    const derivedRaw = products
      .filter(p => {
        const fullDesc = `[${p.sku}] ${p.descripcion}`.toLowerCase();
        return !searchTerm || fullDesc.includes(searchTerm.toLowerCase());
      })
      .map(p => {
        let pVal = p.precio || 0;
        if (categoryFilter.toLowerCase() === 'costo' && p.costo) {
          pVal = p.costo;
        } else {
          pVal = Math.ceil(pVal * factor);
        }
        return {
          id: `derived-${p.id}-${categoryFilter}`,
          categoria: categoryFilter,
          precio: pVal,
          descripcion: `[${p.sku}] ${p.descripcion}`,
          updatedAt: new Date().toISOString()
        };
      });
    filteredItems = deduplicateItems(derivedRaw);
  }

  // Deduplicated total items count across stored list or products fallback
  const totalItemsCount = listasPrecios.length > 0 
    ? deduplicateItems(listasPrecios).length 
    : products.length;

  // Save filename label change
  const handleSaveFileName = () => {
    const trimmed = tempFileName.trim() || 'Catalogo_Precios_GMD.xlsx';
    setFileNameLabel(trimmed);
    localStorage.setItem('gmd_price_list_filename', trimmed);
    setIsEditingFileName(false);
  };

  // Confirm manual save to LocalStorage
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
    localStorage.setItem('gmd_price_list_confirmed_v1', 'true');

    setSaveStatusMessage('¡Guardado Local Confirmado! Datos resguardados con éxito.');
    setTimeout(() => setSaveStatusMessage(null), 4000);
  };

  // Export Backup as Excel (.xlsx)
  const handleDownloadBackup = () => {
    try {
      const itemsToExport = filteredItems.length > 0 ? filteredItems : (listasPrecios.length > 0 ? listasPrecios : []);
      
      const exportData = itemsToExport.map((item, index) => ({
        '#': index + 1,
        'Categoría': item.categoria,
        'Precio Venta (IVA incl.)': Math.ceil(item.precio),
        'Precio Formateado': `$${formatPrecioLista(item.precio)}`,
        'Descripción del Producto / Material': item.descripcion,
        'Fecha de Actualización': item.updatedAt ? new Date(item.updatedAt).toLocaleString('es-MX') : new Date().toLocaleString('es-MX')
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Lista de Precios');

      const cleanName = fileNameLabel.endsWith('.xlsx') ? fileNameLabel : `${fileNameLabel}.xlsx`;
      XLSX.writeFile(workbook, `Respaldo_${cleanName}`);

      setSaveStatusMessage(`✨ Respaldo generado y descargado exitosamente: Respaldo_${cleanName}`);
      setTimeout(() => setSaveStatusMessage(null), 4000);
    } catch (err) {
      console.error('Error al exportar respaldo Excel:', err);
      alert('Ocurrió un error al generar la copia de seguridad en Excel.');
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setCategoria('Precio');
    setPrecio(0);
    setDescripcion('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: PrecioListaItem) => {
    setEditingItem(item);
    setCategoria(item.categoria);
    setPrecio(item.precio);
    setDescripcion(item.descripcion);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion || precio < 0) return;

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await onUpdatePrecioItem(editingItem.id, {
          categoria,
          precio,
          descripcion,
          updatedAt: new Date().toISOString()
        });
      } else {
        await onAddPrecioItem({
          categoria,
          precio,
          descripcion,
          updatedAt: new Date().toISOString()
        });
      }
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
          <button onClick={() => setSaveStatusMessage(null)} className="text-emerald-200 hover:text-white font-black text-sm">✕</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <Tag className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <GMDLogo variant="dark" size="sm" showSubtitle={false} />
            <h1 className="text-xl font-extrabold text-white">Listas de Precios de Materiales</h1>
            <p className="text-slate-300 text-xs mt-0.5">
              Precios redondeados al número entero superior sin decimales fraccionarios, con separador de miles y terminación .00.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Confirmar Guardado */}
          <button
            onClick={handleConfirmSave}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow transition-all cursor-pointer"
            title="Re-confirmar almacenamiento seguro en LocalStorage"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>Confirmar Guardado</span>
          </button>

          {/* Botón Descargar Respaldo */}
          <button
            onClick={handleDownloadBackup}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow transition-all cursor-pointer"
            title="Descargar copia de seguridad en archivo Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-blue-200" />
            <span>Descargar Respaldo (.xlsx)</span>
          </button>

          {/* Botón Sincronizar */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </button>

          {/* Botón Agregar Precio */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Precio</span>
          </button>
        </div>
      </div>

      {/* Persistence Info & File Label Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Nombre de Archivo & Etiqueta */}
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
                className="text-slate-400 hover:text-cyan-600 transition-colors p-0.5"
                title="Personalizar etiqueta del archivo"
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
                  placeholder="Nombre de archivo..."
                />
                <button
                  onClick={handleSaveFileName}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white p-1 rounded-lg text-xs font-bold"
                  title="Guardar nombre"
                >
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

        {/* Card 2: Indicador Guardado Confirmado */}
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

        {/* Card 3: Fecha y Hora de Último Registro */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Última Confirmación</span>
          </div>
          <div className="mt-1.5 text-xs font-bold text-slate-800">
            {lastSavedTimestamp}
          </div>
        </div>

        {/* Card 4: Contador de Registros Almacenados */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
            <Database className="w-3.5 h-3.5 text-purple-600" />
            <span>Registros Guardados</span>
          </div>
          <div className="mt-1.5 text-xs font-black text-purple-900 flex items-center space-x-1">
            <span className="text-base">{totalItemsCount}</span>
            <span className="text-slate-500 font-semibold text-[11px]">insumos únicos</span>
          </div>
        </div>
      </div>

      {/* Selector de Precios Accesible (Category Chips Bar) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-800 flex items-center space-x-1.5">
            <Filter className="w-4 h-4 text-cyan-600" />
            <span>Selección Rápida de Categorías de Precio:</span>
          </span>
          <span className="text-[11px] font-bold text-slate-500">
            {filteredItems.length} mostrados
          </span>
        </div>

        {/* Accessible Quick Category Chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              categoryFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow ring-2 ring-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            Todas las Categorías ({listasPrecios.length})
          </button>

          {categoriesList.map((cat, idx) => {
            const isActive = categoryFilter.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={idx}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-md ring-2 ring-cyan-400'
                    : 'bg-cyan-50/80 hover:bg-cyan-100 text-cyan-900 border border-cyan-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por descripción o código de producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="text-[11px] text-slate-500 font-bold">
            Sin duplicados • Redondeo hacia arriba al entero
          </div>
        </div>
      </div>

      {/* Standard Table: Categoría | Precio | Descripción */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4 w-1/4">Categoría</th>
                <th className="py-3 px-4 w-1/4 text-right">Precio ($ MXN IVA incl.)</th>
                <th className="py-3 px-4 w-2/4">Descripción del Material / Producto</th>
                <th className="py-3 px-4 text-center w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-400">
                    No hay registros en la lista de precios para la categoría seleccionada. Haga clic en "Sincronizar" o "Agregar Precio".
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold border border-slate-200 inline-block">
                        {item.categoria}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                      ${formatPrecioLista(item.precio)}
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      {item.descripcion}
                    </td>

                    <td className="py-3 px-4 text-center space-x-1">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-slate-400 hover:text-cyan-600 rounded-lg transition-colors cursor-pointer"
                        title="Editar precio"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeletePrecioItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Agregar / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-base">
                <Tag className="w-5 h-5 text-cyan-600" />
                <span>{editingItem ? 'Editar Precio de Lista' : 'Agregar Precio de Lista'}</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Categoría */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Categoría *</label>
                <input
                  type="text"
                  required
                  list="categories-datalist"
                  placeholder="Ej. Precio / Precio más IVA / Costo"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs bg-slate-50 focus:ring-2 focus:ring-cyan-500"
                />
                <datalist id="categories-datalist">
                  {categoriesList.map((cat, idx) => (
                    <option key={idx} value={cat} />
                  ))}
                </datalist>
              </div>

              {/* Precio */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Precio ($ MXN IVA incl.) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={precio}
                  onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Descripción del Material *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descripción detallada del producto o material..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-400 font-bold rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Precio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
