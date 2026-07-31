import React, { useState, useRef } from 'react';
import { ExternalLink, ShoppingCart, Plus, Search, Check, CheckSquare, Square, Trash2, Package, Truck, AlertCircle, FileSpreadsheet, Upload, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PedidoMercadoLibre } from '../types';

interface PedidosMercadoLibreViewProps {
  pedidosML: PedidoMercadoLibre[];
  onAddPedidoML: (pedido: Omit<PedidoMercadoLibre, 'id' | 'createdAt'>) => Promise<void>;
  onToggleCampoML: (id: string, field: 'pedidoAKronaline' | 'entregado' | 'cancelado' | 'facturado', value: boolean) => Promise<void>;
  onDeletePedidoML: (id: string) => Promise<void>;
  onDescontarAlmacenGMD?: (pedido: PedidoMercadoLibre, revertir?: boolean) => Promise<void>;
}

export const MERCADO_LIBRE_OMNI_URL = 'https://www.mercadolibre.com.mx/ventas/omni/listado?filters=TAB_NEXT_DAYS&subFilters=&search=&limit=50&offset=0&startPeriod=';

export const PedidosMercadoLibreView: React.FC<PedidosMercadoLibreViewProps> = ({
  pedidosML,
  onAddPedidoML,
  onToggleCampoML,
  onDeletePedidoML,
  onDescontarAlmacenGMD
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CANCELLED' | 'DELIVERED'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [numPedidoML, setNumPedidoML] = useState('');
  const [clienteML, setClienteML] = useState('');
  const [sku, setSku] = useState('');
  const [descripcionProducto, setDescripcionProducto] = useState('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [pedidoAKronaline, setPedidoAKronaline] = useState<boolean>(false);
  const [entregado, setEntregado] = useState<boolean>(false);
  const [cancelado, setCancelado] = useState<boolean>(false);
  const [facturado, setFacturado] = useState<boolean>(false);
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPedidos = pedidosML
    .filter(p => {
      const matchesSearch = 
        p.numPedidoML.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clienteML.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.descripcionProducto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === 'CANCELLED') matchesStatus = !!p.cancelado;
      else if (statusFilter === 'DELIVERED') matchesStatus = !!p.entregado && !p.cancelado;
      else if (statusFilter === 'ACTIVE') matchesStatus = !p.cancelado && !p.entregado;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.fecha || a.createdAt || 0).getTime();
      const dateB = new Date(b.fecha || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportMessage('Procesando archivo Excel...');
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Parse using header: 1 to get exact 0-indexed column access (A=0, R=17, V=21, AA=26)
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (rawRows.length === 0) {
        setImportMessage('El archivo Excel está vacío.');
        setTimeout(() => setImportMessage(null), 3000);
        return;
      }

      // Determine if row 0 is a header row
      let startIdx = 0;
      if (rawRows.length > 1) {
        const firstCell = String(rawRows[0][0] || '').toLowerCase();
        if (
          firstCell.includes('número') || 
          firstCell.includes('pedido') || 
          firstCell.includes('venta') || 
          firstCell.includes('orden') ||
          firstCell.includes('id') ||
          firstCell === 'a'
        ) {
          startIdx = 1;
        }
      }

      let importedCount = 0;
      for (let i = startIdx; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        // Mapeo de columnas solicitado:
        // Número de pedido → columna A (idx 0)
        // Fecha de pedido → columna B (idx 1)
        // SKU → columna S (idx 18)
        // Descripción → columna U (idx 20)
        // Nombre del cliente → columna Z (idx 25)
        const numPedido = String(row[0] || '').trim();
        const fechaVal = String(row[1] || '').trim();
        const skuVal = String(row[18] || row[17] || row[21] || '').trim();
        const descVal = String(row[20] || row[2] || row[3] || 'Producto ML').trim();
        const clienteVal = String(row[25] || row[26] || '').trim() || 'Cliente ML';

        if (!numPedido && !skuVal) continue; // Skip empty rows

        const cantNum = parseInt(String(row[5] || row[4] || '1'), 10) || 1;

        await onAddPedidoML({
          numPedidoML: numPedido || `ML-${Date.now().toString().slice(-6)}-${importedCount + 1}`,
          clienteML: clienteVal,
          sku: skuVal,
          descripcionProducto: descVal,
          cantidad: cantNum,
          pedidoAKronaline: false,
          entregado: false,
          cancelado: false,
          fecha: fechaVal ? new Date(fechaVal).toISOString() : new Date().toISOString(),
          notas: `Importado Excel ML (Col A: ${numPedido || '—'}, Col S SKU: ${skuVal || '—'}, Col Z: ${clienteVal})`
        });
        importedCount++;
      }

      setImportMessage(`¡Se importaron ${importedCount} pedidos de Mercado Libre exitosamente!`);
      setTimeout(() => setImportMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setImportMessage('Error al leer el archivo Excel. Verifique el formato.');
      setTimeout(() => setImportMessage(null), 4000);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numPedidoML || !descripcionProducto) return;

    setIsSubmitting(true);
    try {
      await onAddPedidoML({
        numPedidoML,
        clienteML: clienteML || 'Cliente ML',
        sku,
        descripcionProducto,
        cantidad,
        pedidoAKronaline,
        entregado,
        cancelado,
        facturado,
        fecha: new Date().toISOString(),
        notas
      });

      setNumPedidoML('');
      setClienteML('');
      setSku('');
      setDescripcionProducto('');
      setCantidad(1);
      setPedidoAKronaline(false);
      setEntregado(false);
      setCancelado(false);
      setFacturado(false);
      setNotas('');
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-amber-950/90 p-6 rounded-2xl border border-amber-800/80 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">Pedidos Mercado Libre (Omni)</h1>
            <p className="text-amber-200 text-xs mt-0.5">
              Control e integración directa con la plataforma de ventas Mercado Libre Omni.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleExcelImport}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          {/* Import Excel Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer"
            title="Importar mapeando Columna A (Pedido), Col R/V (SKU) y Col AA (Cliente)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Importar Excel ML</span>
          </button>

          {/* External ML Link Button */}
          <a
            href={MERCADO_LIBRE_OMNI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Abrir Mercado Libre Omni</span>
          </a>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-extrabold text-xs px-4 py-2.5 rounded-xl border border-amber-500/30 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Registrar Pedido ML</span>
          </button>
        </div>
      </div>

      {/* Import Notification Banner */}
      {importMessage && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-center space-x-3 text-amber-900 text-xs font-bold animate-fadeIn">
          <FileSpreadsheet className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span>{importMessage}</span>
        </div>
      )}

      {/* Search & Status Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por # Pedido ML, cliente, SKU o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Todos ({pedidosML.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'ACTIVE' ? 'bg-white text-amber-800 shadow-sm' : 'text-slate-500'}`}
          >
            Activos
          </button>
          <button
            onClick={() => setStatusFilter('DELIVERED')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'DELIVERED' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'}`}
          >
            Entregados
          </button>
          <button
            onClick={() => setStatusFilter('CANCELLED')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-colors ${statusFilter === 'CANCELLED' ? 'bg-white text-red-800 shadow-sm' : 'text-slate-500'}`}
          >
            Cancelados
          </button>
        </div>
      </div>

      {/* Main ML Pedidos Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4"># Pedido ML / Fecha</th>
                <th className="py-3 px-4">Cliente ML</th>
                <th className="py-3 px-4">SKU / Producto Requerido</th>
                <th className="py-3 px-4 text-center">Cant.</th>
                <th className="py-3 px-4 text-center bg-cyan-950 text-cyan-300">Salida Almacén GMD</th>
                <th className="py-3 px-4 text-center bg-amber-950 text-amber-300">Pedido a Kronaline</th>
                <th className="py-3 px-4 text-center bg-emerald-950 text-emerald-300">Entregado</th>
                <th className="py-3 px-4 text-center bg-purple-950 text-purple-300">Facturado</th>
                <th className="py-3 px-4 text-center bg-red-950 text-red-300">Estado / Cancelado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPedidos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    No hay pedidos de Mercado Libre registrados en este filtro.
                  </td>
                </tr>
              ) : (
                filteredPedidos.map((p) => (
                  <tr 
                    key={p.id} 
                    className={`transition-colors ${
                      p.cancelado 
                        ? 'bg-red-50/40 text-slate-400' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className={`font-black text-sm ${p.cancelado ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {p.numPedidoML}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(p.fecha).toLocaleDateString('es-MX')}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-800">
                      {p.clienteML}
                    </td>

                    <td className="py-3 px-4 text-slate-700 max-w-[260px]">
                      {p.sku && (
                        <span className="inline-block px-1.5 py-0.5 bg-slate-100 font-mono font-bold text-[10px] text-slate-800 rounded border border-slate-200 mr-1.5">
                          {p.sku}
                        </span>
                      )}
                      <span className={p.cancelado ? 'line-through text-slate-400' : ''}>
                        {p.descripcionProducto}
                      </span>
                      {p.notas && <div className="text-[10px] text-slate-400 italic">{p.notas}</div>}
                    </td>

                    <td className="py-3 px-4 text-center font-extrabold text-slate-900 text-sm">
                      {p.cantidad}
                    </td>

                    {/* Salida Almacén GMD (Descuento Automático de Inventario) */}
                    <td className="py-3 px-4 text-center bg-cyan-50/60">
                      <button
                        onClick={() => {
                          if (!onDescontarAlmacenGMD) return;
                          if (p.salidaAlmacenGMD) {
                            if (confirm(`¿Revertir la salida de almacén para el pedido ${p.numPedidoML}? Se restaurará la cantidad (${p.cantidad}) al inventario.`)) {
                              onDescontarAlmacenGMD(p, true);
                            }
                          } else {
                            onDescontarAlmacenGMD(p, false);
                          }
                        }}
                        disabled={p.cancelado}
                        className={`inline-flex flex-col items-center justify-center space-y-0.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 ${
                          p.salidaAlmacenGMD
                            ? 'bg-cyan-700 text-white shadow-sm ring-2 ring-cyan-500 hover:bg-cyan-600'
                            : 'bg-white border border-cyan-300 text-cyan-800 hover:bg-cyan-100 hover:border-cyan-400'
                        }`}
                        title={p.salidaAlmacenGMD ? "Salida registrada de Almacén GMD. Clic para revertir." : "Hacer clic al salir el material físicamente del almacén GMD para descontar automáticamente del inventario."}
                      >
                        <div className="flex items-center space-x-1">
                          {p.salidaAlmacenGMD ? <CheckSquare className="w-4 h-4 text-cyan-200" /> : <Package className="w-4 h-4 text-cyan-600" />}
                          <span>{p.salidaAlmacenGMD ? 'Salida GMD OK' : 'Salida Almacén GMD'}</span>
                        </div>
                        {p.fechaSalidaAlmacenGMD && (
                          <span className="text-[9px] font-medium text-cyan-100 opacity-90">
                            {new Date(p.fechaSalidaAlmacenGMD).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Pedido a Kronaline Checkbox Column */}
                    <td className="py-3 px-4 text-center bg-amber-50/50">
                      <button
                        onClick={() => onToggleCampoML(p.id, 'pedidoAKronaline', !p.pedidoAKronaline)}
                        disabled={p.cancelado}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 ${
                          p.pedidoAKronaline
                            ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400'
                            : 'bg-white border border-slate-300 text-slate-500 hover:border-amber-400'
                        }`}
                      >
                        {p.pedidoAKronaline ? <CheckSquare className="w-4 h-4 text-white" /> : <Square className="w-4 h-4 text-slate-400" />}
                        <span>{p.pedidoAKronaline ? 'Solicitado Kronaline' : 'Pendiente Kronaline'}</span>
                      </button>
                    </td>

                    {/* Entregado Checkbox Column */}
                    <td className="py-3 px-4 text-center bg-emerald-50/50">
                      <button
                        onClick={() => onToggleCampoML(p.id, 'entregado', !p.entregado)}
                        disabled={p.cancelado}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 ${
                          p.entregado
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                            : 'bg-white border border-slate-300 text-slate-500 hover:border-emerald-400'
                        }`}
                      >
                        {p.entregado ? <CheckSquare className="w-4 h-4 text-white" /> : <Square className="w-4 h-4 text-slate-400" />}
                        <span>{p.entregado ? 'Entregado' : 'Por Entregar'}</span>
                      </button>
                    </td>

                    {/* Facturado Column */}
                    <td className="py-3 px-4 text-center bg-purple-50/50">
                      <button
                        onClick={() => onToggleCampoML(p.id, 'facturado', !p.facturado)}
                        disabled={p.cancelado}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 ${
                          p.facturado
                            ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400'
                            : 'bg-white border border-slate-300 text-slate-500 hover:border-purple-400'
                        }`}
                      >
                        {p.facturado ? <CheckSquare className="w-4 h-4 text-white" /> : <Square className="w-4 h-4 text-slate-400" />}
                        <span>{p.facturado ? 'Facturado' : 'Sin Facturar'}</span>
                      </button>
                    </td>

                    {/* Cancelado Checkbox/Toggle Column */}
                    <td className="py-3 px-4 text-center bg-red-50/50">
                      <button
                        onClick={() => onToggleCampoML(p.id, 'cancelado', !p.cancelado)}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          p.cancelado
                            ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-400'
                            : 'bg-white border border-slate-300 text-slate-500 hover:border-red-400'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>{p.cancelado ? 'CANCELADO' : 'Activo'}</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onDeletePedidoML(p.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar pedido de la lista"
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

        {/* MOBILE CARDS VIEW */}
        <div className="block md:hidden p-3 space-y-3">
          {filteredPedidos.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-bold">
              No hay pedidos de Mercado Libre en este filtro.
            </div>
          ) : (
            filteredPedidos.map((p) => (
              <div 
                key={p.id} 
                className={`p-4 rounded-xl border space-y-3 ${
                  p.cancelado 
                    ? 'bg-red-50/30 border-red-200 opacity-75' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className={`font-black text-sm ${p.cancelado ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {p.numPedidoML}
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-500">
                    {new Date(p.fecha).toLocaleDateString('es-MX')}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div className="font-extrabold text-slate-800">
                    Cliente: <span className="font-bold text-slate-600">{p.clienteML}</span>
                  </div>
                  <div>
                    {p.sku && (
                      <span className="inline-block px-1.5 py-0.5 bg-slate-200 text-slate-800 font-mono font-bold text-[10px] rounded mr-1">
                        {p.sku}
                      </span>
                    )}
                    <span className="font-semibold text-slate-800">{p.descripcionProducto}</span>
                  </div>
                  <div className="font-black text-amber-900 text-xs">
                    Cantidad: {p.cantidad}
                  </div>
                </div>

                {/* Status Toggle Grid for Mobile */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => {
                      if (!onDescontarAlmacenGMD) return;
                      if (p.salidaAlmacenGMD) {
                        if (confirm(`¿Revertir salida para ${p.numPedidoML}?`)) onDescontarAlmacenGMD(p, true);
                      } else {
                        onDescontarAlmacenGMD(p, false);
                      }
                    }}
                    disabled={p.cancelado}
                    className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 ${
                      p.salidaAlmacenGMD ? 'bg-cyan-700 text-white' : 'bg-white border border-cyan-300 text-cyan-800'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>{p.salidaAlmacenGMD ? 'Salida GMD OK' : 'Salida GMD'}</span>
                  </button>

                  <button
                    onClick={() => onToggleCampoML(p.id, 'pedidoAKronaline', !p.pedidoAKronaline)}
                    disabled={p.cancelado}
                    className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 ${
                      p.pedidoAKronaline ? 'bg-amber-600 text-white' : 'bg-white border border-slate-300 text-slate-600'
                    }`}
                  >
                    <span>{p.pedidoAKronaline ? 'Kronaline OK' : 'Kronaline'}</span>
                  </button>

                  <button
                    onClick={() => onToggleCampoML(p.id, 'entregado', !p.entregado)}
                    disabled={p.cancelado}
                    className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 ${
                      p.entregado ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-300 text-slate-600'
                    }`}
                  >
                    <span>{p.entregado ? 'Entregado' : 'Por Entregar'}</span>
                  </button>

                  <button
                    onClick={() => onToggleCampoML(p.id, 'facturado', !p.facturado)}
                    disabled={p.cancelado}
                    className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 ${
                      p.facturado ? 'bg-purple-600 text-white' : 'bg-white border border-slate-300 text-slate-600'
                    }`}
                  >
                    <span>{p.facturado ? 'Facturado' : 'Sin Facturar'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => onToggleCampoML(p.id, 'cancelado', !p.cancelado)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      p.cancelado ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {p.cancelado ? 'CANCELADO' : 'Marcar Cancelado'}
                  </button>

                  <button
                    onClick={() => onDeletePedidoML(p.id)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Agregar Pedido ML */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-base">
                <ShoppingCart className="w-5 h-5 text-amber-600" />
                <span>Registrar Pedido Mercado Libre</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* # Pedido ML */}
              <div>
                <label className="block text-slate-700 font-bold mb-1"># Número de Pedido ML / Guía *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. #20000084739201"
                  value={numPedidoML}
                  onChange={(e) => setNumPedidoML(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs bg-slate-50 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Cliente ML */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cliente ML</label>
                  <input
                    type="text"
                    placeholder="Ej. Carlos Mendoza"
                    value={clienteML}
                    onChange={(e) => setClienteML(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* SKU */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">SKU</label>
                  <input
                    type="text"
                    placeholder="Ej. AL690"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 uppercase focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Producto Requerido */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Descripción del Producto *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ej. Papel Fotográfico Kronaline Glossy 240g 24'' x 30m..."
                  value={descripcionProducto}
                  onChange={(e) => setDescripcionProducto(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Cantidad *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={cantidad}
                  onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Checkboxes Kronaline, Entregado, Facturado, Cancelado */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="flex items-center space-x-2 text-slate-800 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pedidoAKronaline}
                    onChange={(e) => setPedidoAKronaline(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <span>Pedido a Kronaline</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-800 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={entregado}
                    onChange={(e) => setEntregado(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Entregado</span>
                </label>

                <label className="flex items-center space-x-2 text-purple-800 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={facturado}
                    onChange={(e) => setFacturado(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                  />
                  <span>Facturado</span>
                </label>

                <label className="flex items-center space-x-2 text-red-700 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cancelado}
                    onChange={(e) => setCancelado(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                  />
                  <span>Marcar como Cancelado</span>
                </label>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Notas Adicionales</label>
                <input
                  type="text"
                  placeholder="Ej. Paquetería DHL / Guía..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-500"
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
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Pedido ML'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
