import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Filter, 
  Search, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Calendar, 
  FileText,
  DollarSign,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { Product, InventoryMovement } from '../types';
import { generateInventoryReportPDF } from '../utils/pdfGenerator';

interface ReportsViewProps {
  products: Product[];
  movements: InventoryMovement[];
  onResetMovements?: (tipoFilter?: 'ENTRADA' | 'SALIDA' | 'ALL') => Promise<void>;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  products,
  movements,
  onResetMovements
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ENTRADA' | 'SALIDA'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async (tipo: 'ENTRADA' | 'SALIDA' | 'ALL') => {
    if (!onResetMovements) return;
    const label = tipo === 'ENTRADA' ? 'entradas' : tipo === 'SALIDA' ? 'salidas' : 'TODOS los movimientos';
    if (confirm(`¿Confirma eliminar definitivamente los registros de ${label}?`)) {
      setIsResetting(true);
      try {
        await onResetMovements(tipo);
        alert(`Historial de ${label} eliminado con éxito.`);
      } catch (err) {
        console.error(err);
      } finally {
        setIsResetting(false);
      }
    }
  };

  const filteredMovements = movements.filter(m => {
    const matchesSearch = 
      m.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.referencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.usuarioNombre || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || m.tipo === typeFilter;

    let matchesDate = true;
    if (dateFilter !== 'ALL') {
      const movDate = new Date(m.timestamp);
      const now = new Date();
      if (dateFilter === 'TODAY') {
        matchesDate = movDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'WEEK') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = movDate >= weekAgo;
      } else if (dateFilter === 'MONTH') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = movDate >= monthAgo;
      }
    }

    return matchesSearch && matchesType && matchesDate;
  });

  // Calculate totals
  const totalEntradasCount = filteredMovements.filter(m => m.tipo === 'ENTRADA').reduce((sum, m) => sum + m.cantidad, 0);
  const totalSalidasCount = filteredMovements.filter(m => m.tipo === 'SALIDA').reduce((sum, m) => sum + m.cantidad, 0);

  const exportCSV = () => {
    const headers = ['ID', 'Fecha', 'Tipo', 'SKU', 'Descripcion', 'Cantidad', 'StockAnterior', 'StockNuevo', 'Ubicacion', 'Referencia', 'Usuario'];
    const rows = filteredMovements.map(m => [
      m.id,
      new Date(m.timestamp).toLocaleString('es-MX'),
      m.tipo,
      `"${m.sku}"`,
      `"${m.descripcion.replace(/"/g, '""')}"`,
      m.cantidad,
      m.stockAnterior,
      m.stockNuevo,
      `"${m.ubicacion}"`,
      `"${m.referencia.replace(/"/g, '""')}"`,
      `"${m.usuarioNombre || m.usuarioEmail}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Movimientos_GrupoMasDigital_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">Reportes Detallados e Historial de Auditoría</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Supervisión en tiempo real de trazabilidad, movimientos y valoración de inventario.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => generateInventoryReportPDF(products)}
            className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Descargar Reporte General (PDF)</span>
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition-colors shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar Historial (CSV)</span>
          </button>

          {onResetMovements && (
            <div className="flex items-center space-x-1 bg-red-950/80 p-1 rounded-xl border border-red-800">
              <button
                onClick={() => handleReset('ENTRADA')}
                disabled={isResetting}
                className="text-[11px] font-bold text-red-300 hover:text-white px-2 py-1 rounded hover:bg-red-900 transition-colors cursor-pointer"
                title="Limpiar entradas de almacén"
              >
                Reset Entradas
              </button>
              <span className="text-red-800">|</span>
              <button
                onClick={() => handleReset('SALIDA')}
                disabled={isResetting}
                className="text-[11px] font-bold text-amber-300 hover:text-white px-2 py-1 rounded hover:bg-red-900 transition-colors cursor-pointer"
                title="Limpiar salidas de almacén"
              >
                Reset Salidas
              </button>
              <span className="text-red-800">|</span>
              <button
                onClick={() => handleReset('ALL')}
                disabled={isResetting}
                className="text-[11px] font-black text-red-400 hover:text-red-200 px-2 py-1 rounded hover:bg-red-900 transition-colors cursor-pointer flex items-center space-x-1"
                title="Limpiar todos los movimientos"
              >
                <Trash2 className="w-3 h-3" />
                <span>Reset Todo</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <ArrowDownToLine className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Entradas Filtradas</span>
            <div className="text-xl font-extrabold text-emerald-600">+{totalEntradasCount} unidades</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <ArrowUpFromLine className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Salidas Filtradas</span>
            <div className="text-xl font-extrabold text-amber-600">-{totalSalidasCount} unidades</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Total Registros Auditados</span>
            <div className="text-xl font-extrabold text-slate-900">{filteredMovements.length} movimientos</div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por SKU, usuario, ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 text-slate-900"
            />
          </div>

          {/* Type Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl font-bold">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`flex-1 py-1 rounded-lg text-center ${typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Todos los Tipos
            </button>
            <button
              onClick={() => setTypeFilter('ENTRADA')}
              className={`flex-1 py-1 rounded-lg text-center ${typeFilter === 'ENTRADA' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
            >
              Entradas
            </button>
            <button
              onClick={() => setTypeFilter('SALIDA')}
              className={`flex-1 py-1 rounded-lg text-center ${typeFilter === 'SALIDA' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}
            >
              Salidas
            </button>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e: any) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 text-slate-800 font-medium"
            >
              <option value="ALL">Todo el Historial Histórico</option>
              <option value="TODAY">Solo el Día de Hoy</option>
              <option value="WEEK">Últimos 7 Días</option>
              <option value="MONTH">Últimos 30 Días</option>
            </select>
          </div>

        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3.5 px-4">Fecha y Hora</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">SKU / Producto</th>
                <th className="py-3.5 px-4 text-center">Cantidad</th>
                <th className="py-3.5 px-4 text-center">Prev. → Nuevo</th>
                <th className="py-3.5 px-4">Ubicación</th>
                <th className="py-3.5 px-4">Referencia / Orden</th>
                <th className="py-3.5 px-4">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No hay registros de movimientos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m, idx) => {
                  const isEntrada = m.tipo === 'ENTRADA';
                  return (
                    <tr key={`${m.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(m.timestamp).toLocaleString('es-MX')}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          isEntrada ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {m.tipo}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="font-bold text-slate-900">{m.sku}</div>
                        <div className="text-[11px] text-slate-500 truncate" title={m.descripcion}>{m.descripcion}</div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`font-extrabold text-sm ${isEntrada ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {isEntrada ? '+' : '-'}{m.cantidad}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center text-slate-600 font-semibold text-[11px]">
                        {m.stockAnterior} → <strong className="text-slate-900">{m.stockNuevo}</strong>
                      </td>

                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {m.ubicacion}
                      </td>

                      <td className="py-3 px-4 text-slate-700 max-w-[180px] truncate" title={m.referencia}>
                        {m.referencia}
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
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
  );
};
