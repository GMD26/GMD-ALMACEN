import React, { useState, useEffect } from 'react';
import { ArrowDownToLine, CheckCircle, PackagePlus, Search, Building2, FileText, MapPin, Trash2 } from 'lucide-react';
import { Product, InventoryMovement } from '../types';

interface StockInViewProps {
  products: Product[];
  initialProduct?: Product | null;
  onRecordStockIn: (
    product: Product, 
    quantity: number, 
    reference: string, 
    location: string, 
    notes: string, 
    cost?: number
  ) => Promise<void>;
  movements: InventoryMovement[];
  onDeleteMovements?: (ids: string[]) => Promise<void>;
}

export const StockInView: React.FC<StockInViewProps> = ({
  products,
  initialProduct,
  onRecordStockIn,
  movements,
  onDeleteMovements
}) => {
  const [selectedSku, setSelectedSku] = useState<string>(initialProduct?.sku || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [quantity, setQuantity] = useState<number>(10);
  const [supplierRef, setSupplierRef] = useState('Factura Proveedor #1042');
  const [location, setLocation] = useState('Pasillo A1 - Fine Art');
  const [cost, setCost] = useState<number>(0);
  const [notes, setNotes] = useState('Recepción de orden de compra programada.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Checkbox Selection State for Deleting
  const [selectedMovementIds, setSelectedMovementIds] = useState<string[]>([]);

  const selectedProduct = products.find(p => p.sku === selectedSku);

  useEffect(() => {
    if (initialProduct) {
      setSelectedSku(initialProduct.sku);
      setLocation(initialProduct.ubicacionAlmacen);
      setCost(initialProduct.costo || initialProduct.precio);
    } else if (products.length > 0 && !selectedSku) {
      setSelectedSku(products[0].sku);
      setLocation(products[0].ubicacionAlmacen);
      setCost(products[0].costo || products[0].precio);
    }
  }, [initialProduct, products]);

  useEffect(() => {
    if (selectedProduct) {
      setLocation(selectedProduct.ubicacionAlmacen);
      setCost(selectedProduct.costo || selectedProduct.precio);
    }
  }, [selectedSku]);

  const filteredProducts = products.filter(p => 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.descripcion.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || quantity <= 0) return;

    setIsSubmitting(true);
    try {
      await onRecordStockIn(
        selectedProduct,
        quantity,
        supplierRef || 'Entrada Directa',
        location || selectedProduct.ubicacionAlmacen,
        notes,
        cost
      );

      setSuccessMessage(`¡Entrada de ${quantity} ${selectedProduct.unidad} de SKU ${selectedProduct.sku} registrada con éxito!`);
      setTimeout(() => setSuccessMessage(null), 4000);

      // Reset
      setQuantity(10);
      setNotes('Recepción de material.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stockInMovements = movements.filter(m => m.tipo === 'ENTRADA');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMovementIds(stockInMovements.map(m => m.id));
    } else {
      setSelectedMovementIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedMovementIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedMovementIds.length === 0 || !onDeleteMovements) return;
    if (confirm(`¿Confirma eliminar ${selectedMovementIds.length} registro(s) de entrada seleccionados?`)) {
      await onDeleteMovements(selectedMovementIds);
      setSelectedMovementIds([]);
      setSuccessMessage(`Se eliminaron ${selectedMovementIds.length} entrada(s) de almacén.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-emerald-950/80 p-6 rounded-2xl border border-emerald-800 text-white shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <ArrowDownToLine className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">Registro de Entradas de Almacén</h1>
            <p className="text-emerald-200 text-xs mt-0.5">
              Recepcione compras a proveedores y aumente el inventario en tiempo real.
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl flex items-center space-x-3 text-emerald-800 text-xs font-bold animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Two Columns Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Column (1 col) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center space-x-2">
            <PackagePlus className="w-4 h-4 text-emerald-600" />
            <span>Formulario de Entrada</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            
            {/* Search SKU */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Buscar Producto / SKU *</label>
              <div className="relative mb-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar lista por SKU o nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <select
                required
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 text-xs bg-slate-50"
              >
                <option value="" disabled>Seleccione un producto...</option>
                {filteredProducts.map((p, idx) => (
                  <option key={`${p.id || p.sku}-${idx}`} value={p.sku}>
                    [{p.sku}] - {p.descripcion.substring(0, 38)} (Stock: {p.cantidadActual})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Product Summary Card */}
            {selectedProduct && (
              <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-1">
                <div className="flex justify-between items-center text-emerald-950 font-bold">
                  <span>{selectedProduct.sku}</span>
                  <span className="text-emerald-700 text-[11px]">Stock Actual: {selectedProduct.cantidadActual} {selectedProduct.unidad}</span>
                </div>
                <div className="text-slate-600 text-[11px] line-clamp-1">{selectedProduct.descripcion}</div>
                <div className="text-slate-500 text-[10px] flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-emerald-600" />
                  <span>Ubicación: {selectedProduct.ubicacionAlmacen}</span>
                </div>
              </div>
            )}

            {/* Quantity & Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Cantidad a Ingresar *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Costo Unitario ($ MXN)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 text-sm"
                />
              </div>
            </div>

            {/* Supplier / Order Reference */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Referencia / Factura / Orden *</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Ej. Factura Proveedor #1042 / Pedido 882"
                  value={supplierRef}
                  onChange={(e) => setSupplierRef(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>
            </div>

            {/* Warehouse Location Assignment */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Ubicación en Almacén</label>
              <input
                type="text"
                placeholder="Pasillo A1 - Fine Art"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Notas u Observaciones</label>
              <textarea
                rows={2}
                placeholder="Detalles sobre el lote, estado del empaque, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedProduct}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Procesando Entrada...' : 'Confirmar Entrada de Almacén'}
            </button>

          </form>
        </div>

        {/* History Table Column (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <span>Historial de Entradas Recientes</span>
              <span className="text-xs text-slate-500 font-normal">({stockInMovements.length} total)</span>
            </h2>

            {/* Delete Selected Button */}
            {selectedMovementIds.length > 0 && onDeleteMovements && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center space-x-1.5 px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Seleccionadas ({selectedMovementIds.length})</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] font-bold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={stockInMovements.length > 0 && selectedMovementIds.length === stockInMovements.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Cant.</th>
                  <th className="py-2.5 px-3">Stock Final</th>
                  <th className="py-2.5 px-3">Referencia</th>
                  <th className="py-2.5 px-3">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stockInMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      No hay entradas de almacén registradas recientemente.
                    </td>
                  </tr>
                ) : (
                  stockInMovements.map((m) => {
                    const isSelected = selectedMovementIds.includes(m.id);
                    return (
                      <tr key={m.id} className={`transition-colors ${isSelected ? 'bg-emerald-100/70' : 'hover:bg-emerald-50/40'}`}>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(m.id)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {new Date(m.timestamp).toLocaleString('es-MX')}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {m.sku}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-600">
                          +{m.cantidad}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-700">
                          {m.stockNuevo}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-[150px] truncate" title={m.referencia}>
                          {m.referencia}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-[120px]">
                          {m.usuarioNombre || m.usuarioEmail?.split('@')[0]}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
