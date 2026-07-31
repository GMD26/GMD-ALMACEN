import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Receipt, 
  Boxes, 
  LayoutDashboard, 
  Menu, 
  X, 
  ArrowUp, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  FileSpreadsheet, 
  ShoppingBag, 
  ShoppingCart, 
  UserCheck, 
  Tag, 
  CheckCircle2, 
  Database,
  Layers,
  ChevronRight
} from 'lucide-react';
import { ActiveTab } from '../types';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  lowStockCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount = 0
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setIsDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Categorized tabs for quick navigation in drawer
  const tabCategories = [
    {
      title: '🏠 Principal y Ventas',
      items: [
        { id: 'portada' as ActiveTab, label: 'Portada Principal', icon: <Home className="w-5 h-5 text-cyan-400" /> },
        { id: 'remisiones' as ActiveTab, label: 'Generar Remisión', icon: <Receipt className="w-5 h-5 text-emerald-400" /> },
        { id: 'dashboard' as ActiveTab, label: 'Resumen & Métricas', icon: <LayoutDashboard className="w-5 h-5 text-indigo-400" /> },
      ]
    },
    {
      title: '📦 Control de Almacén e Inventario',
      items: [
        { id: 'existencias' as ActiveTab, label: 'Existencias Disponibles', icon: <Boxes className="w-5 h-5 text-emerald-400" /> },
        { id: 'inventory' as ActiveTab, label: 'Catálogo SKUs', icon: <Database className="w-5 h-5 text-cyan-400" /> },
        { id: 'entradas' as ActiveTab, label: 'Entradas de Almacén', icon: <ArrowDownToLine className="w-5 h-5 text-emerald-400" /> },
        { id: 'salidas' as ActiveTab, label: 'Salidas de Almacén', icon: <ArrowUpFromLine className="w-5 h-5 text-red-400" /> },
        { id: 'pedidos' as ActiveTab, label: 'Surtir Stock Bajo', icon: <ShoppingBag className="w-5 h-5 text-amber-400" />, badge: lowStockCount },
      ]
    },
    {
      title: '📋 Pedidos y Cotizaciones',
      items: [
        { id: 'pedidos-especiales' as ActiveTab, label: 'Pedidos Especiales', icon: <ShoppingBag className="w-5 h-5 text-purple-400" /> },
        { id: 'pedidos-ml' as ActiveTab, label: 'Mercado Libre', icon: <ShoppingCart className="w-5 h-5 text-yellow-400" /> },
        { id: 'pedidos-monica' as ActiveTab, label: 'Cotizaciones Mónica', icon: <UserCheck className="w-5 h-5 text-pink-400" /> },
        { id: 'pedidos-cesar' as ActiveTab, label: 'Cotizaciones César', icon: <UserCheck className="w-5 h-5 text-blue-400" /> },
        { id: 'pedidos-web' as ActiveTab, label: 'Pedidos Página Web', icon: <ShoppingCart className="w-5 h-5 text-teal-400" /> },
      ]
    },
    {
      title: '📊 Reportes y Precios',
      items: [
        { id: 'listas-precios' as ActiveTab, label: 'Listas de Precios (7 Tipos)', icon: <Tag className="w-5 h-5 text-indigo-400" /> },
        { id: 'reportes-vendedor' as ActiveTab, label: 'Ventas por Vendedor', icon: <FileSpreadsheet className="w-5 h-5 text-cyan-400" /> },
        { id: 'reportes' as ActiveTab, label: 'Historial y Kardex', icon: <FileSpreadsheet className="w-5 h-5 text-slate-400" /> },
      ]
    }
  ];

  return (
    <>
      {/* Floating Scroll to Top Button for Mobile */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="sm:hidden fixed bottom-20 right-4 z-40 bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-full shadow-2xl border border-cyan-400 flex items-center justify-center transition-all animate-bounce"
          aria-label="Volver arriba"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Sticky Bottom Navigation Bar (Visible only on mobile screens < 640px) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe px-2 py-1.5 shadow-2xl">
        <div className="grid grid-cols-5 gap-1 items-center text-center">
          
          {/* 1. Portada */}
          <button
            onClick={() => handleSelectTab('portada')}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'portada'
                ? 'bg-cyan-500/20 text-cyan-400 font-extrabold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Inicio</span>
          </button>

          {/* 2. Remisión */}
          <button
            onClick={() => handleSelectTab('remisiones')}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'remisiones'
                ? 'bg-emerald-500/20 text-emerald-400 font-extrabold border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Remisión</span>
          </button>

          {/* 3. Existencias */}
          <button
            onClick={() => handleSelectTab('existencias')}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'existencias' || activeTab === 'existencias_disponibles'
                ? 'bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Boxes className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Existencias</span>
          </button>

          {/* 4. Resumen */}
          <button
            onClick={() => handleSelectTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-indigo-500/20 text-indigo-300 font-extrabold border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">Resumen</span>
          </button>

          {/* 5. Menú Completo */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-300 hover:text-white bg-slate-800/80 border border-slate-700 cursor-pointer"
          >
            <Menu className="w-5 h-5 text-cyan-400 mb-0.5" />
            <span className="text-[10px] font-bold text-cyan-300 leading-tight">Menú</span>
          </button>

        </div>
      </nav>

      {/* Full Mobile Drawer Overlay */}
      {isDrawerOpen && (
        <div className="sm:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col justify-end animate-fadeIn">
          
          <div className="bg-slate-900 border-t-2 border-cyan-500/80 rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 sticky top-0 z-10">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white">Navegación Móvil Rápida</h2>
                  <p className="text-[11px] text-slate-400">Selecciona la sección a la que deseas ir</p>
                </div>
              </div>

              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full border border-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Categories & Links list */}
            <div className="p-4 overflow-y-auto space-y-6 flex-1 pb-10">
              {tabCategories.map((cat, cIdx) => (
                <div key={cIdx} className="space-y-2">
                  <h3 className="text-xs font-black text-cyan-300 uppercase tracking-wider px-1">
                    {cat.title}
                  </h3>
                  <div className="grid grid-cols-1 gap-1.5">
                    {cat.items.map((item) => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectTab(item.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all text-xs font-bold ${
                            isActive
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-white shadow-md'
                              : 'bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-slate-900/80 rounded-xl border border-slate-700/60">
                              {item.icon}
                            </div>
                            <span className="text-sm">{item.label}</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            {item.badge && item.badge > 0 && (
                              <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full">
                                {item.badge}
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>
      )}
    </>
  );
};
