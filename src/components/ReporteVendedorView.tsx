import React, { useState } from 'react';
import { UserCheck, FileSpreadsheet, DollarSign, Lock, ShoppingBag, Receipt, Calendar, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Remision, Apartado, PedidoEspecial, InventoryMovement } from '../types';

interface ReporteVendedorViewProps {
  remisiones: Remision[];
  apartados: Apartado[];
  pedidosEspeciales: PedidoEspecial[];
  movements: InventoryMovement[];
}

export const ReporteVendedorView: React.FC<ReporteVendedorViewProps> = ({
  remisiones,
  apartados,
  pedidosEspeciales,
  movements
}) => {
  const [selectedVendor, setSelectedVendor] = useState<'Luis' | 'Manuel' | 'César' | 'Mostrador'>('Luis');

  // Calculate Summary for ALL Vendors
  const VENDORS_LIST = ['Luis', 'Manuel', 'César', 'Mostrador', 'Mercado Libre'];

  const allVendorsSummary = VENDORS_LIST.map(v => {
    const rems = remisiones.filter(r => (r.vendedorNombre || '').toLowerCase().includes(v.toLowerCase()));
    const totalVentas = rems.reduce((acc, r) => acc + (r.total || 0), 0);
    const countRemisiones = rems.length;
    const aparts = apartados.filter(a => a.nombre.toLowerCase() === v.toLowerCase());
    const countApartados = aparts.reduce((acc, a) => acc + (a.cantidadApartada || 0), 0);
    const pedsEsp = pedidosEspeciales.filter(p => p.nombre.toLowerCase() === v.toLowerCase());
    const countPedsEsp = pedsEsp.length;

    return {
      vendor: v,
      totalVentas,
      countRemisiones,
      countApartados,
      countPedsEsp
    };
  });

  const granTotalVentas = allVendorsSummary.reduce((acc, s) => acc + s.totalVentas, 0);

  const vendorRemisiones = remisiones.filter(r => (r.vendedorNombre || '').toLowerCase().includes(selectedVendor.toLowerCase()));
  const totalMontoRemisiones = vendorRemisiones.reduce((acc, r) => acc + (r.total || 0), 0);

  // Filter apartados by vendor name
  const vendorApartados = apartados.filter(a => a.nombre.toLowerCase() === selectedVendor.toLowerCase());
  const totalApartadosUnidades = vendorApartados.reduce((acc, a) => acc + (a.cantidadApartada || 0), 0);

  // Filter pedidos especiales
  const vendorPedidosEspeciales = pedidosEspeciales.filter(p => p.nombre.toLowerCase() === selectedVendor.toLowerCase());

  // Filter inventory movements initiated by vendor or matching reference
  const vendorMovements = movements.filter(m => {
    const user = (m.usuarioNombre || m.usuarioEmail || '').toLowerCase();
    const ref = (m.referencia || '').toLowerCase();
    const v = selectedVendor.toLowerCase();
    return user.includes(v) || ref.includes(v);
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">Reporte Rendimiento por Vendedor</h1>
            <p className="text-slate-300 text-xs mt-0.5">
              Análisis consolidado de remisiones, apartados de mercancía y pedidos asignados por ejecutivo.
            </p>
          </div>
        </div>

        {/* Vendor Selector Dropdown (Luis, Manuel, César) */}
        <div className="flex items-center space-x-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
          <span className="text-xs text-slate-300 font-bold px-2">Detalle de:</span>
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value as any)}
            className="bg-cyan-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-lg border-none focus:ring-0 cursor-pointer"
          >
            <option value="Luis">Luis</option>
            <option value="Manuel">Manuel</option>
            <option value="César">César</option>
            <option value="Mostrador">Mostrador</option>
          </select>
        </div>
      </div>

      {/* Resumen Global Ventas por Vendedor (Luis, Manuel, César, Mostrador, Mercado Libre) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h2 className="font-extrabold text-slate-900 text-sm">Resumen de Ventas Totales por Vendedor</h2>
          </div>
          <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Gran Total: ${granTotalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                <th className="p-2.5">Ejecutivo / Vendedor</th>
                <th className="p-2.5 text-center">Remisiones</th>
                <th className="p-2.5 text-center">Apartados (pzas)</th>
                <th className="p-2.5 text-center">Pedidos Esp.</th>
                <th className="p-2.5 text-right">Ventas Totales ($)</th>
                <th className="p-2.5 text-center">Participación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {allVendorsSummary.map((s) => {
                const percentage = granTotalVentas > 0 ? (s.totalVentas / granTotalVentas) * 100 : 0;
                const isSelected = s.vendor.toLowerCase() === selectedVendor.toLowerCase();

                return (
                  <tr key={s.vendor} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-cyan-50/50' : ''}`}>
                    <td className="p-2.5 font-bold text-slate-900 flex items-center space-x-1.5">
                      <span className={`w-2 h-2 rounded-full ${s.totalVentas > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                      <span>{s.vendor}</span>
                    </td>
                    <td className="p-2.5 text-center font-semibold text-slate-700">{s.countRemisiones}</td>
                    <td className="p-2.5 text-center font-semibold text-amber-700">{s.countApartados}</td>
                    <td className="p-2.5 text-center font-semibold text-cyan-800">{s.countPedsEsp}</td>
                    <td className="p-2.5 text-right font-black text-slate-900">
                      ${s.totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2.5 text-center w-36">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-cyan-600 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 w-8 text-right">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Remisiones */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Remisiones de {selectedVendor}</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            ${totalMontoRemisiones.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            {vendorRemisiones.length} notas emitidas
          </div>
        </div>

        {/* Total Apartados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Mercancía Apartada</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-700">
            {totalApartadosUnidades} <span className="text-sm font-normal text-slate-600">unidades</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            {vendorApartados.length} apartados congelados
          </div>
        </div>

        {/* Total Pedidos Especiales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Pedidos Especiales</span>
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-cyan-900">
            {vendorPedidosEspeciales.length} <span className="text-sm font-normal text-slate-600">pedidos</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-500">
            {vendorPedidosEspeciales.filter(p => p.estado === 'PENDIENTE' || p.estado === 'EN_PROCESO').length} en progreso
          </div>
        </div>
      </div>

      {/* Detail Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Remisiones Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-900 text-sm flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Remisiones Emitidas por {selectedVendor}</span>
            </span>
            <span className="text-xs text-slate-500 font-normal">{vendorRemisiones.length} total</span>
          </h2>

          <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] font-bold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Folio</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3 text-right">Total ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {vendorRemisiones.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400">
                      No hay remisiones emitidas para {selectedVendor}.
                    </td>
                  </tr>
                ) : (
                  vendorRemisiones.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-extrabold text-slate-900">{r.folio}</td>
                      <td className="py-2.5 px-3 text-slate-700 truncate max-w-[150px]">{r.cliente?.razonSocial}</td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">{r.fecha}</td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        ${r.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Apartados Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="font-bold text-slate-900 text-sm flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Apartados Asignados a {selectedVendor}</span>
            </span>
            <span className="text-xs text-slate-500 font-normal">{vendorApartados.length} total</span>
          </h2>

          <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] font-bold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Descripción</th>
                  <th className="py-2.5 px-3 text-center">Cant.</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {vendorApartados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400">
                      No hay apartados asignados a {selectedVendor}.
                    </td>
                  </tr>
                ) : (
                  vendorApartados.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{a.sku}</td>
                      <td className="py-2.5 px-3 text-slate-700 truncate max-w-[160px]">{a.descripcion}</td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-amber-700">{a.cantidadApartada}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.estado === 'ACTIVO' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {a.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
