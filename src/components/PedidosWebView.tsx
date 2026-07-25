import React, { useState, useRef } from 'react';
import { 
  Globe, 
  Plus, 
  Search, 
  ExternalLink, 
  Upload, 
  Trash2, 
  Check, 
  Filter, 
  FileSpreadsheet, 
  Download,
  ShoppingBag,
  Truck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PedidoWeb } from '../types';

interface PedidosWebViewProps {
  pedidos: PedidoWeb[];
  onAddPedido: (pedido: Omit<PedidoWeb, 'id'>) => Promise<void>;
  onUpdatePedido: (id: string, updates: Partial<PedidoWeb>) => Promise<void>;
  onDeletePedido: (id: string) => Promise<void>;
}

export const PedidosWebView: React.FC<PedidosWebViewProps> = ({
  pedidos,
  onAddPedido,
  onUpdatePedido,
  onDeletePedido
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDIENTES' | 'COMPLETADOS'>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [numPedido, setNumPedido] = useState('');
  const [fechaPedido, setFechaPedido] = useState(new Date().toISOString().split('T')[0]);
  const [sku, setSku] = useState('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [direccionEnvio, setDireccionEnvio] = useState('');
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const filteredPedidos = pedidos.filter(p => {
    const matchesSearch = 
      p.numPedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.direccionEnvio.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'COMPLETADOS') return matchesSearch && p.completado;
    if (statusFilter === 'PENDIENTES') return matchesSearch && !p.completado;
    return matchesSearch;
  });

  const handleOpenModal = () => {
    setNumPedido(`WEB-${Date.now().toString().slice(-5)}`);
    setFechaPedido(new Date().toISOString().split('T')[0]);
    setSku('');
    setCantidad(1);
    setDireccionEnvio('');
    setNotas('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numPedido || !sku || !direccionEnvio) return;

    setIsSubmitting(true);
    try {
      await onAddPedido({
        numPedido,
        fechaPedido,
        sku,
        cantidad,
        direccionEnvio,
        recibido: true,
        pedidoKronaline: false,
        guiaGenerada: false,
        completado: false,
        notas: notas || undefined,
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Import Excel/CSV file from WooCommerce export
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        let count = 0;
        for (const row of data) {
          const numP = row['Número de pedido'] || row['Order Number'] || row['Pedido'] || row['ID'] || `WEB-${Math.floor(Math.random() * 10000)}`;
          const skuVal = row['SKU'] || row['Código'] || row['Producto'] || 'SKU-GENERAL';
          const qtyVal = parseInt(row['Cantidad'] || row['Qty'] || '1') || 1;
          const addressVal = row['Dirección'] || row['Shipping Address'] || row['Dirección de envío'] || 'Dirección de envío web';
          const fechaVal = row['Fecha'] || new Date().toISOString().split('T')[0];

          await onAddPedido({
            numPedido: String(numP),
            fechaPedido: String(fechaVal),
            sku: String(skuVal),
            cantidad: qtyVal,
            direccionEnvio: String(addressVal),
            recibido: true,
            pedidoKronaline: false,
            guiaGenerada: false,
            completado: false,
            createdAt: new Date().toISOString()
          });
          count++;
        }
        setImportStatus(`Se importaron ${count} pedidos web correctamente.`);
      } catch (err) {
        console.error(err);
        setImportStatus('Error al procesar el archivo Excel/CSV.');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner with WordPress Link */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
            <Globe className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-white">Pedidos Web (WooCommerce)</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white">
                Sitio Web
              </span>
            </div>
            <p className="text-slate-300 text-xs mt-0.5">
              Gestión de pedidos ingresados vía WordPress/WooCommerce. Vínculo directo a administración e importación de pedidos.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://grupomasdigital.com/wp-admin/edit.php?post_type=shop_order"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Ir a Pedidos WordPress</span>
          </a>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Importar CSV / Excel</span>
          </button>

          <button
            onClick={handleOpenModal}
            className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Pedido Web</span>
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-between">
          <span>{importStatus}</span>
          <button onClick={() => setImportStatus(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por # pedido, SKU o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold text-slate-600">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filtrar Estatus:</span>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setStatusFilter('TODOS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${statusFilter === 'TODOS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Todos ({pedidos.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDIENTES')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${statusFilter === 'PENDIENTES' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETADOS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${statusFilter === 'COMPLETADOS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Completados
            </button>
          </div>
        </div>
      </div>

      {/* Table of Web Orders */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4"># Pedido</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4 text-center">Cantidad</th>
                <th className="py-3 px-4">Dirección de Envío</th>
                <th className="py-3 px-4 text-center">Recibido</th>
                <th className="py-3 px-4 text-center">Pedido Kronaline</th>
                <th className="py-3 px-4 text-center">Guía</th>
                <th className="py-3 px-4 text-center">Completado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPedidos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    No hay pedidos web registrados en este filtro. Importe desde Excel/CSV o haga clic en "Nuevo Pedido Web".
                  </td>
                </tr>
              ) : (
                filteredPedidos.map((pedido) => (
                  <tr key={pedido.id} className={`hover:bg-slate-50 transition-colors ${pedido.completado ? 'bg-emerald-50/20' : ''}`}>
                    <td className="py-3 px-4 font-black text-slate-900">
                      {pedido.numPedido}
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-semibold">
                      {pedido.fechaPedido}
                    </td>

                    <td className="py-3 px-4 font-extrabold text-blue-700">
                      {pedido.sku}
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {pedido.cantidad}
                    </td>

                    <td className="py-3 px-4 text-slate-700 max-w-xs">
                      <p className="line-clamp-2">{pedido.direccionEnvio}</p>
                      {pedido.notas && <p className="text-[10px] text-slate-400 italic mt-0.5">{pedido.notas}</p>}
                    </td>

                    {/* Recibido */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onUpdatePedido(pedido.id, { recibido: !pedido.recibido })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          pedido.recibido
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        {pedido.recibido ? '✓ Recibido' : 'Pendiente'}
                      </button>
                    </td>

                    {/* Pedido Kronaline */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onUpdatePedido(pedido.id, { pedidoKronaline: !pedido.pedidoKronaline })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          pedido.pedidoKronaline
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        {pedido.pedidoKronaline ? '✓ Solicitado' : 'Sin Solicitar'}
                      </button>
                    </td>

                    {/* Guía */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onUpdatePedido(pedido.id, { guiaGenerada: !pedido.guiaGenerada })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          pedido.guiaGenerada
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        {pedido.guiaGenerada ? '✓ Generada' : 'Pendiente'}
                      </button>
                    </td>

                    {/* Completado */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onUpdatePedido(pedido.id, { completado: !pedido.completado })}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          pedido.completado
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {pedido.completado ? '✓ Completado' : 'En Proceso'}
                      </button>
                    </td>

                    {/* Delete Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Está seguro de eliminar el pedido ${pedido.numPedido}?`)) {
                            onDeletePedido(pedido.id);
                          }
                        }}
                        title="Eliminar pedido web"
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
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

      {/* Modal Add Pedido Web */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-base">
                <Globe className="w-5 h-5 text-blue-600" />
                <span>Nuevo Pedido Web</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Número de Pedido *</label>
                  <input
                    type="text"
                    required
                    value={numPedido}
                    onChange={(e) => setNumPedido(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fecha de Pedido *</label>
                  <input
                    type="date"
                    required
                    value={fechaPedido}
                    onChange={(e) => setFechaPedido(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">SKU Producto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Código SKU del producto"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-center text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Dirección de Envío Completa *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Calle, número, colonia, código postal, ciudad, estado y teléfono..."
                  value={direccionEnvio}
                  onChange={(e) => setDireccionEnvio(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Notas / Observaciones</label>
                <input
                  type="text"
                  placeholder="Notas de paquetería o cliente..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
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
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : 'Crear Pedido Web'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
