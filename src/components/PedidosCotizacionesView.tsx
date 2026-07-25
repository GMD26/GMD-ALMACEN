import React, { useState } from 'react';
import { 
  FileCheck, 
  Plus, 
  Search, 
  Upload, 
  Trash2, 
  Check, 
  Clock, 
  DollarSign, 
  FileText, 
  Download, 
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { CotizacionPedido, ResponsablePedido } from '../types';

interface PedidosCotizacionesViewProps {
  responsable: ResponsablePedido;
  pedidos: CotizacionPedido[];
  onAddPedido: (pedido: Omit<CotizacionPedido, 'id'>) => Promise<void>;
  onUpdatePedido: (id: string, updates: Partial<CotizacionPedido>) => Promise<void>;
  onDeletePedido: (id: string) => Promise<void>;
}

export const PedidosCotizacionesView: React.FC<PedidosCotizacionesViewProps> = ({
  responsable,
  pedidos,
  onAddPedido,
  onUpdatePedido,
  onDeletePedido
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDIENTES' | 'COMPLETADOS'>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Order Form State
  const [folioCotizacion, setFolioCotizacion] = useState('');
  const [cliente, setCliente] = useState('');
  const [resumen, setResumen] = useState('');
  const [total, setTotal] = useState<number>(0);
  const [notas, setNotas] = useState('');
  const [cotizacionPdfName, setCotizacionPdfName] = useState('');
  const [cotizacionPdfUrl, setCotizacionPdfUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPedidos = pedidos.filter(p => {
    if (p.responsable !== responsable) return false;

    const matchesSearch = 
      p.folioCotizacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.resumen.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'COMPLETADOS') {
      return matchesSearch && p.pedidoCompletado;
    }
    if (statusFilter === 'PENDIENTES') {
      return matchesSearch && !p.pedidoCompletado;
    }
    return matchesSearch;
  });

  const handleOpenModal = () => {
    setFolioCotizacion(`COT-${Date.now().toString().slice(-5)}`);
    setCliente('');
    setResumen('');
    setTotal(0);
    setNotas('');
    setCotizacionPdfName('');
    setCotizacionPdfUrl('');
    setIsModalOpen(true);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>, isGuia = false, idForGuia?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (isGuia && idForGuia) {
        onUpdatePedido(idForGuia, {
          guiaPdfUrl: result,
          guiaNombreArchivo: file.name,
          guiaGenerada: true
        });
      } else {
        setCotizacionPdfUrl(result);
        setCotizacionPdfName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente || !resumen) return;

    setIsSubmitting(true);
    try {
      await onAddPedido({
        responsable,
        folioCotizacion,
        cliente,
        resumen,
        total,
        pagado: false,
        pendientePorPedir: true,
        guiaGenerada: false,
        pedidoCompletado: false,
        cotizacionPdfUrl: cotizacionPdfUrl || undefined,
        cotizacionNombreArchivo: cotizacionPdfName || undefined,
        fecha: new Date().toISOString(),
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

  const isMonica = responsable === 'Mónica';
  const badgeColor = isMonica ? 'bg-pink-500 text-white' : 'bg-indigo-600 text-white';
  const accentBorder = isMonica ? 'border-pink-200' : 'border-indigo-200';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-2xl ${isMonica ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}>
            <FileCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-white">Pedidos {responsable}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${badgeColor}`}>
                Módulo Vendedor
              </span>
            </div>
            <p className="text-slate-300 text-xs mt-0.5">
              Control de cotizaciones, validación de pago, estatus de pedido, generación de guía PDF y cierre.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenModal}
          className={`flex items-center space-x-2 ${isMonica ? 'bg-pink-500 hover:bg-pink-400' : 'bg-indigo-500 hover:bg-indigo-400'} text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer`}
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Cotización / Pedido</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, folio o resumen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-slate-400"
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
              Todos ({pedidos.filter(p => p.responsable === responsable).length})
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

      {/* Table of Orders */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Cotización / Folio</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Resumen de Material</th>
                <th className="py-3 px-4 text-right">Total ($)</th>
                <th className="py-3 px-4 text-center">Pagado</th>
                <th className="py-3 px-4 text-center">Pendiente por Pedir</th>
                <th className="py-3 px-4 text-center">Guía Generada</th>
                <th className="py-3 px-4 text-center">Pedido Completado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPedidos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    No hay pedidos registrados para {responsable} en este estatus. Haga clic en "Nueva Cotización / Pedido".
                  </td>
                </tr>
              ) : (
                filteredPedidos.map((pedido) => (
                  <tr key={pedido.id} className={`hover:bg-slate-50 transition-colors ${pedido.pedidoCompletado ? 'bg-emerald-50/20' : ''}`}>
                    
                    {/* Folio & Cotización PDF */}
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900">{pedido.folioCotizacion}</div>
                      <div className="text-[10px] text-slate-400">{new Date(pedido.fecha).toLocaleDateString('es-MX')}</div>
                      {pedido.cotizacionPdfUrl && (
                        <a
                          href={pedido.cotizacionPdfUrl}
                          download={pedido.cotizacionNombreArchivo || `Cotizacion-${pedido.folioCotizacion}.pdf`}
                          className="inline-flex items-center space-x-1 text-[10px] font-bold text-indigo-600 hover:underline mt-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Descargar PDF</span>
                        </a>
                      )}
                    </td>

                    {/* Cliente */}
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {pedido.cliente}
                    </td>

                    {/* Resumen */}
                    <td className="py-3 px-4 text-slate-700 max-w-xs">
                      <p className="line-clamp-2">{pedido.resumen}</p>
                      {pedido.notas && <p className="text-[10px] text-slate-400 italic mt-0.5">{pedido.notas}</p>}
                    </td>

                    {/* Total */}
                    <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                      ${pedido.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Pagado Checkbox */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onUpdatePedido(pedido.id, { pagado: !pedido.pagado })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                          pedido.pagado
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {pedido.pagado ? '✓ Pagado' : 'Pendiente'}
                      </button>
                    </td>

                    {/* Pendiente por Pedir Checkbox */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onUpdatePedido(pedido.id, { pendientePorPedir: !pedido.pendientePorPedir })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                          pedido.pendientePorPedir
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {pedido.pendientePorPedir ? 'Sí (Por pedir)' : 'No (Solicitado)'}
                      </button>
                    </td>

                    {/* Guía Generada Checkbox & Upload */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center space-y-1">
                        <button
                          onClick={() => onUpdatePedido(pedido.id, { guiaGenerada: !pedido.guiaGenerada })}
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                            pedido.guiaGenerada
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          {pedido.guiaGenerada ? '✓ Guía Lista' : 'Sin Guía'}
                        </button>

                        <label className="text-[10px] text-indigo-600 hover:underline font-bold cursor-pointer flex items-center space-x-1">
                          <Upload className="w-2.5 h-2.5" />
                          <span>{pedido.guiaNombreArchivo ? 'Cambiar Guía' : 'Subir PDF'}</span>
                          <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={(e) => handlePdfUpload(e, true, pedido.id)}
                          />
                        </label>

                        {pedido.guiaPdfUrl && (
                          <a
                            href={pedido.guiaPdfUrl}
                            download={pedido.guiaNombreArchivo || `Guia-${pedido.folioCotizacion}.pdf`}
                            className="text-[9px] font-bold text-emerald-600 hover:underline flex items-center space-x-0.5"
                          >
                            <Download className="w-2.5 h-2.5" />
                            <span>Descargar</span>
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Pedido Completado */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onUpdatePedido(pedido.id, { pedidoCompletado: !pedido.pedidoCompletado })}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          pedido.pedidoCompletado
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {pedido.pedidoCompletado ? '✓ Completado' : 'En Proceso'}
                      </button>
                    </td>

                    {/* Delete Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Está seguro de eliminar el pedido ${pedido.folioCotizacion}?`)) {
                            onDeletePedido(pedido.id);
                          }
                        }}
                        title="Eliminar pedido"
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

      {/* Modal Add Pedido */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-base">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                <span>Nueva Cotización / Pedido ({responsable})</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Folio / Cotización *</label>
                  <input
                    type="text"
                    required
                    value={folioCotizacion}
                    onChange={(e) => setFolioCotizacion(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del cliente"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Resumen de Material / Productos *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Detalle de SKUs, medidas y cantidades del pedido..."
                  value={resumen}
                  onChange={(e) => setResumen(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Total ($ MXN) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={total}
                  onChange={(e) => setTotal(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Subir PDF de Cotización */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Adjuntar Cotización PDF (Opcional)</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handlePdfUpload(e, false)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                {cotizacionPdfName && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ PDF seleccionado: {cotizacionPdfName}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Notas adicionales</label>
                <input
                  type="text"
                  placeholder="Instrucciones de entrega, cobro, etc."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500"
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
                  {isSubmitting ? 'Guardando...' : 'Crear Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
