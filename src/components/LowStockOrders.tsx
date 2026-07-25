import React, { useState } from 'react';
import { 
  AlertTriangle, 
  FileText, 
  ShoppingCart, 
  Download, 
  Send, 
  CheckCircle2,
  ListOrdered,
  Search,
  Plus,
  Trash2,
  Sparkles,
  Layers
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
  onDeletePurchaseOrder?: (id: string) => Promise<void>;
}

export const LowStockOrders: React.FC<LowStockOrdersProps> = ({
  products,
  purchaseOrders,
  user,
  userProfile,
  onCreatePurchaseOrder,
  onReceivePurchaseOrder,
  onDeletePurchaseOrder
}) => {
  // Low stock products (minStock > 0 and cantidadActual <= minStock)
  const lowStockProducts = products.filter(p => p.minStock > 0 && p.cantidadActual <= p.minStock);

  // Map of SKU to assigned quantity (defaults to 0 for all products)
  const [requestedQuantities, setRequestedQuantities] = useState<{ [sku: string]: number }>({});
  // Map of SKU to apartado name
  const [apartadoNames, setApartadoNames] = useState<{ [sku: string]: string }>({});

  // Searcher inputs
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedSearchSku, setSelectedSearchSku] = useState('');
  const [addQtyInput, setAddQtyInput] = useState<number>(1);

  const [supplierName, setSupplierRef] = useState('Proveedor Principal de Grupo Más Digital');
  const [orderNotes, setNotes] = useState('Pedido para reabastecimiento de almacén.');
  const [isCreating, setIsCreating] = useState(false);
  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);

  // Filter products that have assigned quantity >= 1
  const activeOrderProducts = products.filter(p => (requestedQuantities[p.sku] || 0) >= 1);

  const handleSearchSkuChange = (query: string) => {
    setProductSearchQuery(query);
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return;
    const exactMatch = products.find(p => p.sku.toLowerCase() === trimmed);
    if (exactMatch) {
      setSelectedSearchSku(exactMatch.sku);
    }
  };

  const handleAddProductToOrder = () => {
    const targetSku = selectedSearchSku || products.find(p => p.sku.toLowerCase() === productSearchQuery.trim().toLowerCase())?.sku;
    if (!targetSku) return;

    const qtyToAdd = Math.max(1, addQtyInput || 1);
    setRequestedQuantities(prev => ({
      ...prev,
      [targetSku]: (prev[targetSku] || 0) + qtyToAdd
    }));

    setProductSearchQuery('');
    setSelectedSearchSku('');
    setAddQtyInput(1);
  };

  const handlePopulateLowStockSuggestions = () => {
    const nextMap = { ...requestedQuantities };
    lowStockProducts.forEach(p => {
      const suggested = Math.max(1, (p.minStock * 2) - p.cantidadActual);
      nextMap[p.sku] = suggested;
    });
    setRequestedQuantities(nextMap);
  };

  const handleUpdateQty = (sku: string, qty: number) => {
    const validQty = Math.max(0, qty);
    setRequestedQuantities(prev => ({
      ...prev,
      [sku]: validQty
    }));
  };

  const handleRemoveProductFromOrder = (sku: string) => {
    setRequestedQuantities(prev => ({
      ...prev,
      [sku]: 0
    }));
  };

  const handleClearAll = () => {
    setRequestedQuantities({});
  };

  // Convert active order products to PurchaseOrderItems
  const itemsToOrder: PurchaseOrderItem[] = activeOrderProducts.map(p => {
    const qty = requestedQuantities[p.sku] || 1;
    return {
      sku: p.sku,
      descripcion: p.descripcion,
      medida: p.medida,
      unidad: p.unidad,
      cantidadActual: p.cantidadActual,
      minStock: p.minStock,
      cantidadSugerida: Math.max(1, (p.minStock * 2) - p.cantidadActual),
      cantidadPedida: qty,
      costoEstimado: p.costo || p.precio,
      apartadoPor: apartadoNames[p.sku] || ''
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
      
      // Auto download PDF
      generatePurchaseOrderPDF({ id: folio, ...orderPayload });

      // Reset active quantities after successful order creation
      setRequestedQuantities({});

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
            <h1 className="text-xl font-extrabold text-white">Pedidos de Material de Almacén</h1>
            <p className="text-red-200 text-xs mt-0.5">
              Crea tu pedido agregando únicamente las cantidades necesarias (los productos en 0 permanecen ocultos).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {lowStockProducts.length > 0 && (
            <button
              onClick={handlePopulateLowStockSuggestions}
              className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" />
              <span>Cargar {lowStockProducts.length} Faltantes Sugeridos</span>
            </button>
          )}

          <span className="text-xs bg-red-900/80 text-red-200 font-bold px-3 py-2 rounded-xl border border-red-700">
            {activeOrderProducts.length} SKU(s) en Solicitud
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Product Picker & Active Items Table (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          
          {/* Add Product Searcher Bar */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
            <label className="block text-slate-800 font-extrabold text-xs">
              Buscador y Selección de Material ({products.length} SKUs Disponibles):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
              <div className="sm:col-span-6 relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Escriba SKU o nombre del material..."
                  value={productSearchQuery}
                  onChange={(e) => handleSearchSkuChange(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={selectedSearchSku}
                  onChange={(e) => setSelectedSearchSku(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium text-xs focus:ring-2 focus:ring-red-500"
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
                  className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-bold text-slate-900 focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="button"
                  onClick={handleAddProductToOrder}
                  disabled={!selectedSearchSku && !productSearchQuery}
                  className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-all flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5 text-red-400" />
                  <span>Agregar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active Items Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4 text-red-600" />
                <span>Productos en el Pedido de Material</span>
              </h2>
              <p className="text-slate-500 text-xs">
                Se muestran únicamente los productos con cantidad asignada &ge; 1 pieza.
              </p>
            </div>

            {activeOrderProducts.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-red-600 hover:text-red-700 font-bold underline cursor-pointer"
              >
                Limpiar lista (volver a 0)
              </button>
            )}
          </div>

          {/* Active Order Items List */}
          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {activeOrderProducts.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
                <Layers className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-extrabold text-slate-700 text-sm">No hay productos en el pedido actual</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Por defecto todos los productos están en 0. Busca y agrega SKUs desde la barra superior o haz clic en "Cargar Faltantes Sugeridos".
                </p>
              </div>
            ) : (
              activeOrderProducts.map((p, idx) => {
                const currentQty = requestedQuantities[p.sku] || 1;

                return (
                  <div
                    key={`${p.sku}-${idx}`}
                    className="p-3.5 rounded-xl border bg-red-50/20 border-red-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    {/* Item info */}
                    <div className="flex items-start space-x-3">
                      <button
                        type="button"
                        onClick={() => handleRemoveProductFromOrder(p.sku)}
                        className="mt-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Quitar producto (dejar cantidad en 0)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-slate-900 text-sm">{p.sku}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            Existencia Actual: {p.cantidadActual}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">Min: {p.minStock}</span>
                        </div>
                        <p className="text-xs text-slate-800 font-semibold mt-0.5 max-w-md line-clamp-1">
                          {p.descripcion}
                        </p>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Ubicación: {p.ubicacionAlmacen} | Medida: {p.medida} ({p.unidad})
                        </div>
                      </div>
                    </div>

                    {/* Quantity Picker, Apartado Selector & Total */}
                    <div className="flex flex-wrap items-center gap-3 pl-7 sm:pl-0">
                      <div>
                        <label className="block text-[10px] text-slate-600 font-extrabold">Apartado Por</label>
                        <select
                          value={apartadoNames[p.sku] || ''}
                          onChange={(e) => setApartadoNames(prev => ({ ...prev, [p.sku]: e.target.value }))}
                          className="px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-red-500 shadow-xs"
                        >
                          <option value="">-- Ninguno --</option>
                          <option value="Manuel">Manuel</option>
                          <option value="Luis">Luis</option>
                          <option value="César">César</option>
                          <option value="Moni">Moni</option>
                          <option value="Mercado Libre">Mercado Libre</option>
                          <option value="Mostrador">Mostrador</option>
                        </select>
                      </div>

                      <div className="text-right">
                        <label className="block text-[10px] text-slate-600 font-extrabold">Cant. Solicitada</label>
                        <input
                          type="number"
                          min="0"
                          value={currentQty}
                          onChange={(e) => handleUpdateQty(p.sku, parseInt(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-xs font-black text-center text-slate-900 bg-white focus:ring-2 focus:ring-red-500 shadow-xs"
                        />
                      </div>

                      <div className="text-right min-w-[85px]">
                        <span className="block text-[10px] text-slate-400 font-semibold">Costo Est.</span>
                        <span className="font-extrabold text-xs text-slate-900">
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
                <span>SKUs Solicitados:</span>
                <span className="text-slate-900 font-extrabold">{itemsToOrder.length} productos</span>
              </div>
              <div className="flex justify-between font-bold text-slate-700">
                <span>Piezas Totales:</span>
                <span className="text-slate-900 font-extrabold">
                  {totalItemsCount} unidades
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
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Notas de la Solicitud</label>
              <textarea
                rows={2}
                value={orderNotes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900 font-medium"
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
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {order.estado !== 'RECIBIDO' && (
                        <button
                          onClick={() => handleReceive(order)}
                          disabled={receivingOrderId === order.id}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] cursor-pointer disabled:opacity-50"
                        >
                          {receivingOrderId === order.id ? 'Recibiendo...' : 'Marcar Recibido'}
                        </button>
                      )}

                      {onDeletePurchaseOrder && (
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Está seguro de eliminar el pedido ${order.folio}?`)) {
                              onDeletePurchaseOrder(order.id);
                            }
                          }}
                          title="Eliminar Pedido"
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
