import React, { useState, useRef } from 'react';
import { ExternalLink, ShoppingCart, Plus, Search, Check, CheckSquare, Square, Trash2, Package, Truck, AlertCircle, FileSpreadsheet, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PedidoMercadoLibre } from '../types';

interface PedidosMercadoLibreViewProps {
  pedidosML: PedidoMercadoLibre[];
  onAddPedidoML: (pedido: Omit<PedidoMercadoLibre, 'id' | 'createdAt'>) => Promise<void>;
  onToggleCampoML: (id: string, field: 'pedidoAKronaline' | 'entregado', value: boolean) => Promise<void>;
  onDeletePedidoML: (id: string) => Promise<void>;
}

export const MERCADO_LIBRE_OMNI_URL = 'https://www.mercadolibre.com.mx/ventas/omni/listado?filters=TAB_NEXT_DAYS&subFilters=&search=&limit=50&offset=0&startPeriod=';

export const PedidosMercadoLibreView: React.FC<PedidosMercadoLibreViewProps> = ({
  pedidosML,
  onAddPedidoML,
  onToggleCampoML,
  onDeletePedidoML
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [numPedidoML, setNumPedidoML] = useState('');
  const [clienteML, setClienteML] = useState('');
  const [descripcionProducto, setDescripcionProducto] = useState('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [pedidoAKronaline, setPedidoAKronaline] = useState<boolean>(false);
  const [entregado, setEntregado] = useState<boolean>(false);
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPedidos = pedidosML.filter(p =>
    p.numPedidoML.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.clienteML.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.descripcionProducto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportMessage('Procesando archivo Excel...');
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonRows.length === 0) {
        setImportMessage('El archivo Excel está vacío.');
        setTimeout(() => setImportMessage(null), 3000);
        return;
      }

      let importedCount = 0;
      for (const row of jsonRows) {
        // Try flexibly matching common ML Excel columns
        const numPedido = String(
          row['# Pedido ML'] ||
          row['# Venta'] ||
          row['Número de venta'] ||
          row['N° de venta'] ||
          row['Orden'] ||
          row['ID Venta'] ||
          row['Pedido'] ||
          `ML-${Date.now().toString().slice(-6)}-${importedCount + 1}`
        ).trim();

        const cliente = String(
          row['Cliente ML'] ||
          row['Cliente'] ||
          row['Comprador'] ||
          row['Nombre'] ||
          'Cliente ML'
        ).trim();

        const descripcion = String(
          row['Producto Requerido'] ||
          row['Producto'] ||
          row['Título'] ||
          row['Descripcion'] ||
          row['Descripción'] ||
          row['Publicación'] ||
          'Producto ML'
        ).trim();

        const cantNum = parseInt(
          row['Cantidad'] || row['Unidades'] || row['Cant'] || '1',
          10
        ) || 1;

        const kronalineBool = String(row['Pedido a Kronaline'] || row['Kronaline'] || '').toUpperCase().includes('SI') || String(row['Pedido a Kronaline'] || row['Kronaline'] || '').toUpperCase().includes('TRUE');
        const entregadoBool = String(row['Entregado'] || '').toUpperCase().includes('SI') || String(row['Entregado'] || '').toUpperCase().includes('TRUE');
        const notaStr = String(row['Notas'] || row['Observaciones'] || 'Importado por Excel ML').trim();

        if (descripcion) {
          await onAddPedidoML({
            numPedidoML: numPedido,
            clienteML: cliente,
            descripcionProducto: descripcion,
            cantidad: cantNum,
            pedidoAKronaline: kronalineBool,
            entregado: entregadoBool,
            fecha: new Date().toISOString(),
            notas: notaStr
          });
          importedCount++;
        }
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
        descripcionProducto,
        cantidad,
        pedidoAKronaline,
        entregado,
        fecha: new Date().toISOString(),
        notas
      });

      setNumPedidoML('');
      setClienteML('');
      setDescripcionProducto('');
      setCantidad(1);
      setPedidoAKronaline(false);
      setEntregado(false);
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

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por # Pedido ML, cliente o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <span className="text-xs text-slate-500 font-bold hidden sm:inline-block">
          {filteredPedidos.length} pedidos en lista
        </span>
      </div>

      {/* Main ML Pedidos Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4"># Pedido ML / Fecha</th>
                <th className="py-3 px-4">Cliente ML</th>
                <th className="py-3 px-4">Producto Requerido</th>
                <th className="py-3 px-4 text-center">Cant.</th>
                <th className="py-3 px-4 text-center bg-amber-950 text-amber-300">Pedido a Kronaline</th>
                <th className="py-3 px-4 text-center bg-emerald-950 text-emerald-300">Entregado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPedidos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No hay pedidos de Mercado Libre registrados. Registre uno o abra el portal de Mercado Libre.
                  </td>
                </tr>
              ) : (
                filteredPedidos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-900 text-sm">{p.numPedidoML}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(p.fecha).toLocaleDateString('es-MX')}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-800">
                      {p.clienteML}
                    </td>

                    <td className="py-3 px-4 text-slate-700 max-w-[260px]">
                      <div>{p.descripcionProducto}</div>
                      {p.notas && <div className="text-[10px] text-slate-400 italic">{p.notas}</div>}
                    </td>

                    <td className="py-3 px-4 text-center font-extrabold text-slate-900 text-sm">
                      {p.cantidad}
                    </td>

                    {/* Pedido a Kronaline Checkbox Column */}
                    <td className="py-3 px-4 text-center bg-amber-50/50">
                      <button
                        onClick={() => onToggleCampoML(p.id, 'pedidoAKronaline', !p.pedidoAKronaline)}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          p.pedidoAKronaline
                            ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400'
                            : 'bg-white border border-slate-300 text-slate-500 hover:border-amber-400'
                        }`}
                      >
                        {p.pedidoAKronaline ? <CheckSquare className="w-4 h-4 text-white" /> : <Square className="w-4 h-4 text-slate-400" />}
                        <span>{p.pedidoAKronaline ? 'Solicitado a Kronaline' : 'Pendiente Kronaline'}</span>
                      </button>
                    </td>

                    {/* Entregado Checkbox Column */}
                    <td className="py-3 px-4 text-center bg-emerald-50/50">
                      <button
                        onClick={() => onToggleCampoML(p.id, 'entregado', !p.entregado)}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          p.entregado
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                            : 'bg-white border border-slate-300 text-slate-500 hover:border-emerald-400'
                        }`}
                      >
                        {p.entregado ? <CheckSquare className="w-4 h-4 text-white" /> : <Square className="w-4 h-4 text-slate-400" />}
                        <span>{p.entregado ? 'Entregado' : 'Por Entregar'}</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onDeletePedidoML(p.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar registro"
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

              {/* Cliente ML */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nombre del Cliente (Mercado Libre)</label>
                <input
                  type="text"
                  placeholder="Ej. Carlos Mendoza"
                  value={clienteML}
                  onChange={(e) => setClienteML(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Producto Requerido */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Descripción del Producto / SKU *</label>
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

              {/* Checkboxes Kronaline & Entregado */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="flex items-center space-x-2 text-slate-800 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pedidoAKronaline}
                    onChange={(e) => setPedidoAKronaline(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <span>Pedido a Kronaline (solicitado al proveedor)</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-800 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={entregado}
                    onChange={(e) => setEntregado(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Entregado al cliente / paquetería</span>
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
