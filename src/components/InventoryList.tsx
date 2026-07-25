import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  AlertTriangle, 
  MapPin, 
  RefreshCw, 
  Boxes, 
  CheckCircle2, 
  XCircle, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  Trash2,
  Database,
  FileSpreadsheet
} from 'lucide-react';
import { Product } from '../types';
import { BulkImportModal } from './BulkImportModal';

interface InventoryListProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  onBulkImport?: (products: Omit<Product, 'id'>[], replaceExisting: boolean) => Promise<void>;
  onSeedDatabase: () => Promise<void>;
  onResetAllStockToZero?: () => Promise<void>;
  onOpenQuickStockIn: (product: Product) => void;
  onOpenQuickStockOut: (product: Product) => void;
  isSeeding: boolean;
}

export const InventoryList: React.FC<InventoryListProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onBulkImport,
  onSeedDatabase,
  onResetAllStockToZero,
  onOpenQuickStockIn,
  onOpenQuickStockOut,
  isSeeding
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'NORMAL' | 'LOW' | 'OUT'>('ALL');
  const [selectedLocation, setSelectedLocation] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // New product form
  const [formData, setFormData] = useState({
    sku: '',
    descripcion: '',
    medida: 'RL',
    unidad: 'RL',
    precio: 0,
    precioIva: 0,
    costo: 0,
    cantidadActual: 10,
    ubicacionAlmacen: 'Pasillo A1 - Fine Art',
    minStock: 5,
    categoria: 'Papeles de Arte y Fine Art'
  });

  // Extract unique categories & locations
  const categories = Array.from(new Set(products.map(p => p.categoria || 'Varios')));
  const locations = Array.from(new Set(products.map(p => p.ubicacionAlmacen || 'Sin Ubicación')));

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ubicacionAlmacen.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = selectedCategory === 'ALL' || p.categoria === selectedCategory;
    const matchesLoc = selectedLocation === 'ALL' || p.ubicacionAlmacen === selectedLocation;

    let matchesStock = true;
    if (stockFilter === 'LOW') matchesStock = p.minStock > 0 && p.cantidadActual <= p.minStock && p.cantidadActual > 0;
    else if (stockFilter === 'OUT') matchesStock = p.cantidadActual === 0;
    else if (stockFilter === 'NORMAL') matchesStock = p.minStock === 0 ? p.cantidadActual > 0 : p.cantidadActual > p.minStock;

    return matchesSearch && matchesCat && matchesLoc && matchesStock;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku || !formData.descripcion) return;
    
    await onAddProduct({
      ...formData,
      precioIva: formData.precioIva || Math.round(formData.precio * 1.16),
      updatedAt: new Date().toISOString(),
      updatedBy: 'Usuario'
    });

    setIsAddModalOpen(false);
    setFormData({
      sku: '',
      descripcion: '',
      medida: 'RL',
      unidad: 'RL',
      precio: 0,
      precioIva: 0,
      costo: 0,
      cantidadActual: 10,
      ubicacionAlmacen: 'Pasillo A1 - Fine Art',
      minStock: 5,
      categoria: 'Papeles de Arte y Fine Art'
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    await onUpdateProduct(editingProduct.id, {
      sku: editingProduct.sku,
      descripcion: editingProduct.descripcion,
      medida: editingProduct.medida,
      unidad: editingProduct.unidad,
      precio: editingProduct.precio,
      precioIva: editingProduct.precioIva,
      costo: editingProduct.costo,
      cantidadActual: editingProduct.cantidadActual,
      ubicacionAlmacen: editingProduct.ubicacionAlmacen,
      minStock: editingProduct.minStock,
      categoria: editingProduct.categoria,
      updatedAt: new Date().toISOString()
    });

    setEditingProduct(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-cyan-600" />
            <span>Inventario de Productos (SKUs)</span>
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Mostrando {filteredProducts.length} de {products.length} productos registrados
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Reset All Stock Button */}
          {onResetAllStockToZero && (
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              disabled={isSeeding}
              className="flex items-center space-x-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-300 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Poner en 0 la cantidad actual de todos los productos para captura manual"
            >
              <RefreshCw className={`w-4 h-4 ${isSeeding ? 'animate-spin text-amber-600' : ''}`} />
              <span>{isSeeding ? 'Procesando...' : 'Dejar Inventario en 0'}</span>
            </button>
          )}

          {/* Seed Database Button */}
          {products.length === 0 && (
            <button
              onClick={onSeedDatabase}
              disabled={isSeeding}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              <span>{isSeeding ? 'Cargando Catálogo...' : 'Cargar Catálogo Oficial Grupo Más Digital'}</span>
            </button>
          )}

          {/* Import Excel/CSV Button */}
          {onBulkImport && (
            <button
              onClick={() => setIsBulkImportOpen(true)}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition-all cursor-pointer"
              title="Importar lista completa de productos desde Excel o CSV (hasta 613+ registros)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Importar Excel / CSV</span>
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Producto SKU</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por SKU, nombre, ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-700"
            >
              <option value="ALL">Todas las Categorías ({categories.length})</option>
              {categories.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Location Dropdown */}
          <div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-700"
            >
              <option value="ALL">Todas las Ubicaciones en Almacén</option>
              {locations.map((loc, i) => (
                <option key={i} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Stock Status Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStockFilter('ALL')}
              className={`flex-1 py-1 rounded-lg text-center transition-colors ${stockFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setStockFilter('NORMAL')}
              className={`flex-1 py-1 rounded-lg text-center transition-colors ${stockFilter === 'NORMAL' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
            >
              Normal
            </button>
            <button
              onClick={() => setStockFilter('LOW')}
              className={`flex-1 py-1 rounded-lg text-center transition-colors ${stockFilter === 'LOW' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}
            >
              Bajo
            </button>
            <button
              onClick={() => setStockFilter('OUT')}
              className={`flex-1 py-1 rounded-lg text-center transition-colors ${stockFilter === 'OUT' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500'}`}
            >
              Agotado
            </button>
          </div>

        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-300 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="py-3.5 px-4">SKU / Código</th>
                <th className="py-3.5 px-4">Descripción del Producto</th>
                <th className="py-3.5 px-4">Medida & Unidad</th>
                <th className="py-3.5 px-4">Ubicación Almacén</th>
                <th className="py-3.5 px-4 text-center">Cantidad Actual</th>
                <th className="py-3.5 px-4 text-center">Min. Stock</th>
                <th className="py-3.5 px-4 text-right">Costo Est.</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No se encontraron productos que coincidan con la búsqueda o filtros.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => {
                  const isOutOfStock = p.cantidadActual === 0;
                  const isLowStock = p.cantidadActual <= p.minStock && !isOutOfStock;

                  return (
                    <tr key={`${p.id || p.sku}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* SKU */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 text-sm">{p.sku}</div>
                        <div className="text-[10px] text-slate-400">{p.categoria}</div>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <div className="text-slate-800 font-semibold line-clamp-2" title={p.descripcion}>
                          {p.descripcion}
                        </div>
                      </td>

                      {/* Size & Unit */}
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[11px] font-semibold border border-slate-200">
                          {p.medida} ({p.unidad})
                        </span>
                      </td>

                      {/* Location in Warehouse */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" />
                          <span className="font-semibold text-[11px]">{p.ubicacionAlmacen}</span>
                        </div>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center space-x-1.5">
                          <span className={`text-base font-extrabold px-2.5 py-0.5 rounded-lg border ${
                            isOutOfStock
                              ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {p.cantidadActual}
                          </span>
                        </div>
                        {isOutOfStock && <div className="text-[10px] text-red-600 font-bold mt-0.5">¡AGOTADO!</div>}
                        {isLowStock && <div className="text-[10px] text-amber-600 font-bold mt-0.5">Stock Bajo</div>}
                      </td>

                      {/* Min Stock */}
                      <td className="py-3.5 px-4 text-center text-slate-500 font-bold">
                        {p.minStock}
                      </td>

                      {/* Cost */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                        ${(p.costo || p.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => onOpenQuickStockIn(p)}
                            title="Entrada de inventario"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors"
                          >
                            <ArrowDownToLine className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onOpenQuickStockOut(p)}
                            title="Salida de inventario"
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg border border-amber-200 transition-colors"
                          >
                            <ArrowUpFromLine className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setEditingProduct(p)}
                            title="Editar SKU / Ubicación"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              Agregar Nuevo Producto / SKU
            </h2>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Código SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. AL690"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 uppercase font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Categoría</label>
                  <input
                    type="text"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Descripción del Producto *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Descripción detallada del material..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Medida</label>
                  <input
                    type="text"
                    placeholder="0.91 x 50 m"
                    value={formData.medida}
                    onChange={(e) => setFormData({ ...formData, medida: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Unidad</label>
                  <input
                    type="text"
                    placeholder="RL / PAQ / m²"
                    value={formData.unidad}
                    onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ubicación en Almacén *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Pasillo A1 - Estante 2"
                    value={formData.ubicacionAlmacen}
                    onChange={(e) => setFormData({ ...formData, ubicacionAlmacen: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Alerta Stock Bajo (Mínimo)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) >= 0 ? parseInt(e.target.value) : 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cantidad Inicial</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.cantidadActual}
                    onChange={(e) => setFormData({ ...formData, cantidadActual: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Costo Unit. ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.costo}
                    onChange={(e) => setFormData({ ...formData, costo: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Precio Venta ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-md"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              Editar Producto: <span className="text-cyan-600">{editingProduct.sku}</span>
            </h2>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Descripción del Producto</label>
                <textarea
                  rows={2}
                  value={editingProduct.descripcion}
                  onChange={(e) => setEditingProduct({ ...editingProduct, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Ubicación en Almacén</label>
                  <input
                    type="text"
                    value={editingProduct.ubicacionAlmacen}
                    onChange={(e) => setEditingProduct({ ...editingProduct, ubicacionAlmacen: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Umbral Stock Bajo (Mínimo)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.minStock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minStock: parseInt(e.target.value) >= 0 ? parseInt(e.target.value) : 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Stock Actual</label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.cantidadActual}
                    onChange={(e) => setEditingProduct({ ...editingProduct, cantidadActual: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Costo Unitario ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingProduct.costo}
                    onChange={(e) => setEditingProduct({ ...editingProduct, costo: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Precio Venta ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingProduct.precio}
                    onChange={(e) => setEditingProduct({ ...editingProduct, precio: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-md"
                >
                  Actualizar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET ALL STOCK CONFIRMATION MODAL */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="p-2.5 rounded-xl bg-amber-100">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                ¿Dejar Todo el Inventario en 0?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Esta acción establecerá la <strong>cantidad actual en 0</strong> y el <strong>stock mínimo en 0</strong> para todos los <strong>{products.length} productos</strong> registrados en el sistema para que puedas realizar la captura manual de existencias y mínimos.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium space-y-1">
              <div>✓ Conserva todos los SKUs, precios, categorías y descripciones.</div>
              <div>✓ Establece la cantidad disponible y el stock mínimo en 0 unidades.</div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsResetConfirmOpen(false);
                  if (onResetAllStockToZero) {
                    await onResetAllStockToZero();
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-colors cursor-pointer"
              >
                Sí, Restablecer Todo a 0
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK IMPORT MODAL */}
      {onBulkImport && (
        <BulkImportModal
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          onBulkImport={onBulkImport}
          existingProductCount={products.length}
        />
      )}

    </div>
  );
};
