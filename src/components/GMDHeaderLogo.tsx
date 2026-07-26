import React from 'react';
import { MapPin, Phone, Globe, Mail } from 'lucide-react';

interface GMDLogoProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const GMDLogo: React.FC<GMDLogoProps> = ({
  variant = 'dark',
  size = 'md',
  showSubtitle = true,
  className = ''
}) => {
  const textColor = variant === 'dark' ? 'text-white' : 'text-slate-900';
  const subtextColor = variant === 'dark' ? 'text-slate-400' : 'text-slate-600';

  const textSizeClass = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl';
  const barHeightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-2.5' : 'h-2';

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div className="flex items-center space-x-2">
        <span className={`font-black tracking-tight ${textSizeClass} ${textColor}`}>
          GRUPO <span className="text-cyan-500">+</span> DIGITAL
        </span>
      </div>

      {/* CMYK Color Accent Bar: Cyan, Magenta, Yellow, Key/Black */}
      <div className={`flex items-center w-full space-x-1 my-1 ${barHeightClass}`}>
        <div className="h-full flex-1 bg-cyan-500 rounded-full shadow-sm" title="Cian" />
        <div className="h-full flex-1 bg-fuchsia-500 rounded-full shadow-sm" title="Magenta" />
        <div className="h-full flex-1 bg-yellow-400 rounded-full shadow-sm" title="Amarillo" />
        <div className={`h-full flex-1 rounded-full shadow-sm ${variant === 'dark' ? 'bg-slate-300' : 'bg-slate-900'}`} title="Negro / Key" />
      </div>

      {showSubtitle && (
        <span className={`text-[10px] font-extrabold uppercase tracking-widest ${subtextColor}`}>
          Soluciones de Impresión & ERP
        </span>
      )}
    </div>
  );
};

interface GMDHeaderProps {
  variant?: 'dark' | 'light';
  vendedorNombre?: string;
  className?: string;
}

export const GMDHeader: React.FC<GMDHeaderProps> = ({
  variant = 'light',
  vendedorNombre,
  className = ''
}) => {
  const isDark = variant === 'dark';
  const bgClass = isDark ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-slate-200';
  const mutedText = isDark ? 'text-slate-300' : 'text-slate-600';

  return (
    <div className={`flex flex-col md:flex-row items-start justify-between gap-4 p-5 rounded-2xl border ${bgClass} ${className}`}>
      <div className="space-y-3 max-w-2xl">
        <GMDLogo variant={variant} size="lg" showSubtitle={false} />
        
        <p className={`text-xs font-semibold ${mutedText} flex items-center space-x-1.5 pt-1`}>
          <MapPin className="w-4 h-4 text-cyan-500 shrink-0" />
          <span>Ave. Ignacio Zaragoza 2-1, Col. Héroes De Puebla, C.P. 72520, Puebla, Pue.</span>
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-bold pt-1 border-t border-slate-200/40">
          <span className="inline-flex items-center space-x-1.5">
            <Phone className="w-3.5 h-3.5 text-cyan-600" />
            <span>Tel: 222 2133239</span>
          </span>

          <span className="inline-flex items-center space-x-1.5">
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp: +52 1 221 261 5111</span>
          </span>

          <span className="inline-flex items-center space-x-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <a href="https://grupomasdigital.com" target="_blank" rel="noopener noreferrer" className="hover:underline">
              www.grupomasdigital.com
            </a>
          </span>

          <span className="inline-flex items-center space-x-1.5">
            <Mail className="w-3.5 h-3.5 text-fuchsia-600" />
            <span>ventas@grupomasdigital.com</span>
          </span>

          {vendedorNombre && (
            <span className="bg-cyan-100 text-cyan-950 px-2.5 py-0.5 rounded text-[11px] font-black border border-cyan-300">
              Atendió: {vendedorNombre}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
