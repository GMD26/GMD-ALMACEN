import React, { useState, useRef } from 'react';
import { 
  Database, 
  Trash2, 
  Upload, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  HardDrive, 
  Globe, 
  RefreshCw, 
  ShieldAlert, 
  FileJson,
  Sparkles,
  ExternalLink,
  Check
} from 'lucide-react';

interface DatabaseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportBackup: () => void;
  onRestoreBackup: (backupData: any) => Promise<void>;
  onClearDatabase: () => Promise<void>;
  totalProductsCount: number;
  totalOrdersCount: number;
}

export const DatabaseManagementModal: React.FC<DatabaseManagementModalProps> = ({
  isOpen,
  onClose,
  onExportBackup,
  onRestoreBackup,
  onClearDatabase,
  totalProductsCount,
  totalOrdersCount
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for Danger Zone (Delete Database)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [confirmInputText, setConfirmInputText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // State for Google Drive loader
  const [showDriveLoader, setShowDriveLoader] = useState(false);
  const [driveUrlInput, setDriveUrlInput] = useState('');

  if (!isOpen) return null;

  const REQUIRED_DELETE_TEXT = 'ELIMINAR MI BASE DE DATOS';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setStatusMessage('Leyendo y analizando archivo de base de datos...');

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      if (!jsonData || (typeof jsonData !== 'object')) {
        throw new Error('El archivo no contiene un formato de respaldo válido en JSON.');
      }

      await onRestoreBackup(jsonData);
      setStatusMessage('✨ ¡Base de datos restaurada y sincronizada correctamente!');
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error(err);
      alert(`⚠️ Error al cargar la base de datos:\n${err?.message || 'Asegúrese de subir un archivo JSON de respaldo de GMD.'}`);
      setStatusMessage(null);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleFetchDriveUrl = async () => {
    if (!driveUrlInput.trim()) return;

    setIsRestoring(true);
    setStatusMessage('Conectando con Google Drive y descargando respaldo...');

    try {
      // Extract Google Drive ID if full URL
      let fetchUrl = driveUrlInput.trim();
      const driveIdMatch = fetchUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (driveIdMatch && driveIdMatch[1]) {
        fetchUrl = `https://drive.google.com/uc?export=download&id=${driveIdMatch[1]}`;
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error('No se pudo acceder al archivo en Google Drive. Verifique que el enlace sea público (cualquiera con el enlace).');
      }

      const jsonData = await response.json();
      await onRestoreBackup(jsonData);

      setStatusMessage('✨ ¡Base de datos cargada exitosamente desde Google Drive!');
      setTimeout(() => {
        setStatusMessage(null);
        setShowDriveLoader(false);
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error(err);
      alert(`⚠️ Error al cargar desde Google Drive:\n${err?.message || 'Verifique que el enlace tenga permisos de lectura abiertos.'}`);
      setStatusMessage(null);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!confirmCheckbox || confirmInputText.trim() !== REQUIRED_DELETE_TEXT) return;

    setIsDeleting(true);
    setStatusMessage('Generando respaldo automático preventivo antes de eliminar...');

    try {
      // 1. Execute automatic backup download first
      onExportBackup();

      await new Promise(res => setTimeout(res, 1000));

      setStatusMessage('Eliminando registros de la base de datos de Firestore...');
      await onClearDatabase();

      setStatusMessage('¡Base de datos eliminada. Se resguardó un respaldo automático en sus descargas.');
      setTimeout(() => {
        setStatusMessage(null);
        setShowDeleteConfirm(false);
        setConfirmCheckbox(false);
        setConfirmInputText('');
        onClose();
      }, 3000);
    } catch (err: any) {
      console.error(err);
      alert(`⚠️ Error al eliminar la base de datos: ${err?.message || 'Intente de nuevo.'}`);
      setStatusMessage(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn text-slate-900 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-600/10 text-purple-600 rounded-2xl border border-purple-200">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Gestión Global de Base de Datos</h2>
              <p className="text-xs text-slate-500 font-medium">
                Respaldo, importación desde Google Drive y eliminación segura con salvaguarda.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast Notification */}
        {statusMessage && (
          <div className="bg-slate-900 text-cyan-300 p-3.5 rounded-2xl border border-slate-800 text-xs font-bold flex items-center space-x-2 animate-fadeIn shadow-lg">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Catálogo de Productos</span>
              <span className="text-base font-black text-slate-900">{totalProductsCount} artículos</span>
            </div>
            <HardDrive className="w-5 h-5 text-purple-600" />
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total de Pedidos & Registros</span>
              <span className="text-base font-black text-slate-900">{totalOrdersCount} registros</span>
            </div>
            <FileJson className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        {/* Action Options */}
        <div className="space-y-4">

          {/* Option 1: Download Full Backup */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 rounded-2xl border border-blue-200 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-black text-blue-950 flex items-center space-x-1.5">
                <Download className="w-4 h-4 text-blue-600" />
                <span>1. Descargar Respaldo Completo (.json)</span>
              </h4>
              <p className="text-[11px] text-blue-800/80 font-medium mt-0.5">
                Exporta todas las colecciones (Productos, Pedidos Mónica/César, ML, Web, Remisiones, Precios) en un archivo JSON seguro.
              </p>
            </div>
            <button
              onClick={onExportBackup}
              className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer shrink-0 flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Descargar</span>
            </button>
          </div>

          {/* Option 2: Load / Import Database (Local File or Google Drive) */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50/50 p-4 rounded-2xl border border-purple-200 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-black text-purple-950 flex items-center space-x-1.5">
                  <Upload className="w-4 h-4 text-purple-600" />
                  <span>2. Cargar Base de Datos (Archivo o Google Drive)</span>
                </h4>
                <p className="text-[11px] text-purple-800/80 font-medium mt-0.5">
                  Restaure la base de datos desde un archivo JSON local o directamente desde su cuenta de Google Drive.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRestoring}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl shadow transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Subir Archivo</span>
                </button>

                <button
                  onClick={() => setShowDriveLoader(!showDriveLoader)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl shadow transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>Google Drive</span>
                </button>
              </div>
            </div>

            {/* Google Drive Input Panel */}
            {showDriveLoader && (
              <div className="bg-white p-3.5 rounded-xl border border-purple-200 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center space-x-1">
                    <Globe className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Cargar desde Enlace Compartido de Google Drive:</span>
                  </span>
                  <a
                    href="https://drive.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-cyan-600 hover:underline flex items-center space-x-0.5 font-semibold"
                  >
                    <span>Abrir Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={driveUrlInput}
                    onChange={(e) => setDriveUrlInput(e.target.value)}
                    placeholder="Pegue aquí el enlace o URL del respaldo JSON en Google Drive..."
                    className="flex-1 text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleFetchDriveUrl}
                    disabled={isRestoring || !driveUrlInput.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition-all cursor-pointer shrink-0"
                  >
                    Cargar
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  Asegúrese de que el archivo en Google Drive tenga permisos de acceso público ("Cualquier persona con el enlace").
                </p>
              </div>
            )}
          </div>

          {/* Option 3: Danger Zone — Delete Database */}
          <div className="bg-red-50 p-4 rounded-2xl border border-red-200 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-black text-red-950 flex items-center space-x-1.5">
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span>3. Eliminar Base de Datos (Acción de Alto Riesgo)</span>
                </h4>
                <p className="text-[11px] text-red-800/80 font-medium mt-0.5">
                  Vacía la base de datos de Firestore. Generará un respaldo preventivo automático antes de proceder.
                </p>
              </div>

              <button
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow transition-all cursor-pointer shrink-0 flex items-center space-x-1.5"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Eliminar Base</span>
              </button>
            </div>

            {/* High-Risk Danger Modal/Panel */}
            {showDeleteConfirm && (
              <div className="bg-white p-4 rounded-2xl border-2 border-red-500 space-y-3.5 animate-fadeIn">
                <div className="flex items-start space-x-2 text-red-900 bg-red-100/80 p-3 rounded-xl text-xs font-bold border border-red-300">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-black uppercase">¡Advertencia de Seguridad Crucial!</span>
                    <span>Esta acción vaciará las colecciones de la base de datos. Se descargará de manera automática una copia de seguridad en su equipo antes de borrar.</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center space-x-2 text-slate-800 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmCheckbox}
                      onChange={(e) => setConfirmCheckbox(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                    />
                    <span>Confirmo que deseo vaciar la base de datos y autorizo la acción.</span>
                  </label>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-600 mb-1">
                      Para desbloquear, escriba exactamente: <span className="text-red-700 font-black">{REQUIRED_DELETE_TEXT}</span>
                    </label>
                    <input
                      type="text"
                      value={confirmInputText}
                      onChange={(e) => setConfirmInputText(e.target.value)}
                      placeholder={REQUIRED_DELETE_TEXT}
                      className="w-full text-xs font-black px-3 py-2 border border-red-300 rounded-xl bg-red-50/50 text-red-900 focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setConfirmCheckbox(false);
                      setConfirmInputText('');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteDelete}
                    disabled={isDeleting || !confirmCheckbox || confirmInputText.trim() !== REQUIRED_DELETE_TEXT}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow cursor-pointer flex items-center space-x-1.5"
                  >
                    {isDeleting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Eliminando...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Confirmar y Eliminar Base</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
