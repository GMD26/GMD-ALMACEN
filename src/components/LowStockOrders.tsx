import React, { useState } from 'react';
import { 
  AlertTriangle, 
  FileText, 
  ShoppingCart, 
  CheckSquare, 
  Square, 
  Download, 
  Send, 
  PackageCheck, 
  Building2, 
  Clock,
  CheckCircle2,
  ListOrdered,
  Search,
  Plus,
  Trash2
} from 'lucide-react';
import { Product, PurchaseOrder, PurchaseOrderItem, UserProfile } from '../types';
import { generatePurchaseOrderPDF } from '../utils/pdfGenerator';
import { User } from 'firebase/auth';

interface LowStockOrdersProps {
  products: Product[];
  purchaseOrders: PurchaseOrder[];
  user: User | null;
  userProfile: UserProfile | null;
  onCreatePurchaseOrder: (order: Omit<PurchaseOrder, 'id'>) => Promise<void>;
  onReceivePurchaseOrder: (order: PurchaseOrder) => Promise<void>;
}

export const LowStockOrders: React.FC<LowStockOrdersProps> = ({
  products,
  purchaseOrders,
  user,
  userProfile,
  onCreatePurchaseOrder,
  onReceivePurchaseOrder
}) => {
  // Find products below or equal to min stock
  const lowStockProducts = products.filter(p => p.cantidadActual <= p.minStock);

  // Custom added products that were manually searched
  const [customSkus, setCustomSkus] = useState<string[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedSearchSku, setSelectedSearchSku] = useState('');
  const [addQtyInput, setAddQtyInput] = useState<number>(5);

  // Selected SKUs map to quantity to order
  const [selectedItems, setSelectedItems] = useState<{ [sku: string]: { selected: boolean; qty: number } }>(() => {
    const initial: { [sku: string]: { selected: boolean; qty: number } } = {};
    lowStockProducts.forEach(p => {
      const suggested = Math.max(1, (p.minStock * 2) - p.cantidadActual);
      initial[p.sku] = { selected: true, qty: suggested };
    });
    return initial;
  });

  const [supplierName, setSupplierRef] = useState('Proveedor Principal de Grupo Más Digital');
  const [orderNotes, setNotes] = useState('Pedido urgente para reabastecimiento de almacén.');
  const [isCreating, setIsCreating] = useState(false);
  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);

  // Combine low stock products and manually added products
  const displayProducts = [
    ...lowStockProducts,
    ...products.filter(p => customSkus.includes(p.sku) && !lowStockProducts.some(lsp => lsp.sku === p.sku))
  ];

  const handleSearchSkuChange = (query: string) => {
    setProductSearchQuery(query);
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return;
    const exactMatch = products.find(p => p.sku.toLowerCase() === trimmed);
    if (exactMatch) {
      setSelectedSearchSku(exactMatch.sku);
    }
  };

  const handleAddCustomProduct = () => {
    const targetSku = selectedSearchSku || products.find(p => p.sku.toLowerCase() === productSearchQuery.trim().toLowerCase())?.sku;
    if (!targetSku) return;

    if (!customSkus.includes(targetSku)) {
      setCustomSkus(prev => [...prev, targetSku]);
    }

    setSelectedItems(prev => ({
      ...prev,
      [targetSku]: { selected: true, qty: addQtyInput || 5 }
    }));

    setProductSearchQuery('');
    setSelectedSearchSku('');
    setAddQtyInput(5);
  };

  const toggleSelect = (sku: string) => {
    setSelectedItems(prev => {
      const current = prev[sku] || { selected: false, qty: 5 };
      return {
        ...prev,
        [sku]: { ...current, selected: !current.selected }
      };
    });
  };

  const updateQty = (sku: string, qty: number) => {
    setSelectedItems(prev => ({
      ...prev,
      [sku]: { ...(prev[sku] || { selected: true }), qty: Math.max(1, qty) }
    }));
  };

  const selectAll = () => {
    const next: { [sku: string]: { selected: boolean; qty: number } } = {};
    displayProducts.forEach(p => {
      const existingQty = selectedItems[p.sku]?.qty || Math.max(1, (p.minStock * 2) - p.cantidadActual);
      next[p.sku] = { selected: true, qty: existingQty };
    });
    setSelectedItems(next);
  };

  const deselectAll = () => {
    const next: { [sku: string]: { selected: boolean; qty: number } } = {};
    displayProducts.forEach(p => {
      next[p.sku] = { selected: false, qty: selectedItems[p.sku]?.qty || 5 };
    });
    setSelectedItems(next);
  };

  // Filter chosen items
  const itemsToOrder: PurchaseOrderItem[] = displayProducts
    .filter(p => selectedItems[p.sku]?.selected)
    .map(p => {
      const qty = selectedItems[p.sku]?.qty || 1;
      return {
        sku: p.sku,
        descripcion: p.descripcion,
        medida: p.medida,
        unidad: p.unidad,
        cantidadActual: p.cantidadActual,
        minStock: p.minStock,
        cantidadSugerida: Math.max(1, (p.minStock * 2) - p.cantidadActual),
        cantidadPedida: qty,
        costoEstimado: p.costo || p.precio
      };
    });

  const totalEstimatedCost = itemsToOrder.reduce((sum, item) => sum + (item.cantidadPedida * item.costoEstimado), 0);
  const totalItemsCount = itemsToOrder.reduce((acc, i) => acc + i.cantidadPedida, 0);

  const handleGeneratePDF = () => {
    if (itemsToOrder.length === 0) return;

    const folio = `REQ-${Date.now().toString().slice(-6)}`;
    const tempOrder: PurchaseOrder = {
      id: folio,
      folio,
      fecha: new Date().toISOString(),
      solicitante: userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Almacén Central',
      solicitanteEmail: user?.email || 'almacen@grupomasdigital.com',
      estado: 'SOLICITADO',
      items: itemsToOrder,
      totalEstimado: totalEstimatedCost,
      proveedor: supplierName,
      notas: orderNotes
    };

    generatePurchaseOrderPDF(tempOrder);
  };

  const handleSaveOrder = async () => {
    if (itemsToOrder.length === 0) return;

    setIsCreating(true);
    try {
      const folio = `GMD-PED-${Date.now().toString().slice(-6)}`;
      const orderPayload: Omit<PurchaseOrder, 'id'> = {
        folio,
        fecha: new Date().toISOString(),
        solicitante: userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Almacén Central',
        solicitanteEmail: user?.email || 'almacen@grupomasdigital.com',
        estado: 'SOLICITADO',
        items: itemsToOrder,
        totalEstimado: totalEstimatedCost,
        proveedor: supplierName,
        notas: orderNotes
      };

      await onCreatePurchaseOrder(orderPayload);
      
      // Auto download PDF as well!
      generatePurchaseOrderPDF({ id: folio, ...orderPayload });

    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleReceive = async (order: PurchaseOrder) => {
    setReceivingOrderId(order.id);
    try {
      await onReceivePurchaseOrder(order);
    } catch (err) {
      console.error(err);
    } finally {
      setReceivingOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-red-950/90 p-6 rounded-2xl border border-red-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">Agilizador de Pedidos de Material Faltante</h1>
            <p className="text-red-200 text-xs mt-0.5">
              Identificación automática de stock bajo, cálculo de sugeridos y generación instantánea de Solicitudes de Compra en PDF.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs bg-red-900/80 text-red-200 font-bold px-3 py-1.5 rounded-lg border border-red-700">
            {lowStockProducts.length} SKUs con Alerta de Stock Bajo
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Reorder Checklist (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          {/* Product Searcher Bar */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
            <label className="block text-slate-800 font-bold text-xs">
              Buscador de Productos (Catálogo de {products.length} SKUs):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
              <div className="sm:col-span-6 relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Escriba SKU o nombre para buscar..."
                  value={productSearchQuery}
                  onChange={(e) => handleSearchSkuChange(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={selectedSearchSku}
                  onChange={(e) => setSelectedSearchSku(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                >
                  <option value="">-- Seleccionar producto --</option>
                  {products
                    .filter(p => !productSearchQuery || p.sku.toLowerCase().includes(productSearchQuery.toLowerCase()) || p.descripcion.toLowerCase().includes(productSearchQuery.toLowerCase()))
                    .map((p, idx) => (
                      <option key={`${p.sku}-${idx}`} value={p.sku}>
                        [{p.sku}] - {p.descripcion.substring(0, 30)}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="sm:col-span-3 flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  value={addQtyInput}
                  onChange={(e) => setAddQtyInput(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-bold text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddCustomProduct}
                  disabled={!selectedSearchSku && !productSearchQuery}
                  className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-all flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5 text-red-400" />
                  <span>Agregar</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Material por Reponer</h2>
              <p className="text-slate-500 text-xs">Seleccione los SKUs que desea incluir en esta orden de compra</p>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={selectAll}
                className="text-xs text-cyan-600 hover:text-cyan-700 font-bold underline"
              >
                Seleccionar todos
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={deselectAll}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium"
              >
                Deseleccionar
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {displayProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">¡Inventario Excelente!</p>
                <p className="text-xs text-slate-500">Use el buscador arriba para agregar productos al pedido de material.</p>
              </div>
            ) : (
              displayProducts.map((p, idx) => {
                const isSelected = selectedItems[p.sku]?.selected ?? true;
                const currentQty = selectedItems[p.sku]?.qty ?? Math.max(1, (p.minStock * 2) - p.cantidadActual);

                return (
                  <div
                    key={`${p.sku}-${idx}`}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected ? 'bg-red-50/30 border-red-200' : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    {/* Item info */}
                    <div className="flex items-start space-x-3">
                      <button
                        type="button"
                        onClick={() => toggleSelect(p.sku)}
                        className="mt-1 text-slate-600 hover:text-red-600 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-red-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900 text-sm">{p.sku}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">
                            {p.cantidadActual === 0 ? 'AGOTADO (0)' : `Stock: ${p.cantidadActual}`}
                          </span>
                          <span className="text-[10px] text-slate-500">Min: {p.minStock}</span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium mt-0.5 max-w-md line-clamp-1">
                          {p.descripcion}
                        </p>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Ubicación: {p.ubicacionAlmacen} | Medida: {p.medida} ({p.unidad})
                        </div>
                      </div>
                    </div>

                    {/* Quantity Picker */}
                    <div className="flex items-center space-x-3 pl-8 sm:pl-0">
                      <div className="text-right">
                        <label className="block text-[10px] text-slate-500 font-bold">Cant. Pedida</label>
                        <input
                          type="number"
                          min="1"
                          disabled={!isSelected}
                          value={currentQty}
                          onChange={(e) => updateQty(p.sku, parseInt(e.target.value) || 1)}
                          className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-center text-slate-900 bg-white focus:ring-2 focus:ring-red-500"
                        />
                      </div>

                      <div className="text-right min-w-[80px]">
                        <span className="block text-[10px] text-slate-400">Costo Est.</span>
                        <span className="font-bold text-xs text-slate-900">
                          ${((p.costo || p.precio) * currentQty).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Order Requisition Summary (1 col) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center space-x-2">
            <ShoppingCart className="w-4 h-4 text-red-600" />
            <span>Resumen de la Solicitud</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
              <div className="flex justify-between font-bold text-slate-700">
                <span>Items Seleccionados:</span>
                <span className="text-slate-900">{itemsToOrder.length} productos</span>
              </div>
              <div className="flex justify-between font-bold text-slate-700">
                <span>Piezas Totales:</span>
                <span className="text-slate-900">
                  {itemsToOrder.reduce((acc, i) => sumAcc(acc, i.cantidadPedida), 0)} unidades
                </span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-200 pt-2">
                <span>Total Estimado:</span>
                <span className="text-cyan-700">
                  ${totalEstimatedCost.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                </span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Proveedor Sugerido</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierRef(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Notas de la Solicitud</label>
              <textarea
                rows={2}
                value={orderNotes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleGeneratePDF}
                disabled={itemsToOrder.length === 0}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Descargar Orden en PDF</span>
              </button>

              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={isCreating || itemsToOrder.length === 0}
                className="w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isCreating ? 'Guardando...' : 'Guardar y Registrar Pedido'}</span>
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* History of Saved Purchase Orders */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-2 flex items-center space-x-2">
          <ListOrdered className="w-5 h-5 text-cyan-600" />
          <span>Historial de Solicitudes de Pedidos Guardadas</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Folio</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Solicitante</th>
                <th className="py-3 px-4">Proveedor</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Total Est.</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    No hay solicitudes de pedidos guardadas en el sistema aún.
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((order, idx) => (
                  <tr key={`${order.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {order.folio}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(order.fecha).toLocaleDateString('es-MX')}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-semibold">
                      {order.solicitante}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {order.proveedor}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {order.items?.length || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-cyan-800">
                      ${order.totalEstimado?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        order.estado === 'RECIBIDO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {order.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center space-x-1.5">
                      <button
                        onClick={() => generatePurchaseOrderPDF(order)}
                        title="Re-descargar PDF"
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {order.estado !== 'RECIBIDO' && (
                        <button
                          onClick={() => handleReceive(order)}
                          disabled={receivingOrderId === order.id}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px]"
                        >
                          {receivingOrderId === order.id ? 'Recibiendo...' : 'Marcar Recibido'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

function sumAcc(acc: number, val: number) {
  return acc + val;
}
