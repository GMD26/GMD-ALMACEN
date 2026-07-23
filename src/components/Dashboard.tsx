import React, { useState } from 'react';
import { 
  Boxes, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  PackageCheck, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  PlusCircle, 
  FileText,
  MapPin,
  Clock,
  Trophy,
  BarChart2,
  Flame
} from 'lucide-react';
import { Product, InventoryMovement, ActiveTab } from '../types';
import { ProductDashboardSection } from './ProductDashboardSection';

interface DashboardProps {
  products: Product[];
  movements: InventoryMovement[];
  setActiveTab: (tab: ActiveTab) => void;
  onOpenStockIn: () => void;
  onOpenStockOut: () => void;
  onOpenQuickStockIn?: (product: Product) => void;
  onOpenQuickStockOut?: (product: Product) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  products,
  movements,
  setActiveTab,
  onOpenStockIn,
  onOpenStockOut,
  onOpenQuickStockIn,
  onOpenQuickStockOut
}) => {
  const [subTab, setSubTab] = useState<'productos' | 'general'>('productos');

  // Calculations
  const totalSkus = products.length;
  const totalItems = products.reduce((sum, p) => sum + p.cantidadActual, 0);
  const totalValue = products.reduce((sum, p) => sum + (p.cantidadActual * (p.costo || p.precio)), 0);
  
  const lowStockProducts = products.filter(p => p.cantidadActual <= p.minStock);
  const outOfStockProducts = products.filter(p => p.cantidadActual === 0);

  // Group by category
  const categoriesMap: { [key: string]: { count: number; items: number; value: number } } = {};
  products.forEach(p => {
    const cat = p.categoria || 'Sin Categoría';
    if (!categoriesMap[cat]) {
      categoriesMap[cat] = { count: 0, items: 0, value: 0 };
    }
    categoriesMap[cat].count += 1;
    categoriesMap[cat].items += p.cantidadActual;
    categoriesMap[cat].value += p.cantidadActual * (p.costo || p.precio);
  });

  const categories = Object.keys(categoriesMap).map(cat => ({
    name: cat,
    ...categoriesMap[cat]
  }));

  // Today's movements
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMovements = movements.filter(m => m.fecha && m.fecha.startsWith(todayStr));

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 rounded-2xl border border-slate-800 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <Boxes className="w-64 h-64 text-cyan-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span>Monitoreo en Tiempo Real - Almacén Central</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Control de Inventario Grupo Más Digital
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl">
              Gestión unificada de entradas, salidas, ubicaciones en almacén y reposición inmediata de material.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={onOpenStockIn}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>Registrar Entrada</span>
            </button>

            <button
              onClick={onOpenStockOut}
              className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
            >
              <ArrowUpFromLine className="w-4 h-4" />
              <span>Registrar Salida</span>
            </button>

            <button
              onClick={() => setActiveTab('pedidos')}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Material Faltante ({lowStockProducts.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          <button
            onClick={() => setSubTab('productos')}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              subTab === 'productos'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Dashboard de Producto & Más Vendido Semanal</span>
            <span className="px-1.5 py-0.5 text-[9px] bg-slate-900 text-amber-300 rounded font-black uppercase">
              TOP #1
            </span>
          </button>

          <button
            onClick={() => setSubTab('general')}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              subTab === 'general'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Resumen General de Almacén</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium hidden md:block px-2">
          {subTab === 'productos' ? 'Análisis de demanda y mayor volumen de salidas' : 'Valoración y distribución por categorías'}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total SKUs */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SKUs Registrados</span>
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{totalSkus}</span>
            <span className="text-xs text-slate-500 font-medium">{totalItems.toLocaleString()} unidades tot.</span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Catálogo Grupo Más Digital</span>
            <span className="text-blue-600 font-semibold cursor-pointer" onClick={() => setActiveTab('inventory')}>Ver catálogo →</span>
          </div>
        </div>

        {/* Total Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor en Almacén</span>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              ${totalValue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Costo estimado acumulado</span>
            <span className="text-emerald-600 font-semibold cursor-pointer" onClick={() => setActiveTab('reportes')}>Ver valoración →</span>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alertas de Stock Bajo</span>
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-2xl font-bold ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {lowStockProducts.length}
            </span>
            <span className="text-xs text-red-600 font-bold">
              {outOfStockProducts.length} agotados
            </span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Mínimos configurados</span>
            <span className="text-amber-600 font-semibold cursor-pointer" onClick={() => setActiveTab('pedidos')}>Agilizar pedido →</span>
          </div>
        </div>

        {/* Movements Today */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Movimientos de Hoy</span>
            <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{todayMovements.length}</span>
            <span className="text-xs text-slate-500 font-medium">{movements.length} registrados total</span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Entradas y Salidas</span>
            <span className="text-indigo-600 font-semibold cursor-pointer" onClick={() => setActiveTab('reportes')}>Ver historial →</span>
          </div>
        </div>

      </div>

      {/* Critical Low Stock Banner */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900 text-sm">
                Atención: Se requiere agilizar pedido para {lowStockProducts.length} productos con stock por debajo del mínimo.
              </h3>
              <p className="text-amber-700 text-xs mt-0.5">
                Productos como <strong className="underline">{lowStockProducts[0]?.sku}</strong> ({lowStockProducts[0]?.descripcion}) tienen actualmente {lowStockProducts[0]?.cantidadActual} {lowStockProducts[0]?.unidad} (mínimo recomendado: {lowStockProducts[0]?.minStock}).
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('pedidos')}
            className="flex-shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            Generar Solicitud de Pedido PDF
          </button>
        </div>
      )}

      {/* Main SubTab Content View */}
      {subTab === 'productos' ? (
        <ProductDashboardSection
          products={products}
          movements={movements}
          setActiveTab={setActiveTab}
          onOpenStockInProduct={onOpenQuickStockIn}
          onOpenStockOutProduct={onOpenQuickStockOut}
        />
      ) : (
        /* Two Column Grid: Stock by Category & Recent Movement Activity */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Categories Breakdown (2 cols) */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Distribución por Categoría</h2>
                <p className="text-slate-500 text-xs">Clasificación de productos y volumen en almacén</p>
              </div>
              <button
                onClick={() => setActiveTab('inventory')}
                className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold"
              >
                Ver todos los SKUs →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map((cat, idx) => {
                const maxVal = Math.max(...categories.map(c => c.value)) || 1;
                const percent = Math.min(100, Math.round((cat.value / maxVal) * 100));

                return (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-cyan-200 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-800 truncate max-w-[200px]" title={cat.name}>
                        {cat.name}
                      </span>
                      <span className="text-[11px] font-bold text-cyan-700 bg-cyan-100/70 px-2 py-0.5 rounded-md">
                        {cat.count} SKUs
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                      <span>{cat.items} unidades en stock</span>
                      <span className="font-semibold text-slate-700">
                        ${cat.value.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Movements Feed (1 col) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Últimos Movimientos</h2>
                <p className="text-slate-500 text-xs">Registro en tiempo real de Entradas / Salidas</p>
              </div>
              <button
                onClick={() => setActiveTab('reportes')}
                className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold"
              >
                Ver todo →
              </button>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {movements.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No hay movimientos registrados aún.
                </div>
              ) : (
                movements.slice(0, 8).map((mov, idx) => {
                  const isEntrada = mov.tipo === 'ENTRADA';
                  return (
                    <div 
                      key={`${mov.id}-${idx}`} 
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5 overflow-hidden">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${isEntrada ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isEntrada ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-900">{mov.sku}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${isEntrada ? 'bg-emerald-200/60 text-emerald-800' : 'bg-amber-200/60 text-amber-800'}`}>
                              {mov.tipo}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate" title={mov.descripcion}>
                            {mov.descripcion}
                          </p>
                          <span className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(mov.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>•</span>
                            <span className="truncate max-w-[100px]">{mov.referencia}</span>
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-2">
                        <div className={`font-bold text-sm ${isEntrada ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {isEntrada ? '+' : '-'}{mov.cantidad}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Stock: {mov.stockNuevo}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
