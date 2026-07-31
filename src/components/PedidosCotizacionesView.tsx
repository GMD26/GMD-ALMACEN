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
  FileSpreadsheet,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layers,
  X
} from 'lucide-react';
import { CotizacionPedido, ResponsablePedido, CotizacionItem } from '../types';
import { parseQuotePdf, ExtractedQuoteData } from '../utils/pdfQuoteParser';
import { cleanFirestoreData } from '../utils/firestoreSanitizer';

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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New Order Form State
  const [folioCotizacion, setFolioCotizacion] = useState('');
  const [cliente, setCliente] = useState('');
  const [resumen, setResumen] = useState('');
  const [subtotal, setSubtotal] = useState<number>(0);
  const [iva, setIva] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [fechaCotizacion, setFechaCotizacion] = useState<string>(new Date().toISOString().split('T')[0]);
  const [partidas, setPartidas] = useState<CotizacionItem[]>([]);
  const [facturado, setFacturado] = useState<boolean>(false);
  const [notas, setNotas] = useState('');
  const [cotizacionPdfName, setCotizacionPdfName] = useState('');
  const [cotizacionPdfUrl, setCotizacionPdfUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parsing indicator state
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [parseNotice, setParseNotice] = useState<string | null>(null);

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
    setSubtotal(0);
    setIva(0);
    setTotal(0);
    setFechaCotizacion(new Date().toISOString().split('T')[0]);
    setPartidas([]);
    setFacturado(false);
    setNotas('');
    setCotizacionPdfName('');
    setCotizacionPdfUrl('');
    setParseNotice(null);
    setIsModalOpen(true);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>, isGuia = false, idForGuia?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
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

        // Auto-extract quote information from PDF
        setIsParsingPdf(true);
        setParseNotice('Procesando PDF y extrayendo datos de la cotización...');
        try {
          const extracted: ExtractedQuoteData = await parseQuotePdf(file);
          if (extracted.folioCotizacion) setFolioCotizacion(extracted.folioCotizacion);
          if (extracted.cliente) setCliente(extracted.cliente);
          if (extracted.fecha) setFechaCotizacion(extracted.fecha);
          
          const calcSubtotal = extracted.subtotal || (extracted.total ? Math.round((extracted.total / 1.16) * 100) / 100 : 0);
          const calcIva = extracted.iva || (calcSubtotal > 0 ? Math.round((calcSubtotal * 0.16) * 100) / 100 : 0);
          const calcTotal = Math.round((calcSubtotal + calcIva) * 100) / 100;

          setSubtotal(calcSubtotal);
          setIva(calcIva);
          setTotal(calcTotal);
          
          if (extracted.resumen) {
            setResumen(extracted.resumen);
          } else if (extracted.partidas && extracted.partidas.length > 0) {
            setResumen(extracted.partidas.map(p => `${p.cantidad}x ${p.descripcion}`).join(', '));
          } else if (extracted.folioCotizacion) {
            setResumen(`Cotización ${extracted.folioCotizacion}`);
          }

          if (extracted.partidas && extracted.partidas.length > 0) {
            setPartidas(extracted.partidas);
          }

          setParseNotice(`✨ Auto-llenado exitoso desde "${file.name}": Folio (${extracted.folioCotizacion || 'N/D'}), Cliente (${extracted.cliente || 'N/D'}), Total ($${extracted.total.toLocaleString('es-MX')}) y ${extracted.partidas.length} productos detectados.`);
        } catch (err: any) {
          console.error(err);
          setParseNotice('PDF adjuntado correctamente. (El archivo no contenía texto legible de cotización, introduzca los datos manualmente si es necesario).');
        } finally {
          setIsParsingPdf(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCliente = cliente.trim() || 'Cliente Cotización';
    let finalResumen = resumen.trim();
    if (!finalResumen) {
      if (partidas.length > 0) {
        finalResumen = partidas.map(p => `${p.cantidad}x ${p.descripcion}`).join(', ');
      } else {
        finalResumen = `Cotización ${folioCotizacion || 'S/N'}`;
      }
    }

    setIsSubmitting(true);
    try {
      const cleanPartidas = (partidas || []).map(p => ({
        codigo: p.codigo || '',
        descripcion: p.descripcion || '',
        cantidad: Number(p.cantidad) || 1,
        valorUnitario: Number(p.valorUnitario) || 0,
        importe: Number(p.importe) || 0
      }));

      const payload = cleanFirestoreData({
        responsable,
        folioCotizacion: folioCotizacion.trim() || `COT-${Date.now().toString().slice(-5)}`,
        cliente: finalCliente,
        resumen: finalResumen,
        subtotal: Number(subtotal) || 0,
        iva: Number(iva) || 0,
        total: Number(total) || 0,
        partidas: cleanPartidas,
        pagado: false,
        pendientePorPedir: true,
        guiaGenerada: false,
        pedidoCompletado: false,
        facturado,
        cotizacionPdfUrl: cotizacionPdfUrl || '',
        cotizacionNombreArchivo: cotizacionPdfName || '',
        fecha: fechaCotizacion || new Date().toISOString(),
        notas: notas || '',
        createdAt: new Date().toISOString()
      });

      await onAddPedido(payload);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error al crear el pedido de cotización:', err);
      const errorMsg = err?.message || String(err);
      alert(`⚠️ Error al guardar el pedido:\n\n${errorMsg}\n\nPor favor revise los campos del formulario.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMonica = responsable === 'Mónica';
  const badgeColor = isMonica ? 'bg-pink-500 text-white' : 'bg-indigo-600 text-white';

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
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>Auto-llenado PDF Activo</span>
              </span>
            </div>
            <p className="text-slate-300 text-xs mt-0.5">
              Control de cotizaciones, auto-lectura de PDF (Folio, Cliente, Partidas, Subtotal, IVA, Total), validación de pago y emisión de guía.
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
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80 flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por cliente, folio o resumen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filtrar Estatus:</span>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setStatusFilter('TODOS')}
              className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'TODOS' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Todos ({pedidos.filter(p => p.responsable === responsable).length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDIENTES')}
              className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'PENDIENTES' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETADOS')}
              className={`px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'COMPLETADOS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Completados
            </button>
          </div>
        </div>
      </div>

      {/* Table of Orders */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
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
                <th className="py-3 px-4 text-center bg-purple-950 text-purple-300">Facturado</th>
                <th className="py-3 px-4 text-center">Pedido Completado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPedidos.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    No hay pedidos registrados para {responsable} en este estatus. Haga clic en "Nueva Cotización / Pedido".
                  </td>
                </tr>
              ) : (
                filteredPedidos.map((pedido) => {
                  const isExpanded = expandedId === pedido.id;
                  return (
                    <React.Fragment key={pedido.id}>
                      <tr className={`hover:bg-slate-50 transition-colors ${pedido.pedidoCompletado ? 'bg-emerald-50/20' : ''}`}>
                        
                        {/* Folio & Cotización PDF */}
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                            <span>{pedido.folioCotizacion}</span>
                            {pedido.partidas && pedido.partidas.length > 0 && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : pedido.id)}
                                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded flex items-center space-x-1 font-bold cursor-pointer"
                                title="Ver desglose de partidas"
                              >
                                <span>{pedido.partidas.length} ítems</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
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
                          {pedido.subtotal ? (
                            <div className="text-[10px] text-slate-500 font-semibold mt-1">
                              Subtotal: ${pedido.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} | IVA: ${pedido.iva?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                            </div>
                          ) : null}
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

                        {/* Facturado Checkbox */}
                        <td className="py-3 px-4 text-center bg-purple-50/50">
                          <button
                            onClick={() => onUpdatePedido(pedido.id, { facturado: !pedido.facturado })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                              pedido.facturado
                                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400'
                                : 'bg-white border border-slate-300 text-slate-500 hover:border-purple-400'
                            }`}
                          >
                            {pedido.facturado ? '✓ Facturado' : 'Sin Facturar'}
                          </button>
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

                      {/* Expanded Items Table */}
                      {isExpanded && pedido.partidas && (
                        <tr className="bg-indigo-50/40 border-b border-indigo-100">
                          <td colSpan={9} className="p-4">
                            <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-inner space-y-2">
                              <div className="flex items-center space-x-2 text-indigo-900 font-extrabold text-xs">
                                <Layers className="w-4 h-4 text-indigo-600" />
                                <span>Desglose de Partidas Extraídas de Cotización {pedido.folioCotizacion}</span>
                              </div>

                              <table className="w-full text-left text-[11px] border border-slate-200 rounded-lg overflow-hidden">
                                <thead className="bg-slate-100 font-bold text-slate-700">
                                  <tr>
                                    <th className="py-1.5 px-3">Código / SKU</th>
                                    <th className="py-1.5 px-3">Descripción</th>
                                    <th className="py-1.5 px-3 text-center">Cantidad</th>
                                    <th className="py-1.5 px-3 text-right">Valor Unitario ($)</th>
                                    <th className="py-1.5 px-3 text-right">Importe ($)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                                  {pedido.partidas.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                      <td className="py-1 px-3 font-mono font-bold text-indigo-700">{item.codigo || '-'}</td>
                                      <td className="py-1 px-3">{item.descripcion}</td>
                                      <td className="py-1 px-3 text-center font-bold">{item.cantidad}</td>
                                      <td className="py-1 px-3 text-right">${item.valorUnitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                      <td className="py-1 px-3 text-right font-black">${item.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS VIEW */}
        <div className="block md:hidden p-3 space-y-3">
          {filteredPedidos.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-bold">
              No hay pedidos registrados para {responsable} en este estatus.
            </div>
          ) : (
            filteredPedidos.map((pedido) => (
              <div 
                key={pedido.id}
                className={`p-4 rounded-xl border space-y-3 ${
                  pedido.pedidoCompletado 
                    ? 'bg-emerald-50/30 border-emerald-200' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-black text-slate-900 text-sm">
                    {pedido.folioCotizacion}
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-500">
                    {new Date(pedido.fecha).toLocaleDateString('es-MX')}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div className="font-black text-slate-900">
                    Cliente: <span className="font-extrabold text-indigo-900">{pedido.cliente}</span>
                  </div>
                  <div className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200 text-xs leading-relaxed">
                    <span className="font-bold text-slate-500 block text-[10px] uppercase">Resumen:</span>
                    {pedido.resumen}
                  </div>
                  <div className="font-black text-slate-900 text-sm text-right pt-1">
                    Total: ${pedido.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Status Toggles on Mobile */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => onUpdatePedido(pedido.id, { pagado: !pedido.pagado })}
                    className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold ${
                      pedido.pagado ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-white border border-slate-300 text-slate-600'
                    }`}
                  >
                    {pedido.pagado ? '✓ Pagado' : 'Pendiente Pago'}
                  </button>

                  <button
                    onClick={() => onUpdatePedido(pedido.id, { pendientePorPedir: !pedido.pendientePorPedir })}
                    className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold ${
                      pedido.pendientePorPedir ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {pedido.pendientePorPedir ? 'Por pedir' : 'Solicitado'}
                  </button>

                  <button
                    onClick={() => onUpdatePedido(pedido.id, { guiaGenerada: !pedido.guiaGenerada })}
                    className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold ${
                      pedido.guiaGenerada ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-white border border-slate-300 text-slate-600'
                    }`}
                  >
                    {pedido.guiaGenerada ? '✓ Guía Lista' : 'Sin Guía'}
                  </button>

                  <button
                    onClick={() => onUpdatePedido(pedido.id, { facturado: !pedido.facturado })}
                    className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold ${
                      pedido.facturado ? 'bg-purple-600 text-white' : 'bg-white border border-slate-300 text-slate-600'
                    }`}
                  >
                    {pedido.facturado ? '✓ Facturado' : 'Sin Facturar'}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <button
                    onClick={() => onUpdatePedido(pedido.id, { pedidoCompletado: !pedido.pedidoCompletado })}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      pedido.pedidoCompletado ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {pedido.pedidoCompletado ? '✓ Completado' : 'Marcar Completado'}
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`¿Eliminar ${pedido.folioCotizacion}?`)) onDeletePedido(pedido.id);
                    }}
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

      {/* Modal Add Pedido */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-base">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                <span>Nueva Cotización / Pedido ({responsable})</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            {/* Subir PDF de Cotización Banner */}
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-indigo-900 font-extrabold text-xs">
                  <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                  <span>Auto-llenado inteligente desde PDF</span>
                </div>
                <label className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center space-x-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{cotizacionPdfName ? 'Cambiar PDF' : 'Subir Cotización PDF'}</span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => handlePdfUpload(e, false)}
                  />
                </label>
              </div>

              {isParsingPdf && (
                <div className="text-xs text-indigo-700 font-bold animate-pulse flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Leyendo Serie/Folio, Cliente, Partidas, Subtotal, IVA y Total...</span>
                </div>
              )}

              {parseNotice && !isParsingPdf && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-start space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{parseNotice}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Folio / Serie *</label>
                  <input
                    type="text"
                    required
                    value={folioCotizacion}
                    onChange={(e) => setFolioCotizacion(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cliente / Contacto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del cliente o razón social"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fecha Cotización</label>
                  <input
                    type="date"
                    value={fechaCotizacion}
                    onChange={(e) => setFechaCotizacion(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Subtotal ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={subtotal}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setSubtotal(val);
                      setTotal(Math.round((val + iva) * 100) / 100);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">IVA ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={iva}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setIva(val);
                      setTotal(Math.round((subtotal + val) * 100) / 100);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Resumen de Material / Productos</label>
                <textarea
                  rows={2}
                  placeholder="Detalle de SKUs, cantidades, precios (se auto-genera desde el PDF si no se captura)..."
                  value={resumen}
                  onChange={(e) => setResumen(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {partidas.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                  <div className="font-bold text-slate-800 text-xs">
                    Partidas / Productos Detectados ({partidas.length}):
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {partidas.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] p-1.5 bg-white border border-slate-200 rounded-lg">
                        <span className="font-mono text-indigo-700 font-bold">{item.codigo || `Ítem ${idx + 1}`}</span>
                        <span className="truncate max-w-[200px] text-slate-800">{item.descripcion}</span>
                        <span className="font-bold">{item.cantidad}x</span>
                        <span className="font-black text-slate-900">${item.importe.toLocaleString('es-MX')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

              <div className="pt-1 border-t border-slate-100">
                <label className="flex items-center space-x-2 text-purple-800 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={facturado}
                    onChange={(e) => setFacturado(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                  />
                  <span>Facturado</span>
                </label>
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
