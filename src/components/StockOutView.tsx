import React, { useState, useEffect } from 'react';
import { ArrowUpFromLine, CheckCircle, PackageMinus, Search, UserCheck, FileText, AlertCircle, MapPin, Trash2 } from 'lucide-react';
import { Product, InventoryMovement } from '../types';

interface StockOutViewProps {
  products: Product[];
  initialProduct?: Product | null;
  onRecordStockOut: (
    product: Product, 
    quantity: number, 
    reference: string, 
    notes: string
  ) => Promise<void>;
  movements: InventoryMovement[];
  onDeleteMovements?: (ids: string[]) => Promise<void>;
}

export const StockOutView: React.FC<StockOutViewProps> = ({
  products,
  initialProduct,
  onRecordStockOut,
  movements,
  onDeleteMovements
}) => {
  const [selectedSku, setSelectedSku] = useState<string>(initialProduct?.sku || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [clientJobRef, setClientJobRef] = useState('Orden de Impresión #204');
  const [notes, setNotes] = useState('Salida para trabajo de impresión en Plotter Gran Formato.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Multi-product batch list state for stock out
  const [batchItems, setBatchItems] = useState<Array<{
    product: Product;
    quantity: number;
  }>>([]);

  // Checkbox Selection State for Deleting
  const [selectedMovementIds, setSelectedMovementIds] = useState<string[]>([]);

  const selectedProduct = products.find(p => p.sku === selectedSku);

  useEffect(() => {
    if (initialProduct) {
      setSelectedSku(initialProduct.sku);
    } else if (products.length > 0 && !selectedSku) {
      setSelectedSku(products[0].sku);
    }
  }, [initialProduct, products]);

  // Auto SKU match when typing in searchQuery
  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return;
    const exactMatch = products.find(p => p.sku.toLowerCase() === trimmed);
    if (exactMatch) {
      setSelectedSku(exactMatch.sku);
    }
  };

  const filteredProducts = products.filter(p => 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.descripcion.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCurrentToBatch = () => {
    setErrorMsg(null);
    if (!selectedProduct) return;
    if (quantity <= 0) {
      setErrorMsg('La cantidad debe ser mayor a 0.');
      return;
    }
    if (quantity > selectedProduct.cantidadActual) {
      setErrorMsg(`No hay suficiente stock para ${selectedProduct.sku}. Disponible: ${selectedProduct.cantidadActual} ${selectedProduct.unidad}`);
      return;
    }

    const existingIndex = batchItems.findIndex(item => item.product.sku === selectedProduct.sku);
    if (existingIndex >= 0) {
      const updated = [...batchItems];
      if (updated[existingIndex].quantity + quantity > selectedProduct.cantidadActual) {
        setErrorMsg(`La suma excede el stock disponible (${selectedProduct.cantidadActual} ${selectedProduct.unidad}).`);
        return;
      }
      updated[existingIndex].quantity += quantity;
      setBatchItems(updated);
    } else {
      setBatchItems(prev => [
        ...prev,
        {
          product: selectedProduct,
          quantity
        }
      ]);
    }

    setSuccessMessage(`Agregado a la lista de despacho: ${quantity} x ${selectedProduct.sku}`);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const handleRemoveFromBatch = (index: number) => {
    setBatchItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const itemsToSubmit = batchItems.length > 0 ? batchItems : (selectedProduct && quantity > 0 ? [{
      product: selectedProduct,
      quantity
    }] : []);

    if (itemsToSubmit.length === 0) return;

    // Validate stock for all
    for (const item of itemsToSubmit) {
      if (item.quantity > item.product.cantidadActual) {
        setErrorMsg(`Stock insuficiente para ${item.product.sku}. Disponible: ${item.product.cantidadActual}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      for (const item of itemsToSubmit) {
        await onRecordStockOut(
          item.product,
          item.quantity,
          clientJobRef || 'Salida General',
          notes
        );
      }

      setSuccessMessage(`¡Salida registrada con éxito (${itemsToSubmit.length} producto(s))!`);
      setTimeout(() => setSuccessMessage(null), 4000);

      setBatchItems([]);
      setQuantity(1);
      setNotes('Despacho de material.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error al registrar la salida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stockOutMovements = movements.filter(m => m.tipo === 'SALIDA');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMovementIds(stockOutMovements.map(m => m.id));
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
    if (confirm(`¿Confirma eliminar ${selectedMovementIds.length} registro(s) de salida seleccionados?`)) {
      await onDeleteMovements(selectedMovementIds);
      setSelectedMovementIds([]);
      setSuccessMessage(`Se eliminaron ${selectedMovementIds.length} salida(s) de almacén.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-amber-950/80 p-6 rounded-2xl border border-amber-800 text-white shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <ArrowUpFromLine className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">Registro de Salidas de Almacén</h1>
            <p className="text-amber-200 text-xs mt-0.5">
              Despache material para trabajos de impresión, entregas a clientes o consumo interno.
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-center space-x-3 text-amber-800 text-xs font-bold animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center space-x-3 text-red-800 text-xs font-bold">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Two Columns Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Column (1 col) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center space-x-2">
            <PackageMinus className="w-4 h-4 text-amber-600" />
            <span>Formulario de Salida</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            
            {/* Search SKU */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Buscar Producto / SKU *</label>
              <div className="relative mb-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Escriba SKU para auto-seleccionar o busque por nombre..."
                  value={searchQuery}
                  onChange={(e) => handleSearchQueryChange(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <select
                required={batchItems.length === 0}
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold text-slate-900 text-xs bg-slate-50"
              >
                <option value="" disabled>Seleccione un producto...</option>
                {filteredProducts.map((p, idx) => (
                  <option key={`${p.id || p.sku}-${idx}`} value={p.sku}>
                    [{p.sku}] - {p.descripcion.substring(0, 38)} (Disp: {p.cantidadActual})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Product Status Card */}
            {selectedProduct && (
              <div className={`p-3 rounded-xl space-y-1 border ${
                selectedProduct.cantidadActual === 0
                  ? 'bg-red-50 border-red-200'
                  : 'bg-amber-50/60 border-amber-200/80'
              }`}>
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-900">{selectedProduct.sku}</span>
                  <span className={`text-[11px] font-extrabold ${selectedProduct.cantidadActual === 0 ? 'text-red-700' : 'text-amber-800'}`}>
                    Disponible: {selectedProduct.cantidadActual} {selectedProduct.unidad}
                  </span>
                </div>
                <div className="text-slate-600 text-[11px] line-clamp-1">{selectedProduct.descripcion}</div>
                <div className="text-slate-500 text-[10px] flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-amber-600" />
                  <span>Ubicación: {selectedProduct.ubicacionAlmacen}</span>
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Cantidad a Despachar *</label>
              <input
                type="number"
                required={batchItems.length === 0}
                min="1"
                max={selectedProduct ? selectedProduct.cantidadActual : 100}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-bold text-slate-900 text-sm"
              />
            </div>

            {/* Add to batch button */}
            <button
              type="button"
              onClick={handleAddCurrentToBatch}
              disabled={!selectedProduct || quantity <= 0 || selectedProduct.cantidadActual === 0}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 shadow-sm transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center space-x-2"
            >
              <PackageMinus className="w-4 h-4 text-amber-400" />
              <span>+ Agregar a lista de despacho múltiple</span>
            </button>

            {/* Batch items list box */}
            {batchItems.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span>Lista de despacho múltiple ({batchItems.length})</span>
                  <button
                    type="button"
                    onClick={() => setBatchItems([])}
                    className="text-[10px] text-red-600 hover:underline cursor-pointer"
                  >
                    Vaciar lista
                  </button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {batchItems.map((item, idx) => (
                    <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
                      <div className="truncate max-w-[170px]">
                        <span className="font-bold text-slate-900">[{item.product.sku}]</span>{' '}
                        <span className="text-slate-600">{item.product.descripcion}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                          -{item.quantity} {item.product.unidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromBatch(idx)}
                          className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
                          title="Quitar de la lista"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Client / Job / Project Reference */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Cliente / Orden de Impresión / Proyecto *</label>
              <div className="relative">
                <UserCheck className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Ej. Cliente Publicidad XYZ / Orden #204"
                  value={clientJobRef}
                  onChange={(e) => setClientJobRef(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Observaciones / Motivo de Salida</label>
              <textarea
                rows={2}
                placeholder="Operador a cargo, máquina o notas del trabajo..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || (batchItems.length === 0 && (!selectedProduct || selectedProduct.cantidadActual === 0))}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting
                ? 'Procesando Salida...'
                : batchItems.length > 0
                ? `Confirmar Salida de ${batchItems.length} Producto(s)`
                : 'Confirmar Salida de Almacén'}
            </button>

          </form>
        </div>

        {/* History Table Column (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <span>Historial de Salidas Recientes</span>
              <span className="text-xs text-slate-500 font-normal">({stockOutMovements.length} total)</span>
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
                      checked={stockOutMovements.length > 0 && selectedMovementIds.length === stockOutMovements.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                  </th>
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Cant.</th>
                  <th className="py-2.5 px-3">Stock Restante</th>
                  <th className="py-2.5 px-3">Proyecto / Referencia</th>
                  <th className="py-2.5 px-3">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {stockOutMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      No hay salidas de almacén registradas recientemente.
                    </td>
                  </tr>
                ) : (
                  stockOutMovements.map((m) => {
                    const isSelected = selectedMovementIds.includes(m.id);
                    return (
                      <tr key={m.id} className={`transition-colors ${isSelected ? 'bg-amber-100/70' : 'hover:bg-amber-50/40'}`}>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(m.id)}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {new Date(m.timestamp).toLocaleString('es-MX')}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {m.sku}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-amber-600">
                          -{m.cantidad}
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
