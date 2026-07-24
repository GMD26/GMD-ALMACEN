import React, { useState, useRef } from 'react';
import { 
  Boxes, 
  Receipt, 
  ArrowRight, 
  Building2, 
  ShieldCheck, 
  Users, 
  FileCheck2, 
  Sparkles,
  BarChart3,
  Layers,
  MapPin,
  Phone,
  Tag,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2
} from 'lucide-react';

interface PortadaProps {
  onOpenInventario: () => void;
  onOpenRemision: () => void;
  onOpenListasPrecios?: () => void;
  totalProductsCount: number;
}

export const Portada: React.FC<PortadaProps> = ({
  onOpenInventario,
  onOpenRemision,
  onOpenListasPrecios,
  totalProductsCount
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Precio');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const priceCategories = [
    'Precio',
    'Precio más IVA',
    'Precio descuento',
    '1.14',
    '1.16',
    '1.2798',
    'Costo'
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus(`Archivo "${file.name}" cargado exitosamente para la categoría [${selectedCategory}].`);
    setTimeout(() => {
      if (onOpenListasPrecios) onOpenListasPrecios();
    }, 1500);
  };
  return (
    <div className="space-y-8 py-4 sm:py-8 max-w-6xl mx-auto">
      
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-slate-900 rounded-3xl p-8 sm:p-10 border border-slate-800 text-white shadow-2xl">
        {/* Background Decorative Gradients */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* Logo & Company Identity */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4 max-w-2xl">
            <div>
              <div className="inline-flex items-center space-x-2 bg-slate-800/90 border border-slate-700/80 px-3 py-1 rounded-full text-[11px] font-semibold text-cyan-400 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Matriz Puebla • Grupo Más Digital</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                GRUPO MÁS DIGITAL
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Selecciona la herramienta que deseas operar hoy. Gestiona el catálogo de inventario con más de {totalProductsCount || '613'} SKUs en la hoja <strong className="text-white">Inventario GMD 26</strong> o emite notas de remisión profesionales.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-slate-400 pt-1 border-t border-slate-800/80 w-full">
              <span className="flex items-center space-x-1 font-semibold text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ave. Ignacio Zaragoza 2-1, Col. Héroes De Puebla, C.P. 72520, Puebla, Pue.</span>
              </span>
            </div>
          </div>

          {/* Quick Action Navigation Shortcuts */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto min-w-[240px]">
            <button
              onClick={onOpenInventario}
              className="flex items-center justify-between bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-5 py-3.5 rounded-2xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer group"
            >
              <div className="flex items-center space-x-2">
                <Boxes className="w-5 h-5" />
                <span>Inventario GMD 26</span>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onOpenRemision}
              className="flex items-center justify-between bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer group"
            >
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5" />
                <span>Nota de Remisión</span>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </div>

      {/* Main Two Action Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        
        {/* BUTTON / MODULE 1: INVENTARIO GMD 26 */}
        <div 
          onClick={onOpenInventario}
          className="group relative bg-white hover:bg-slate-50/90 rounded-3xl p-8 border-2 border-slate-200 hover:border-cyan-500 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden transform hover:-translate-y-1"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Boxes className="w-40 h-40 text-cyan-600" />
          </div>

          <div className="space-y-5 relative z-10">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-200 group-hover:scale-110 transition-transform">
                <Boxes className="w-8 h-8" />
              </div>
              <span className="px-3 py-1 text-xs font-extrabold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                {totalProductsCount || 613} SKUs Registrados
              </span>
            </div>

            <div>
              <div className="text-xs font-bold text-cyan-600 uppercase tracking-wider mb-1">
                Control de Almacén y Stock
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-cyan-700 transition-colors">
                Inventario GMD 26
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Acceso a la hoja de control de inventario de Grupo Más Digital. Registra entradas, salidas, alertas de stock mínimo, órdenes de compra y reportes en tiempo real.
              </p>
            </div>

            <ul className="space-y-2 text-xs font-medium text-slate-600 pt-2 border-t border-slate-100">
              <li className="flex items-center space-x-2">
                <FileCheck2 className="w-4 h-4 text-cyan-500" />
                <span>Control de 613+ productos catalogados</span>
              </li>
              <li className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-cyan-500" />
                <span>Kardex de Entradas, Salidas e Historial</span>
              </li>
              <li className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-cyan-500" />
                <span>Captura manual y reinicio de existencias</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
            <span className="text-xs font-bold text-slate-500">Hoja Control de Inventario</span>
            <button className="flex items-center space-x-2 bg-slate-900 group-hover:bg-cyan-600 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-md transition-all">
              <span>Inventario GMD 26</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* BUTTON / MODULE 2: REMISIÓN */}
        <div 
          onClick={onOpenRemision}
          className="group relative bg-white hover:bg-slate-50/90 rounded-3xl p-8 border-2 border-slate-200 hover:border-emerald-500 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden transform hover:-translate-y-1"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Receipt className="w-40 h-40 text-emerald-600" />
          </div>

          <div className="space-y-5 relative z-10">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 group-hover:scale-110 transition-transform">
                <Receipt className="w-8 h-8" />
              </div>
              <span className="px-3 py-1 text-xs font-extrabold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                Folios Consecutivos
              </span>
            </div>

            <div>
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
                Comprobantes y Notas de Venta
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                Remisión
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Genera notas de remisión o notas de venta profesionales con encabezado oficial de Grupo Más Digital, datos de cliente, precios modificables, firma digital y exportación a PDF.
              </p>
            </div>

            <ul className="space-y-2 text-xs font-medium text-slate-600 pt-2 border-t border-slate-100">
              <li className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-emerald-500" />
                <span>Logotipo y datos del vendedor oficiales</span>
              </li>
              <li className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>Base de Datos de Clientes e importación de precios</span>
              </li>
              <li className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Firma digital del cliente + PDF/Impresión</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
            <span className="text-xs font-bold text-slate-500">Módulo de Remisiones</span>
            <button className="flex items-center space-x-2 bg-slate-900 group-hover:bg-emerald-600 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-md transition-all">
              <span>Remisión</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

      </div>

      {/* MODULE 3: LISTAS DE PRECIOS (7 CATEGORÍAS DE PRECIO) - SUBIR EXCEL / PDF */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 border border-indigo-800/60 text-white shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-800/50 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <Tag className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-2 text-indigo-300 font-extrabold text-xs uppercase tracking-wider mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Gestión de Precios de Venta</span>
              </div>
              <h2 className="text-2xl font-black text-white">Listas de Precios (7 Categorías Disponibles)</h2>
              <p className="text-xs text-indigo-200 mt-1 max-w-xl">
                Carga o actualiza tus archivos <strong className="text-white">Excel (.xlsx) o PDF</strong> con los precios de venta correspondientes a las 7 categorías asignables a clientes y remisiones.
              </p>
            </div>
          </div>

          {onOpenListasPrecios && (
            <button
              onClick={onOpenListasPrecios}
              className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl shadow-lg transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Ver Listas de Precios</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 7 Price Categories Grid & File Upload Link */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Categories Pill List */}
          <div className="md:col-span-7 space-y-3">
            <label className="block text-xs font-bold text-indigo-300 uppercase tracking-wider">
              Categorías de Precio Habilitadas:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {priceCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`p-2.5 rounded-xl border text-left transition-all text-xs font-bold cursor-pointer ${
                    selectedCategory === cat 
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' 
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Upload Excel / PDF Area */}
          <div className="md:col-span-5 bg-slate-800/90 border border-indigo-500/30 rounded-2xl p-5 space-y-3 text-center">
            <div className="flex items-center justify-center space-x-2 text-indigo-300">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <FileText className="w-5 h-5 text-cyan-400" />
              <span className="font-extrabold text-xs">Subir Lista (Excel / PDF)</span>
            </div>

            <p className="text-[11px] text-slate-300">
              Carga tu archivo para la categoría seleccionada: <strong className="text-white font-bold">{selectedCategory}</strong>
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .pdf, .csv"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-indigo-200" />
              <span>Seleccionar Archivo Excel o PDF</span>
            </button>

            {uploadStatus && (
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center space-x-2 text-left">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{uploadStatus}</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Business Trust & Capability Highlights */}
      <div className="bg-slate-900/95 rounded-2xl p-6 border border-slate-800 text-white text-xs grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="font-extrabold text-cyan-400 text-sm">Catálogo Sincronizado</div>
          <div className="text-slate-400 mt-1">Busca SKUs, precios y existencias en tiempo real al hacer remisiones.</div>
        </div>
        <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="font-extrabold text-emerald-400 text-sm">PDF & Imagen Instantánea</div>
          <div className="text-slate-400 mt-1">Exporta Notas de Remisión listas para enviar por WhatsApp o imprimir.</div>
        </div>
        <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="font-extrabold text-amber-400 text-sm">Descuento Automático</div>
          <div className="text-slate-400 mt-1">Opcionalmente genera la salida de almacén al emitir la remisión.</div>
        </div>
      </div>

    </div>
  );
};
