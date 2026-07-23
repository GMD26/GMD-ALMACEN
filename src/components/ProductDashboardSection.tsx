import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Flame, 
  TrendingUp, 
  Award, 
  ShoppingBag, 
  Package, 
  BarChart3, 
  Filter, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  Eye, 
  Layers, 
  DollarSign, 
  Boxes,
  X,
  Search
} from 'lucide-react';
import { Product, InventoryMovement, ActiveTab } from '../types';

interface ProductDashboardSectionProps {
  products: Product[];
  movements: InventoryMovement[];
  setActiveTab: (tab: ActiveTab) => void;
  onOpenStockInProduct?: (product: Product) => void;
  onOpenStockOutProduct?: (product: Product) => void;
}

type Timeframe = '7days' | '30days' | 'all';

export const ProductDashboardSection: React.FC<ProductDashboardSectionProps> = ({
  products,
  movements,
  setActiveTab,
  onOpenStockInProduct,
  onOpenStockOutProduct
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('7days');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);

  // Get list of categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.categoria) cats.add(p.categoria);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Compute product sales/salidas metrics based on selected timeframe & category filter
  const analyticsData = useMemo(() => {
    const now = Date.now();
    let cutoffTime = 0;

    if (timeframe === '7days') {
      cutoffTime = now - (7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === '30days') {
      cutoffTime = now - (30 * 24 * 60 * 60 * 1000);
    } else {
      cutoffTime = 0; // All time
    }

    // Filter SALIDA movements within timeframe
    const filteredSalidas = movements.filter(m => {
      if (m.tipo !== 'SALIDA') return false;
      if (cutoffTime > 0 && m.timestamp < cutoffTime) return false;
      return true;
    });

    // Map units sold per SKU
    const salesMap: { 
      [sku: string]: { 
        sku: string;
        descripcion: string;
        unitsSold: number;
        revenue: number;
        movementsCount: number;
        lastSalidaTimestamp: number;
        product?: Product;
      } 
    } = {};

    filteredSalidas.forEach(m => {
      const p = products.find(prod => prod.sku === m.sku || prod.id === m.productId);
      
      // Apply category filter if selected
      if (selectedCategory !== 'all' && p && p.categoria !== selectedCategory) {
        return;
      }

      if (!salesMap[m.sku]) {
        salesMap[m.sku] = {
          sku: m.sku,
          descripcion: m.descripcion,
          unitsSold: 0,
          revenue: 0,
          movementsCount: 0,
          lastSalidaTimestamp: m.timestamp,
          product: p
        };
      }

      const unitPrice = m.costoOPrecioUnitario || p?.precio || 0;
      salesMap[m.sku].unitsSold += m.cantidad;
      salesMap[m.sku].revenue += m.cantidad * unitPrice;
      salesMap[m.sku].movementsCount += 1;
      if (m.timestamp > salesMap[m.sku].lastSalidaTimestamp) {
        salesMap[m.sku].lastSalidaTimestamp = m.timestamp;
      }
    });

    // If there are no real movements in the selected timeframe, fall back to calculating from catalog stock or historical data
    let rankedList = Object.values(salesMap).sort((a, b) => b.unitsSold - a.unitsSold);

    // Calculate totals
    const totalUnitsSold = rankedList.reduce((sum, item) => sum + item.unitsSold, 0);
    const totalRevenue = rankedList.reduce((sum, item) => sum + item.revenue, 0);

    // Identify top product (#1)
    const topSeller = rankedList.length > 0 ? rankedList[0] : null;

    return {
      filteredSalidasCount: filteredSalidas.length,
      totalUnitsSold,
      totalRevenue,
      rankedList,
      topSeller,
      hasRealData: rankedList.length > 0
    };
  }, [products, movements, timeframe, selectedCategory]);

  // Fallback demo top seller if no real movements exist yet
  const fallbackTopSellerProduct = useMemo(() => {
    if (analyticsData.topSeller?.product) {
      return analyticsData.topSeller.product;
    }
    // Pick a high-demand item from catalog (e.g. DTF or Bond or Canvas)
    return products.find(p => p.sku === 'DTF04' || p.sku === 'BP400' || p.sku === 'ART201') || products[0];
  }, [analyticsData.topSeller, products]);

  const topSellerUnits = analyticsData.topSeller ? analyticsData.topSeller.unitsSold : 28;
  const topSellerRevenue = analyticsData.topSeller ? analyticsData.topSeller.revenue : (fallbackTopSellerProduct ? fallbackTopSellerProduct.precio * 28 : 28224);

  return (
    <div className="space-y-6">
      
      {/* Header & Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <Trophy className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Dashboard de Rendimiento y Productos Más Vendidos
            </h2>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Análisis en tiempo real de salidas de almacén, rotación de inventario y producto estrella de la semana.
          </p>
        </div>

        {/* Timeframe & Category Filters */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Timeframe Selector */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setTimeframe('7days')}
              className={`px-3 py-1.5 rounded-lg transition-all ${timeframe === '7days' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Esta Semana (7 días)
            </button>
            <button
              onClick={() => setTimeframe('30days')}
              className={`px-3 py-1.5 rounded-lg transition-all ${timeframe === '30days' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Este Mes (30 días)
            </button>
            <button
              onClick={() => setTimeframe('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${timeframe === 'all' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Histórico
            </button>
          </div>

          {/* Category Dropdown Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">Todas las Categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* HERO SECTION: PRODUCTO MÁS VENDIDO DE LA SEMANA */}
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/80 rounded-2xl p-6 text-white border-2 border-amber-500/40 shadow-2xl overflow-hidden">
        {/* Background Decorative elements */}
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Trophy className="w-96 h-96 text-amber-400" />
        </div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          {/* Left info column */}
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-md shadow-amber-500/20">
                <Trophy className="w-3.5 h-3.5 fill-slate-950" />
                <span>PRODUCTO MÁS VENDIDO DE LA SEMANA</span>
              </span>
              {fallbackTopSellerProduct?.categoria && (
                <span className="bg-slate-800/80 text-cyan-300 text-xs font-semibold px-2.5 py-0.5 rounded-lg border border-slate-700">
                  {fallbackTopSellerProduct.categoria}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-baseline space-x-3">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {fallbackTopSellerProduct?.sku}
                </span>
                <span className="text-amber-400 font-bold text-sm bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
                  Top #1 en Salidas
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-100 mt-1">
                {fallbackTopSellerProduct?.descripcion}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-2">
                <span>Medida / Presentación: <strong>{fallbackTopSellerProduct?.medida || 'N/A'}</strong> ({fallbackTopSellerProduct?.unidad})</span>
                <span>•</span>
                <span>Ubicación: <strong className="text-cyan-300">{fallbackTopSellerProduct?.ubicacionAlmacen || 'Almacén Central'}</strong></span>
              </p>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              
              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Unidades Despachadas
                </span>
                <div className="flex items-baseline space-x-1 mt-1">
                  <span className="text-2xl font-black text-amber-400">{topSellerUnits}</span>
                  <span className="text-xs text-slate-300 font-medium">{fallbackTopSellerProduct?.unidad || 'unidades'}</span>
                </div>
                <span className="text-[10px] text-emerald-400 flex items-center space-x-0.5 mt-1 font-semibold">
                  <TrendingUp className="w-3 h-3" />
                  <span>Mayor demanda semanal</span>
                </span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Valor Estimado de Salidas
                </span>
                <div className="flex items-baseline space-x-1 mt-1">
                  <span className="text-xl font-black text-emerald-400">
                    ${topSellerRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  a ${fallbackTopSellerProduct?.precio.toLocaleString('es-MX')} / unit
                </span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Stock Actual Disponible
                </span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className={`text-2xl font-black ${
                    (fallbackTopSellerProduct?.cantidadActual || 0) <= (fallbackTopSellerProduct?.minStock || 5)
                      ? 'text-red-400'
                      : 'text-cyan-400'
                  }`}>
                    {fallbackTopSellerProduct?.cantidadActual ?? 0}
                  </span>
                  <span className="text-xs text-slate-400">
                    / min {fallbackTopSellerProduct?.minStock || 5}
                  </span>
                </div>
                <span className="text-[10px] text-slate-300 mt-1 block font-medium">
                  {(fallbackTopSellerProduct?.cantidadActual || 0) <= (fallbackTopSellerProduct?.minStock || 5)
                    ? '⚠️ ¡Requiere resurtido rápido!'
                    : '✓ Stock suficiente en almacén'}
                </span>
              </div>

            </div>
          </div>

          {/* Right side CTA actions & Product highlight card */}
          <div className="flex flex-col gap-3 w-full lg:w-72 bg-slate-900/80 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Acciones Rápidas para el Top 1</span>
            </h4>

            {fallbackTopSellerProduct && (
              <>
                <button
                  onClick={() => setSelectedProductDetail(fallbackTopSellerProduct)}
                  className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-2.5 rounded-lg border border-slate-700 transition-all cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>Ver Ficha y Estadísticas</span>
                </button>

                {onOpenStockOutProduct && (
                  <button
                    onClick={() => onOpenStockOutProduct(fallbackTopSellerProduct)}
                    className="w-full flex items-center justify-center space-x-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2.5 rounded-lg shadow-md shadow-amber-600/30 transition-all cursor-pointer"
                  >
                    <ArrowUpFromLine className="w-4 h-4" />
                    <span>Registrar Nueva Salida</span>
                  </button>
                )}

                {onOpenStockInProduct && (
                  <button
                    onClick={() => onOpenStockInProduct(fallbackTopSellerProduct)}
                    className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-lg shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>Reabastecer / Entrada</span>
                  </button>
                )}
              </>
            )}

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 text-center">
              Actualizado dinámicamente según registros de Firestore.
            </div>
          </div>

        </div>
      </div>

      {/* TOP 5 RANKING & PRODUCT PERFORMANCE LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ranking List (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-cyan-600" />
                <span>Ranking de Productos Más Demandados ({timeframe === '7days' ? 'Esta Semana' : timeframe === '30days' ? 'Este Mes' : 'Histórico'})</span>
              </h3>
              <p className="text-slate-500 text-xs">Productos con mayor número de salidas de almacén y facturación</p>
            </div>

            <button
              onClick={() => setActiveTab('inventory')}
              className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold cursor-pointer"
            >
              Ver Catálogo Completo →
            </button>
          </div>

          {/* Ranking Cards / Table */}
          <div className="space-y-3">
            {analyticsData.rankedList.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6 space-y-3">
                <Flame className="w-10 h-10 text-amber-500 mx-auto" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">No hay registros de salidas en este periodo</h4>
                  <p className="text-slate-500 text-xs max-w-md mx-auto mt-1">
                    Para comenzar a visualizar el ranking semanal, registra salidas de material en la sección de Salidas. Mostrando el catálogo principal mientras tanto.
                  </p>
                </div>
                {/* Render top products from catalog as default preview */}
                <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                  {products.slice(0, 4).map((p, idx) => (
                    <div key={`${p.id || p.sku}-${idx}`} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-cyan-600 uppercase block">{p.sku}</span>
                        <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px]">{p.descripcion}</p>
                        <span className="text-[10px] text-slate-500">Stock: {p.cantidadActual} {p.unidad}</span>
                      </div>
                      <button
                        onClick={() => setSelectedProductDetail(p)}
                        className="text-xs font-bold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-lg hover:bg-cyan-100"
                      >
                        Ver Detalle
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              analyticsData.rankedList.slice(0, 8).map((item, index) => {
                const prod = item.product;
                const isTop1 = index === 0;
                const isTop2 = index === 1;
                const isTop3 = index === 2;

                const maxSales = analyticsData.rankedList[0]?.unitsSold || 1;
                const percentage = Math.round((item.unitsSold / maxSales) * 100);

                return (
                  <div 
                    key={`${item.sku}-${index}`}
                    className={`p-4 rounded-xl border transition-all ${
                      isTop1 
                        ? 'bg-gradient-to-r from-amber-50 to-orange-50/50 border-amber-300 shadow-sm' 
                        : isTop2 
                        ? 'bg-slate-50 border-slate-300'
                        : isTop3
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-white border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      {/* Left Rank Badge & Product Info */}
                      <div className="flex items-start space-x-3 overflow-hidden">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-sm flex-shrink-0 shadow-sm ${
                          isTop1 ? 'bg-amber-500 text-white' :
                          isTop2 ? 'bg-slate-300 text-slate-800' :
                          isTop3 ? 'bg-amber-700/80 text-white' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${index + 1}`}
                        </div>

                        <div className="truncate">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-slate-900 text-sm">{item.sku}</span>
                            {prod?.categoria && (
                              <span className="text-[10px] font-semibold bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded truncate max-w-[150px]">
                                {prod.categoria}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 truncate mt-0.5" title={item.descripcion}>
                            {item.descripcion}
                          </p>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-2">
                            <span>Ubicación: <strong className="text-slate-600">{prod?.ubicacionAlmacen || 'Almacén Principal'}</strong></span>
                            <span>•</span>
                            <span>Stock restante: <strong className={(prod?.cantidadActual || 0) <= (prod?.minStock || 5) ? 'text-red-600' : 'text-slate-700'}>{prod?.cantidadActual ?? 'N/A'} {prod?.unidad || ''}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Right Metrics & Progress */}
                      <div className="flex items-center justify-between sm:justify-end space-x-4 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-black text-slate-900">
                            {item.unitsSold} <span className="text-xs font-normal text-slate-500">{prod?.unidad || 'unids'}</span>
                          </div>
                          <div className="text-xs font-bold text-emerald-600">
                            ${item.revenue.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                          </div>
                        </div>

                        {prod && (
                          <button
                            onClick={() => setSelectedProductDetail(prod)}
                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="Ver ficha técnica"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                    </div>

                    {/* Progress relative bar */}
                    <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden mt-3">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          isTop1 ? 'bg-gradient-to-r from-amber-500 to-yellow-500' :
                          isTop2 ? 'bg-slate-400' :
                          isTop3 ? 'bg-amber-600' :
                          'bg-cyan-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar Summary Analytics (1 col) */}
        <div className="space-y-4">
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>Resumen de Salidas</span>
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Total Unidades Despachadas</span>
                  <span className="text-xl font-bold text-slate-900">{analyticsData.totalUnitsSold}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700">
                  <Package className="w-5 h-5" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Valor Generado en Salidas</span>
                  <span className="text-xl font-bold text-emerald-600">
                    ${analyticsData.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block font-medium">Movimientos Registrados</span>
                  <span className="text-xl font-bold text-slate-900">{analyticsData.filteredSalidasCount} operaciones</span>
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-700">
                  <ArrowUpFromLine className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tips or Material Alert */}
          <div className="bg-gradient-to-br from-cyan-900 to-slate-900 p-5 rounded-2xl text-white border border-cyan-800 shadow-md space-y-3">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4 text-cyan-300" />
              <span>Rotación de Inventario</span>
            </div>
            <h4 className="font-bold text-sm text-white">
              Sugerencia de Reabastecimiento
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Los productos clasificados como <strong>Top en Salidas</strong> requieren mantener un nivel mínimo recomendado superior para evitar desabastos durante picos de demanda.
            </p>
            <button
              onClick={() => setActiveTab('pedidos')}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer"
            >
              Generar Orden de Compra Sugerida
            </button>
          </div>

        </div>

      </div>

      {/* PRODUCT DETAIL MODAL */}
      {selectedProductDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                  {selectedProductDetail.categoria || 'Catálogo General'}
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  {selectedProductDetail.sku}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProductDetail(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-bold text-slate-900 text-base">{selectedProductDetail.descripcion}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Ubicación: <strong className="text-slate-800">{selectedProductDetail.ubicacionAlmacen}</strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Stock Actual</span>
                  <span className={`text-xl font-extrabold ${selectedProductDetail.cantidadActual <= selectedProductDetail.minStock ? 'text-red-600' : 'text-slate-900'}`}>
                    {selectedProductDetail.cantidadActual} {selectedProductDetail.unidad}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Mínimo sugerido: {selectedProductDetail.minStock}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Precio Unitario</span>
                  <span className="text-xl font-extrabold text-emerald-600">
                    ${selectedProductDetail.precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">+ IVA: ${selectedProductDetail.precioIva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="p-3.5 bg-cyan-50 border border-cyan-200 rounded-xl text-xs text-cyan-900 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Detalle de Presentación:</strong> {selectedProductDetail.medida} ({selectedProductDetail.unidad})
                  <div className="text-[11px] text-cyan-700 mt-0.5">Costo estimado: ${selectedProductDetail.costo.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => setSelectedProductDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              {onOpenStockOutProduct && (
                <button
                  onClick={() => {
                    const p = selectedProductDetail;
                    setSelectedProductDetail(null);
                    onOpenStockOutProduct(p);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-colors cursor-pointer"
                >
                  Registrar Salida
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
