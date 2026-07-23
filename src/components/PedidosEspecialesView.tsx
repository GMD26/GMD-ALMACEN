import React, { useState } from 'react';
import { ShoppingBag, Plus, Search, Filter, CheckCircle2, Clock, Trash2, UserCheck, FileText } from 'lucide-react';
import { PedidoEspecial, VendedorNombre, Product } from '../types';

interface PedidosEspecialesViewProps {
  pedidosEspeciales: PedidoEspecial[];
  products?: Product[];
  onAddPedidoEspecial: (pedido: Omit<PedidoEspecial, 'id' | 'createdAt' | 'folio'>) => Promise<void>;
  onUpdateEstado?: (id: string, nuevoEstado: PedidoEspecial['estado']) => Promise<void>;
  onUpdateEstadoPedido?: (id: string, nuevoEstado: PedidoEspecial['estado']) => Promise<void>;
  onDeletePedidoEspecial: (id: string) => Promise<void>;
}

export const PedidosEspecialesView: React.FC<PedidosEspecialesViewProps> = ({
  pedidosEspeciales,
  products,
  onAddPedidoEspecial,
  onUpdateEstado,
  onUpdateEstadoPedido,
  onDeletePedidoEspecial
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNombre, setFilterNombre] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [nombre, setNombre] = useState<VendedorNombre>('Luis');
  const [cliente, setCliente] = useState('');
  const [detalles, setDetalles] = useState('');
  const [montoEstimado, setMontoEstimado] = useState<number>(0);
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPedidos = pedidosEspeciales.filter(p => {
    const matchesNombre = filterNombre === 'ALL' || p.nombre === filterNombre;
    const matchesSearch = p.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.detalles.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.folio || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesNombre && matchesSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente || !detalles) return;

    setIsSubmitting(true);
    try {
      await onAddPedidoEspecial({
        nombre,
        cliente,
        detalles,
        montoEstimado: montoEstimado || 0,
        fecha: new Date().toISOString(),
        estado: 'PENDIENTE',
        notas
      });

      setCliente('');
      setDetalles('');
      setMontoEstimado(0);
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
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">Pedidos Especiales</h1>
            <p className="text-slate-300 text-xs mt-0.5">
              Gestión y seguimiento exclusivo de solictudes de materiales fuera de catálogo estándar.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Pedido Especial</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar pedido por cliente, folio o material..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold text-slate-600">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Nombre / Responsable:</span>
          <select
            value={filterNombre}
            onChange={(e) => setFilterNombre(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
          >
            <option value="ALL">Todos (Luis, Manuel, César, Mostrador, ML)</option>
            <option value="Luis">Luis</option>
            <option value="Manuel">Manuel</option>
            <option value="César">César</option>
            <option value="Mostrador">Mostrador</option>
            <option value="Mercado Libre">Mercado Libre</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Folio / Fecha</th>
                <th className="py-3 px-4">Responsable (Nombre)</th>
                <th className="py-3 px-4">Cliente / Contacto</th>
                <th className="py-3 px-4">Detalles del Material Especial</th>
                <th className="py-3 px-4 text-right">Monto Est. ($)</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPedidos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No hay pedidos especiales registrados con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredPedidos.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900">{p.folio || `#PE-${p.id.substring(0, 5)}`}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(p.fecha).toLocaleDateString('es-MX')}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 bg-cyan-100 text-cyan-900 font-black rounded-lg text-xs">
                          {p.nombre}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800">{p.cliente}</td>

                      <td className="py-3 px-4 text-slate-700 max-w-[280px]">
                        <div>{p.detalles}</div>
                        {p.notas && <div className="text-[10px] text-slate-400 italic">{p.notas}</div>}
                      </td>

                      <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                        ${(p.montoEstimado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <select
                          value={p.estado}
                          onChange={(e) => {
                            const handler = onUpdateEstado || onUpdateEstadoPedido;
                            if (handler) handler(p.id, e.target.value as any);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${
                            p.estado === 'COMPLETADO'
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                              : p.estado === 'EN_PROCESO'
                              ? 'bg-amber-100 border-amber-300 text-amber-800'
                              : p.estado === 'CANCELADO'
                              ? 'bg-red-100 border-red-300 text-red-800'
                              : 'bg-slate-100 border-slate-300 text-slate-700'
                          }`}
                        >
                          <option value="PENDIENTE">PENDIENTE</option>
                          <option value="EN_PROCESO">EN PROCESO</option>
                          <option value="COMPLETADO">COMPLETADO</option>
                          <option value="CANCELADO">CANCELADO</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onDeletePedidoEspecial(p.id)}
                          title="Eliminar pedido especial"
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Pedido Especial */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-base">
                <ShoppingBag className="w-5 h-5 text-cyan-600" />
                <span>Registrar Pedido Especial</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Selector Nombre (Luis, Manuel, César, Mostrador, Mercado Libre) */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nombre (Responsable) *</label>
                <select
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value as VendedorNombre)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs bg-slate-50 focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="Luis">Luis</option>
                  <option value="Manuel">Manuel</option>
                  <option value="César">César</option>
                  <option value="Mostrador">Mostrador</option>
                  <option value="Mercado Libre">Mercado Libre</option>
                </select>
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Cliente / Empresa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Diseño Impreso S.A. / Juan Pérez"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Detalles */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Detalles del Material Requerido *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ej. 5 rollos Papel Fotográfico Satinado 260g 44'' especial..."
                  value={detalles}
                  onChange={(e) => setDetalles(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Monto Estimado */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Monto Estimado ($ MXN)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={montoEstimado}
                  onChange={(e) => setMontoEstimado(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Notas Adicionales</label>
                <input
                  type="text"
                  placeholder="Ej. Proveedor directo o urgencia..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-cyan-500"
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
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-400 font-bold rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : 'Crear Pedido Especial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
