import React, { useState } from 'react';
import { Search, X, Check, Package, Tag, Scale, DollarSign, Filter, Plus } from 'lucide-react';
import { Product } from '../types';
import { extractPeso, getPrecioConIva } from '../data/initialCatalog';

interface CatalogPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const CatalogPickerModal: React.FC<CatalogPickerModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [addedSku, setAddedSku] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = Array.from(new Set(products.map(p => p.categoria || 'Varios'))).sort();

  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = 
      !term ||
      p.sku.toLowerCase().includes(term) ||
      p.descripcion.toLowerCase().includes(term) ||
      p.medida.toLowerCase().includes(term) ||
      (p.peso && p.peso.toLowerCase().includes(term)) ||
      String(p.precio).includes(term);

    const matchesCat = selectedCategory === 'ALL' || p.categoria === selectedCategory;

    return matchesSearch && matchesCat;
  });

  const handlePick = (p: Product) => {
    onSelectProduct(p);
    setAddedSku(p.sku);
    setTimeout(() => {
      setAddedSku(null);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-400/30">
              <Package className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Catálogo de Productos de Inventario</h2>
              <p className="text-xs text-slate-300 font-medium">
                Selecciona un producto con SKU, medida, peso y precio para agregarlo a la remisión ({products.length} productos)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Search Input */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="Buscar por SKU, descripción, medida, peso (ej. 240 g/m²), precio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-cyan-500 shadow-xs"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-cyan-500 cursor-pointer shadow-xs"
            >
              <option value="ALL">Todas las Categorías ({categories.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Added Toast Notification */}
        {addedSku && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center space-x-2 animate-fadeIn">
            <Check className="w-4 h-4" />
            <span>¡Producto {addedSku} agregado exitosamente a la remisión!</span>
          </div>
        )}

        {/* Products Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-300 font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3 w-28">SKU / Código</th>
                  <th className="p-3">Descripción del Producto</th>
                  <th className="p-3 w-28">Medida / UM</th>
                  <th className="p-3 w-28">Peso / Gramaje</th>
                  <th className="p-3 w-32 text-right">Precio IVA Incl. ($)</th>
                  <th className="p-3 w-24 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      No se encontraron productos que coincidan con &quot;{searchTerm}&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const peso = p.peso || extractPeso(p.descripcion);
                    const isAdded = addedSku === p.sku;
                    const finalPriceWithIva = getPrecioConIva(p);

                    return (
                      <tr key={p.id || p.sku} className="hover:bg-cyan-50/50 transition-colors">
                        
                        {/* SKU */}
                        <td className="p-3 font-mono font-extrabold text-cyan-900">
                          <span className="bg-cyan-100 text-cyan-900 px-2 py-0.5 rounded text-[11px] border border-cyan-200">
                            {p.sku}
                          </span>
                        </td>

                        {/* Descripción */}
                        <td className="p-3 font-semibold text-slate-900">
                          <div>{p.descripcion}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{p.categoria}</div>
                        </td>

                        {/* Medida */}
                        <td className="p-3 text-slate-700 font-medium">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                            {p.medida} ({p.unidad})
                          </span>
                        </td>

                        {/* Peso */}
                        <td className="p-3 text-slate-700 font-bold">
                          <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded text-[11px] border border-amber-200">
                            {peso}
                          </span>
                        </td>

                        {/* Precio con IVA */}
                        <td className="p-3 text-right">
                          <div className="font-black text-slate-900 text-sm">
                            ${finalPriceWithIva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[9px] text-emerald-700 font-extrabold uppercase">
                            IVA Incluido
                          </div>
                        </td>

                        {/* Button */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handlePick(p)}
                            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer w-full ${
                              isAdded
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-900 hover:bg-cyan-600 text-white shadow-xs'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Agregado</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Agregar</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Mostrando {filteredProducts.length} de {products.length} SKUs disponibles</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-all cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  );
};
