import React, { useState } from 'react';
import { Tag, Plus, Search, Filter, Edit2, Trash2, Check, RefreshCw, Upload, FileText, DollarSign } from 'lucide-react';
import { PrecioListaItem, Product } from '../types';

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

  // Form State
  const [categoria, setCategoria] = useState('Precio');
  const [precio, setPrecio] = useState<number>(0);
  const [descripcion, setDescripcion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const filteredItems = listasPrecios.filter(item => {
    const catClean = (item.categoria || '').trim().toLowerCase();
    const filterClean = categoryFilter.trim().toLowerCase();

    const matchesCat = categoryFilter === 'ALL' || 
      catClean === filterClean || 
      catClean.includes(filterClean) ||
      filterClean.includes(catClean);

    const matchesSearch = (item.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      catClean.includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

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
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">Listas de Precios de Materiales</h1>
            <p className="text-slate-300 text-xs mt-0.5">
              Consulta y actualización rápida de precios vigentes organizados por categoría sin afectar el diseño.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sincronizar con Catálogo</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Precio</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descripción o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold text-slate-600">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filtrar por Categoría:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
          >
            <option value="ALL">Todas las Categorías ({listasPrecios.length})</option>
            {categoriesList.map((cat, i) => (
              <option key={i} value={cat}>{cat}</option>
            ))}
          </select>
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
                    No hay registros en la lista de precios. Haga clic en "Sincronizar con Catálogo" o "Agregar Precio".
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
                      ${item.precio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Categoría */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Categoría *</label>
                <input
                  type="text"
                  required
                  list="categories-datalist"
                  placeholder="Ej. Fine Art / Fotográfico"
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
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
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
