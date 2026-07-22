import React, { useState } from 'react';
import { Lock, Mail, ShieldCheck, ArrowRight, Boxes, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginWithGoogle: () => Promise<void>;
  onGuestLogin?: (email: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginWithGoogle,
  onGuestLogin
}) => {
  const [customEmail, setCustomEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await onLoginWithGoogle();
      onClose();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      // Popup blocked or frame error advice
      setError('No se pudo abrir la ventana de Google OAuth o fue bloqueada. Puede usar la autenticación con Gmail directa abajo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customEmail.toLowerCase().includes('@gmail.com') && !customEmail.toLowerCase().includes('@grupomasdigital.com')) {
      setError('Por favor ingrese un correo válido de Gmail (@gmail.com o @grupomasdigital.com).');
      return;
    }

    if (onGuestLogin) {
      onGuestLogin(customEmail);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-white space-y-6 relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Boxes className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
            Acceso Autorizado - Grupo Más Digital
          </h2>
          <p className="text-xs text-slate-400">
            Autenticación exclusiva con cuenta de Gmail empresarial o personal
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary Google Auth Button */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleClick}
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-3 transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12.24 10.285V13.4h6.887c-.58 2.319-2.72 4.041-5.327 4.041-3.2 0-5.8-2.6-5.8-5.8s2.6-5.8 5.8-5.8c1.4 0 2.68.48 3.68 1.28l2.44-2.44C18.4 3.2 15.48 2 12.24 2 6.58 2 2 6.58 2 12.24s4.58 10.24 10.24 10.24c5.88 0 9.8-4.12 9.8-9.96 0-.68-.08-1.36-.2-2.24h-9.6z" />
            </svg>
            <span>{loading ? 'Iniciando Sesión...' : 'Iniciar Sesión con Google'}</span>
          </button>

          <div className="flex items-center my-3">
            <div className="flex-1 border-t border-slate-800" />
            <span className="px-3 text-[11px] text-slate-500 font-semibold uppercase">O con tu correo @gmail.com</span>
            <div className="flex-1 border-t border-slate-800" />
          </div>

          {/* Fallback Gmail Direct Entry */}
          <form onSubmit={handleCustomEmailSubmit} className="space-y-3">
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1">
                Cuenta de Gmail Corporativa / Personal
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@gmail.com o usuario@grupomasdigital.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500 text-xs text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              <span>Acceder con Cuenta Gmail</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </button>
          </form>
        </div>

        {/* Security Note */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-start space-x-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <span>
            Los movimientos realizados quedarán asociados a su correo Gmail para auditoría interna de almacén.
          </span>
        </div>

        <div className="text-center">
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-400 underline"
          >
            Continuar como Visitante / Modo Lectura
          </button>
        </div>

      </div>
    </div>
  );
};
