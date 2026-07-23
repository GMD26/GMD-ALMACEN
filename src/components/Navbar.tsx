import React from 'react';
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
  ShoppingCart
} from 'lucide-react';
import { User } from 'firebase/auth';
import { ActiveTab, UserProfile } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  user: User | null;
  userProfile: UserProfile | null;
  onLogin: () => void;
  onLogout: () => void;
  lowStockCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  userProfile,
  onLogin,
  onLogout,
  lowStockCount
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand - Click goes to Portada */}
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setActiveTab('portada')}>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent group-hover:to-cyan-200">
                  GRUPO MÁS DIGITAL
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30 hidden sm:inline-block">
                  SISTEMA DUAL
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Control de Inventario GMD 26 y Notas de Remisión</p>
            </div>
          </div>

          {/* User Auth Info */}
          <div className="flex items-center space-x-3">
            {user ? (
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
                    <span>Google Verificado</span>
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
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs px-4 py-2 rounded-lg transition-all shadow-md shadow-cyan-500/20"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.4h6.887c-.58 2.319-2.72 4.041-5.327 4.041-3.2 0-5.8-2.6-5.8-5.8s2.6-5.8 5.8-5.8c1.4 0 2.68.48 3.68 1.28l2.44-2.44C18.4 3.2 15.48 2 12.24 2 6.58 2 2 6.58 2 12.24s4.58 10.24 10.24 10.24c5.88 0 9.8-4.12 9.8-9.96 0-.68-.08-1.36-.2-2.24h-9.6z" />
                </svg>
                <span>Acceder con Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-800/80">
          
          {/* Portada Principal */}
          <button
            onClick={() => setActiveTab('portada')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'portada'
                ? 'bg-slate-700 text-white font-black ring-1 ring-slate-500'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-cyan-400" />
            <span>Portada</span>
          </button>

          <div className="h-4 w-px bg-slate-800 self-center mx-1" />

          {/* Botón Remisión Directo */}
          <button
            onClick={() => setActiveTab('remisiones')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'remisiones'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 font-bold'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Remisión</span>
          </button>

          <div className="h-4 w-px bg-slate-800 self-center mx-1" />

          {/* Sección Control de Inventario GMD 26 */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'dashboard'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Resumen</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'inventory'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>SKUs</span>
          </button>

          {/* Existencias Disponibles (Neto + Apartados) */}
          <button
            onClick={() => setActiveTab('existencias')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'existencias'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                : 'text-amber-300 hover:bg-slate-800 hover:text-amber-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Existencias Disponibles</span>
          </button>

          <button
            onClick={() => setActiveTab('entradas')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'entradas'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Entradas</span>
          </button>

          <button
            onClick={() => setActiveTab('salidas')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'salidas'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            <span>Salidas</span>
          </button>

          {/* Pedidos Especiales */}
          <button
            onClick={() => setActiveTab('pedidos-especiales')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'pedidos-especiales'
                ? 'bg-cyan-400 text-slate-950 font-black shadow-md shadow-cyan-400/20'
                : 'text-cyan-300 hover:bg-slate-800 hover:text-cyan-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Pedidos Especiales</span>
          </button>

          {/* Mercado Libre */}
          <button
            onClick={() => setActiveTab('pedidos-ml')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'pedidos-ml'
                ? 'bg-yellow-400 text-slate-950 font-black shadow-md shadow-yellow-400/20'
                : 'text-yellow-300 hover:bg-slate-800 hover:text-yellow-200'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Mercado Libre</span>
          </button>

          <button
            onClick={() => setActiveTab('pedidos')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all relative ${
              activeTab === 'pedidos'
                ? 'bg-red-500 text-white font-bold shadow-md shadow-red-500/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Pedidos Material</span>
            {lowStockCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-extrabold bg-white text-red-600 rounded-full animate-pulse">
                {lowStockCount}
              </span>
            )}
          </button>

          {/* Reporte por Vendedor */}
          <button
            onClick={() => setActiveTab('reportes-vendedor')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'reportes-vendedor'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Reporte Vendedor</span>
          </button>

          {/* Listas de Precios */}
          <button
            onClick={() => setActiveTab('listas-precios')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'listas-precios'
                ? 'bg-purple-500 text-white font-bold shadow-md shadow-purple-500/20'
                : 'text-purple-300 hover:bg-slate-800 hover:text-purple-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Listas de Precios</span>
          </button>

          <button
            onClick={() => setActiveTab('reportes')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'reportes'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Reportes e Historial</span>
          </button>
        </nav>
      </div>
    </header>
  );
};

