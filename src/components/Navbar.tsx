import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  LayoutDashboard, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  AlertTriangle, 
  FileSpreadsheet, 
  LogOut, 
  User as UserIcon,
  CheckCircle2,
  Receipt,
  Home,
  Lock,
  ShoppingBag,
  UserCheck,
  Tag,
  ShoppingCart,
  GripVertical,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
  Move,
  FileCheck,
  Globe,
  User,
  Layers,
  ChevronLeft,
  ChevronRight,
  Database,
  Columns
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { ActiveTab, UserProfile } from '../types';
import { GMDLogo } from './GMDHeaderLogo';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  onLogin: () => void;
  onLogout: () => void;
  lowStockCount: number;
  onOpenDatabaseManager?: () => void;
}

const DEFAULT_TAB_ORDER: ActiveTab[] = [
  'portada',
  'remisiones',
  'dashboard',
  'inventory',
  'existencias',
  'entradas',
  'salidas',
  'pedidos-especiales',
  'pedidos-ml',
  'pedidos-monica',
  'pedidos-cesar',
  'pedidos-web',
  'pedidos',
  'reportes-vendedor',
  'listas-precios',
  'reportes'
];

interface TabDefinition {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
  activeClass: string;
  inactiveClass: string;
  hasBadge?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  userProfile,
  onLogin,
  onLogout,
  lowStockCount,
  onOpenDatabaseManager
}) => {
  const navScrollRef = React.useRef<HTMLDivElement>(null);

  // Tab Layout mode: 'scroll' (1 fila con flechas) vs 'multiline' (2 filas/multirrenglón)
  const [tabsLayout, setTabsLayout] = useState<'scroll' | 'multiline'>(() => {
    return (localStorage.getItem('gmd_tabs_layout_v1') as 'scroll' | 'multiline') || 'scroll';
  });

  const toggleTabsLayout = () => {
    const next = tabsLayout === 'scroll' ? 'multiline' : 'scroll';
    setTabsLayout(next);
    localStorage.setItem('gmd_tabs_layout_v1', next);
  };

  const handleScrollNav = (direction: 'left' | 'right') => {
    if (navScrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      navScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  // Tab order state from localStorage or default
  const [tabsOrder, setTabsOrder] = useState<ActiveTab[]>(() => {
    try {
      const saved = localStorage.getItem('gmd_custom_tab_order_v1');
      if (saved) {
        const parsed: ActiveTab[] = JSON.parse(saved);
        const validSaved = parsed.filter(id => DEFAULT_TAB_ORDER.includes(id));
        const missing = DEFAULT_TAB_ORDER.filter(id => !validSaved.includes(id));
        return [...validSaved, ...missing];
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_TAB_ORDER;
  });

  // Drag & drop state for navbar items
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Modal for mobile / explicit reordering
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Helper to persist tab order explicitly
  const saveTabsOrderToLocalStorage = (newOrder: ActiveTab[]) => {
    try {
      localStorage.setItem('gmd_custom_tab_order_v1', JSON.stringify(newOrder));
    } catch (err) {
      console.error('Error al guardar el orden de pestañas:', err);
    }
  };

  // Tab Definitions Dictionary
  const tabDefs: Record<string, TabDefinition> = {
    'portada': {
      id: 'portada',
      label: 'Portada',
      icon: <Home className="w-3.5 h-3.5 text-cyan-400" />,
      activeClass: 'bg-slate-700 text-white font-black ring-1 ring-slate-500',
      inactiveClass: 'text-slate-300 hover:bg-slate-800 hover:text-white'
    },
    'remisiones': {
      id: 'remisiones',
      label: 'Remisión',
      icon: <Receipt className="w-3.5 h-3.5" />,
      activeClass: 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20',
      inactiveClass: 'text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 font-bold'
    },
    'dashboard': {
      id: 'dashboard',
      label: 'Resumen',
      icon: <LayoutDashboard className="w-3.5 h-3.5" />,
      activeClass: 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20',
      inactiveClass: 'text-slate-300 hover:bg-slate-800 hover:text-white'
    },
    'inventory': {
      id: 'inventory',
      label: 'SKUs',
      icon: <Boxes className="w-3.5 h-3.5" />,
      activeClass: 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20',
      inactiveClass: 'text-slate-300 hover:bg-slate-800 hover:text-white'
    },
    'existencias': {
      id: 'existencias',
      label: 'Existencias Disponibles',
      icon: <Lock className="w-3.5 h-3.5" />,
      activeClass: 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20',
      inactiveClass: 'text-amber-300 hover:bg-slate-800 hover:text-amber-200'
    },
    'entradas': {
      id: 'entradas',
      label: 'Entradas',
      icon: <ArrowDownToLine className="w-3.5 h-3.5" />,
      activeClass: 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20',
      inactiveClass: 'text-slate-300 hover:bg-slate-800 hover:text-white'
    },
    'salidas': {
      id: 'salidas',
      label: 'Salidas',
      icon: <ArrowUpFromLine className="w-3.5 h-3.5" />,
      activeClass: 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20',
      inactiveClass: 'text-slate-300 hover:bg-slate-800 hover:text-white'
    },
    'pedidos-especiales': {
      id: 'pedidos-especiales',
      label: 'Pedidos Especiales',
      icon: <ShoppingBag className="w-3.5 h-3.5" />,
      activeClass: 'bg-cyan-400 text-slate-950 font-black shadow-md shadow-cyan-400/20',
      inactiveClass: 'text-cyan-300 hover:bg-slate-800 hover:text-cyan-200'
    },
    'pedidos-ml': {
      id: 'pedidos-ml',
      label: 'Mercado Libre',
      icon: <ShoppingCart className="w-3.5 h-3.5" />,
      activeClass: 'bg-yellow-400 text-slate-950 font-black shadow-md shadow-yellow-400/20',
      inactiveClass: 'text-yellow-300 hover:bg-slate-800 hover:text-yellow-200'
    },
    'pedidos-monica': {
      id: 'pedidos-monica',
      label: 'Pedidos Mónica',
      icon: <FileCheck className="w-3.5 h-3.5" />,
      activeClass: 'bg-pink-500 text-white font-black shadow-md shadow-pink-500/20',
      inactiveClass: 'text-pink-300 hover:bg-slate-800 hover:text-pink-200 font-bold'
    },
    'pedidos-cesar': {
      id: 'pedidos-cesar',
      label: 'Pedidos César',
      icon: <User className="w-3.5 h-3.5" />,
      activeClass: 'bg-indigo-500 text-white font-black shadow-md shadow-indigo-500/20',
      inactiveClass: 'text-indigo-300 hover:bg-slate-800 hover:text-indigo-200 font-bold'
    },
    'pedidos-web': {
      id: 'pedidos-web',
      label: 'Pedidos Web',
      icon: <Globe className="w-3.5 h-3.5" />,
      activeClass: 'bg-blue-500 text-white font-black shadow-md shadow-blue-500/20',
      inactiveClass: 'text-blue-300 hover:bg-slate-800 hover:text-blue-200 font-bold'
    },
    'pedidos': {
      id: 'pedidos',
      label: 'Pedidos Material',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      activeClass: 'bg-red-500 text-white font-bold shadow-md shadow-red-500/20',
      inactiveClass: 'text-slate-300 hover:bg-slate-800 hover:text-white',
      hasBadge: true
    },
    'reportes-vendedor': {
      id: 'reportes-vendedor',
      label: 'Reporte Vendedor',
      icon: <UserCheck className="w-3.5 h-3.5" />,
      activeClass: 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20',
      inactiveClass: 'text-slate-300 hover:bg-slate-800 hover:text-white'
    },
    'listas-precios': {
      id: 'listas-precios',
      label: 'Listas de Precios',
      icon: <Tag className="w-3.5 h-3.5" />,
      activeClass: 'bg-purple-500 text-white font-bold shadow-md shadow-purple-500/20',
      inactiveClass: 'text-purple-300 hover:bg-slate-800 hover:text-purple-200'
    },
    'reportes': {
      id: 'reportes',
      label: 'Reportes e Historial',
      icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
      activeClass: 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20',
      inactiveClass: 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    const newOrder = [...tabsOrder];
    const [movedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, movedItem);

    setTabsOrder(newOrder);
    localStorage.setItem('gmd_custom_tab_order_v1', JSON.stringify(newOrder));
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleMoveTab = (fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= tabsOrder.length) return;
    const newOrder = [...tabsOrder];
    const [movedItem] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, movedItem);
    setTabsOrder(newOrder);
    localStorage.setItem('gmd_custom_tab_order_v1', JSON.stringify(newOrder));
  };

  const handleResetOrder = () => {
    setTabsOrder(DEFAULT_TAB_ORDER);
    localStorage.removeItem('gmd_custom_tab_order_v1');
  };

  // Normalize active tab alias checks
  const isTabActive = (tabId: ActiveTab) => {
    if (activeTab === tabId) return true;
    if (tabId === 'existencias' && activeTab === 'existencias_disponibles') return true;
    if (tabId === 'listas-precios' && activeTab === 'listas_precios') return true;
    if (tabId === 'pedidos-especiales' && activeTab === 'pedidos_especiales') return true;
    if (tabId === 'pedidos-ml' && activeTab === 'pedidos_ml') return true;
    if (tabId === 'pedidos-monica' && activeTab === 'pedidos_monica') return true;
    if (tabId === 'pedidos-cesar' && activeTab === 'pedidos_cesar') return true;
    if (tabId === 'pedidos-web' && activeTab === 'pedidos_web') return true;
    if (tabId === 'reportes-vendedor' && activeTab === 'reporte_vendedor') return true;
    return false;
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand - Click goes to Portada */}
          <div className="flex items-center space-x-3 cursor-pointer group py-1" onClick={() => setActiveTab('portada')}>
            <div>
              <GMDLogo variant="dark" size="sm" showSubtitle={false} />
              <p className="text-[10px] font-medium text-slate-400 hidden sm:block mt-0.5">Control de Inventario GMD 26 & Remisiones</p>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30 hidden lg:inline-block">
              ERP GMD 26
            </span>
          </div>

          {/* User Auth Info & Tab Reorder Button */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Customize Tabs Order Trigger Button */}
            <button
              onClick={() => setIsConfigOpen(true)}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs font-bold transition-all cursor-pointer"
              title="Organizar o reordenar pestañas"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Organizar Pestañas</span>
            </button>

            {/* Database Management Header Button */}
            {onOpenDatabaseManager && (
              <button
                onClick={onOpenDatabaseManager}
                className="hidden sm:flex items-center space-x-1.5 bg-emerald-950/90 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/80 font-bold text-xs px-3 py-1.5 rounded-lg transition-all shadow-sm cursor-pointer"
                title="Cargar / Actualizar Hoja Excel sin borrar existencias e historial"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cargar / Actualizar Excel</span>
              </button>
            )}

            {user && (
              <div className="flex items-center space-x-3 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'Usuario'} 
                    className="w-8 h-8 rounded-full border border-cyan-400" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-xs font-bold text-white">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden md:block text-left text-xs">
                  <div className="font-semibold text-slate-200">{user.displayName || user.email?.split('@')[0]}</div>
                  <div className="text-cyan-400 text-[10px] flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                    <span>Usuario Verificado</span>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title="Cerrar sesión"
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Tab Dropdown Selector (Feature 19a) */}
        <div className="sm:hidden py-2 px-1 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="flex-1 flex items-center space-x-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5">
            <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as ActiveTab)}
              className="w-full bg-transparent text-xs font-bold text-slate-100 focus:outline-none cursor-pointer"
            >
              {tabsOrder.map((tabId) => {
                const def = tabDefs[tabId];
                if (!def) return null;
                return (
                  <option key={tabId} value={tabId} className="bg-slate-900 text-white">
                    {def.label}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            onClick={() => {
              saveTabsOrderToLocalStorage(tabsOrder);
              setShowSaveToast(true);
              setTimeout(() => setShowSaveToast(false), 3000);
            }}
            className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] px-2.5 py-2 rounded-xl shadow cursor-pointer shrink-0"
            title="Fijar y guardar orden de pestañas para futuras sesiones"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Fijar Pestañas</span>
          </button>
        </div>

        {/* Desktop Tab Navigation Bar with Scroll Arrows, Multiline Toggle and Fijar Button */}
        <div className="hidden sm:flex items-center border-t border-slate-800/80 py-1.5 gap-1.5">
          {/* Scroll Left Arrow */}
          {tabsLayout === 'scroll' && (
            <button
              onClick={() => handleScrollNav('left')}
              className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors shrink-0 cursor-pointer border border-slate-700/60"
              title="Desplazar pestañas hacia la izquierda"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Dynamic & Draggable Navigation Tabs Bar */}
          <nav
            ref={navScrollRef}
            className={`flex-1 flex gap-1 py-0.5 scrollbar-none transition-all ${
              tabsLayout === 'multiline' ? 'flex-wrap overflow-visible' : 'flex-nowrap overflow-x-auto scroll-smooth'
            }`}
          >
            {tabsOrder.map((tabId, idx) => {
              const def = tabDefs[tabId];
              if (!def) return null;

              const active = isTabActive(tabId);
              const isDragging = draggedIndex === idx;
              const isOver = dragOverIndex === idx;

              return (
                <button
                  key={tabId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onClick={() => setActiveTab(tabId)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-grab active:cursor-grabbing select-none group relative ${
                    active ? def.activeClass : def.inactiveClass
                  } ${isDragging ? 'opacity-30 scale-95 border-2 border-dashed border-cyan-400' : ''} ${
                    isOver ? 'ring-2 ring-cyan-400 scale-105 bg-slate-800' : ''
                  }`}
                  title={`Pestaña "${def.label}" (Arrastre horizontalmente para reordenar)`}
                >
                  <GripVertical className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity -ml-1" />
                  {def.icon}
                  <span>{def.label}</span>

                  {def.hasBadge && lowStockCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-extrabold bg-white text-red-600 rounded-full animate-pulse">
                      {lowStockCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Scroll Right Arrow */}
          {tabsLayout === 'scroll' && (
            <button
              onClick={() => handleScrollNav('right')}
              className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors shrink-0 cursor-pointer border border-slate-700/60"
              title="Desplazar pestañas hacia la derecha"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* Toggle Multiline (2 filas) vs Scroll (1 fila) */}
          <button
            onClick={toggleTabsLayout}
            className={`p-1.5 rounded-lg transition-all shrink-0 cursor-pointer border text-xs font-bold flex items-center space-x-1 ${
              tabsLayout === 'multiline'
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/60'
            }`}
            title={tabsLayout === 'multiline' ? 'Cambiar a 1 fila con scroll' : 'Cambiar a vista multirrenglón (2 filas)'}
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{tabsLayout === 'multiline' ? '2 Filas' : '1 Fila'}</span>
          </button>

          {/* Fijar Pestañas Desktop Button */}
          <button
            onClick={() => {
              saveTabsOrderToLocalStorage(tabsOrder);
              setShowSaveToast(true);
              setTimeout(() => setShowSaveToast(false), 3000);
            }}
            className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer shrink-0 border border-emerald-400"
            title="Fijar y guardar esta configuración de pestañas para futuras sesiones"
          >
            <Check className="w-3.5 h-3.5 text-emerald-200" />
            <span>Fijar Pestañas</span>
          </button>
        </div>
      </div>

      {/* Save Notification Toast */}
      {showSaveToast && (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-600 text-white font-extrabold text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 border border-emerald-400 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-200" />
          <span>¡Configuración de pestañas guardada para futuras sesiones!</span>
        </div>
      )}

      {/* REORDER TABS CONFIGURATION MODAL */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn text-slate-900">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Move className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Reorganizar Orden de Pestañas</h3>
                  <p className="text-[11px] text-slate-500">
                    Acomode las pestañas según su flujo de trabajo. Se guardará de manera permanente para sus siguientes sesiones.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {tabsOrder.map((tabId, idx) => {
                const def = tabDefs[tabId];
                if (!def) return null;

                return (
                  <div
                    key={tabId}
                    className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}.</span>
                      <div className="p-1.5 bg-white border border-slate-200 rounded-lg">
                        {def.icon}
                      </div>
                      <span className="font-bold text-xs text-slate-900">{def.label}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleMoveTab(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 bg-white border border-slate-200 hover:bg-slate-200 text-slate-700 rounded-lg transition-all disabled:opacity-30 cursor-pointer"
                        title="Mover arriba"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleMoveTab(idx, 'down')}
                        disabled={idx === tabsOrder.length - 1}
                        className="p-1.5 bg-white border border-slate-200 hover:bg-slate-200 text-slate-700 rounded-lg transition-all disabled:opacity-30 cursor-pointer"
                        title="Mover abajo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={handleResetOrder}
                className="flex items-center space-x-1.5 text-xs text-slate-600 hover:text-red-600 font-bold px-3 py-2 rounded-xl hover:bg-red-50 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer Orden</span>
              </button>

              <button
                onClick={() => {
                  saveTabsOrderToLocalStorage(tabsOrder);
                  setShowSaveToast(true);
                  setIsConfigOpen(false);
                  setTimeout(() => setShowSaveToast(false), 3000);
                }}
                className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Guardar Configuración Fija</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};


