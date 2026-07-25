import React, { useState, useRef } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  X, 
  Check, 
  Trash2, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  UserCheck,
  FileSpreadsheet,
  Upload,
  Download,
  Clipboard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Customer } from '../types';

interface CustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id'>) => Promise<void>;
  onDeleteCustomer?: (id: string) => Promise<void>;
  onSelectCustomer?: (customer: Customer) => void;
}

export const CustomersModal: React.FC<CustomersModalProps> = ({
  isOpen,
  onClose,
  customers,
  onAddCustomer,
  onDeleteCustomer,
  onSelectCustomer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importTab, setImportTab] = useState<'upload' | 'paste'>('upload');
  
  // New Customer Form State
  const [razonSocial, setRazonSocial] = useState('');
  const [rfcOrId, setRfcOrId] = useState('');
  const [domicilioEntrega, setDomicilioEntrega] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [contactoNombre, setContactoNombre] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Import State
  const [rawText, setRawText] = useState('');
  const [parsedCustomers, setParsedCustomers] = useState<Omit<Customer, 'id'>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const filteredCustomers = customers.filter(c => 
    c.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefono.includes(searchTerm) ||
    (c.rfcOrId && c.rfcOrId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const normalizeRowToCustomer = (row: Record<string, any>, idx: number): Omit<Customer, 'id'> | null => {
    const keys = Object.keys(row);
    const findValue = (possibleNames: string[]) => {
      const match = keys.find(k => possibleNames.includes(k.trim().toUpperCase()));
      return match ? String(row[match]).trim() : '';
    };

    const razon = findValue([
      'RAZON SOCIAL', 'RAZÓN SOCIAL', 'NOMBRE', 'CLIENTE', 'EMPRESA', 'RECEPTOR', 'RAZONSOCIAL', 'NOMBRE_CLIENTE'
    ]) || (row[0] ? String(row[0]).trim() : '');

    if (!razon) return null;

    const rfc = findValue(['RFC', 'ID', 'TAX ID', 'RFC/ID', 'RFC_ID', 'IDENTIFICACION']) || (row[1] ? String(row[1]).trim() : '');
    const domicilio = findValue([
      'DOMICILIO', 'DOMICILIO DE ENTREGA', 'DOMICILIO_ENTREGA', 'DIRECCION', 'DIRECCIÓN', 'CALLE', 'DIRECCION_ENTREGA'
    ]) || (row[2] ? String(row[2]).trim() : 'Ciudad de México / Puebla');

    const tel = findValue(['TELEFONO', 'TELÉFONO', 'TEL', 'CEL', 'CELULAR', 'WHATSAPP']) || (row[3] ? String(row[3]).trim() : '');
    const mail = findValue(['EMAIL', 'CORREO', 'CORREO ELECTRÓNICO', 'E-MAIL', 'MAIL']) || (row[4] ? String(row[4]).trim() : '');
    const contacto = findValue(['CONTACTO', 'ATENCION', 'ATENCIÓN', 'AT\'N', 'NOMBRE CONTACTO', 'ATENCION_A']) || (row[5] ? String(row[5]).trim() : '');

    return {
      razonSocial: razon,
      rfcOrId: rfc,
      domicilioEntrega: domicilio,
      telefono: tel,
      email: mail,
      contactoNombre: contacto,
      createdAt: new Date().toISOString()
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setIsImporting(true);
    setImportErrors([]);

    try {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const list: Omit<Customer, 'id'>[] = [];
        const errs: string[] = [];

        json.forEach((row, idx) => {
          const c = normalizeRowToCustomer(row, idx);
          if (c) list.push(c);
          else errs.push(`Fila ${idx + 2}: Nombre/Razón Social omitido.`);
        });

        setParsedCustomers(list);
        setImportErrors(errs);
      } else {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const list: Omit<Customer, 'id'>[] = [];
            const errs: string[] = [];
            results.data.forEach((row: any, idx: number) => {
              const c = normalizeRowToCustomer(row, idx);
              if (c) list.push(c);
              else errs.push(`Fila ${idx + 2}: Registro incompleto.`);
            });
            setParsedCustomers(list);
            setImportErrors(errs);
          },
          error: (err) => {
            setImportErrors([`Error al leer archivo CSV: ${err.message}`]);
          }
        });
      }
    } catch (err: any) {
      setImportErrors([`Error al procesar archivo: ${err.message || String(err)}`]);
    } finally {
      setIsImporting(false);
    }
  };

  const handleProcessPastedText = () => {
    if (!rawText.trim()) return;
    setIsImporting(true);
    setImportErrors([]);

    Papa.parse(rawText.trim(), {
      header: true,
      delimiter: '',
      skipEmptyLines: true,
      complete: (results) => {
        setIsImporting(false);
        const list: Omit<Customer, 'id'>[] = [];
        const errs: string[] = [];
        results.data.forEach((row: any, idx: number) => {
          const c = normalizeRowToCustomer(row, idx);
          if (c) list.push(c);
          else errs.push(`Línea ${idx + 1}: Fila omitida.`);
        });
        setParsedCustomers(list);
        setImportErrors(errs);
      }
    });
  };

  const handleDownloadTemplate = () => {
    const csv = [
      'RAZON SOCIAL,RFC,DOMICILIO DE ENTREGA,TELEFONO,EMAIL,CONTACTO',
      'COMERCIALIZADORA IMPRESIONES S.A. DE C.V.,CIM980212ABC,"Av. Reforma 1230, Col. Centro, Puebla, C.P. 72000",2221234567,contacto@impresiones.com,Ing. Roberto Gómez',
      'DISTRIBUIDORA GRAFICA DIGITAL,DGD051011XYZ,"Calle 5 de Mayo 402, Industrial, Cholula",2229876543,ventas@graficadigital.mx,Lic. Mariana Torres'
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Plantilla_Clientes_GrupoMasDigital.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExecuteBulkImport = async () => {
    if (parsedCustomers.length === 0) return;
    setIsImporting(true);
    try {
      for (const cust of parsedCustomers) {
        await onAddCustomer(cust);
      }
      alert(`¡Se importaron ${parsedCustomers.length} clientes exitosamente!`);
      setParsedCustomers([]);
      setIsImportOpen(false);
    } catch (err: any) {
      console.error(err);
      alert('Ocurrió un error al guardar algunos clientes: ' + (err.message || String(err)));
    } finally {
      setIsImporting(false);
    }
  };

  const handleSubmitNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!razonSocial.trim() || !domicilioEntrega.trim()) {
      alert('Por favor ingresa la Razón Social / Nombre y la Dirección de Entrega.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddCustomer({
        razonSocial: razonSocial.trim(),
        rfcOrId: rfcOrId.trim(),
        domicilioEntrega: domicilioEntrega.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        contactoNombre: contactoNombre.trim(),
        createdAt: new Date().toISOString()
      });

      // Reset form
      setRazonSocial('');
      setRfcOrId('');
      setDomicilioEntrega('');
      setTelefono('');
      setEmail('');
      setContactoNombre('');
      setIsFormOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error al guardar el cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Catálogo de Clientes</h3>
              <p className="text-xs text-slate-400">Administra los datos de los receptores e importa masivamente desde Excel.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Action Bar & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cliente por nombre, RFC, teléfono o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-slate-50"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setIsImportOpen(!isImportOpen);
                  if (isFormOpen) setIsFormOpen(false);
                }}
                className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isImportOpen ? 'Cerrar Importador' : 'Importar Excel / CSV'}</span>
              </button>

              <button
                onClick={() => {
                  setIsFormOpen(!isFormOpen);
                  if (isImportOpen) setIsImportOpen(false);
                }}
                className="flex items-center justify-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>{isFormOpen ? 'Ocultar Formulario' : 'Alta de Cliente'}</span>
              </button>
            </div>
          </div>

          {/* BULK EXCEL / CSV IMPORT SECTION */}
          {isImportOpen && (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                  <h4 className="font-extrabold text-sm text-emerald-950">
                    Importación Masiva de Clientes desde Excel
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center space-x-1 text-xs font-bold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-100 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Plantilla CSV</span>
                </button>
              </div>

              {/* Tab Selector */}
              <div className="inline-flex rounded-lg bg-emerald-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setImportTab('upload')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    importTab === 'upload' ? 'bg-white text-emerald-950 shadow font-bold' : 'text-emerald-800'
                  }`}
                >
                  Subir Archivo (.xlsx / .csv)
                </button>
                <button
                  type="button"
                  onClick={() => setImportTab('paste')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    importTab === 'paste' ? 'bg-white text-emerald-950 shadow font-bold' : 'text-emerald-800'
                  }`}
                >
                  Copiar y Pegar desde Excel
                </button>
              </div>

              {/* File Upload Tab */}
              {importTab === 'upload' && (
                <div className="space-y-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx, .xls, .csv, .tsv, .txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white rounded-xl p-6 text-center cursor-pointer hover:bg-emerald-50/50 transition-all"
                  >
                    <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <span className="font-bold text-xs text-slate-800 block">
                      Selecciona o arrastra tu archivo Excel / CSV aquí
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Columnas detectadas automáticamente: Razón Social, RFC, Domicilio, Teléfono, Correo, Contacto
                    </span>
                  </div>

                  {importFileName && (
                    <div className="flex items-center space-x-2 text-xs text-emerald-800 bg-white p-2.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Archivo seleccionado: <strong>{importFileName}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* Paste Tab */}
              {importTab === 'paste' && (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Copiar celdas de Excel y pegar aquí (ej. RAZON SOCIAL	RFC	DOMICILIO	TELEFONO...)"
                    className="w-full p-2.5 text-xs font-mono border border-emerald-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleProcessPastedText}
                    disabled={!rawText.trim() || isImporting}
                    className="bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    Procesar Texto
                  </button>
                </div>
              )}

              {/* Parsed Preview Table */}
              {parsedCustomers.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-emerald-200 text-xs">
                    <span className="font-extrabold text-emerald-950">
                      {parsedCustomers.length} Clientes listos para guardar en catálogo
                    </span>
                    <button
                      type="button"
                      onClick={handleExecuteBulkImport}
                      disabled={isImporting}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2 rounded-xl shadow cursor-pointer disabled:opacity-50"
                    >
                      {isImporting ? 'Importando...' : `Confirmar e Importar (${parsedCustomers.length})`}
                    </button>
                  </div>

                  <div className="border border-emerald-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-emerald-100 text-emerald-900 font-bold sticky top-0">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">Razón Social / Nombre</th>
                          <th className="p-2">RFC / ID</th>
                          <th className="p-2">Domicilio de Entrega</th>
                          <th className="p-2">Teléfono</th>
                          <th className="p-2">Correo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-50">
                        {parsedCustomers.slice(0, 30).map((c, idx) => (
                          <tr key={idx} className="hover:bg-emerald-50/50">
                            <td className="p-2 text-slate-400">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-900">{c.razonSocial}</td>
                            <td className="p-2 text-slate-600">{c.rfcOrId || '—'}</td>
                            <td className="p-2 text-slate-600 truncate max-w-xs">{c.domicilioEntrega}</td>
                            <td className="p-2 text-slate-600">{c.telefono || '—'}</td>
                            <td className="p-2 text-slate-600">{c.email || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importErrors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900">
                  <span className="font-bold block mb-1">Alertas durante lectura:</span>
                  <ul className="list-disc list-inside space-y-0.5 max-h-20 overflow-y-auto">
                    {importErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* New Customer Form */}
          {isFormOpen && (
            <form onSubmit={handleSubmitNewCustomer} className="bg-cyan-50/50 border border-cyan-200 rounded-2xl p-5 space-y-4">
              <h4 className="font-extrabold text-sm text-cyan-950 flex items-center space-x-2 border-b border-cyan-200/80 pb-2">
                <UserCheck className="w-4 h-4 text-cyan-600" />
                <span>Registro Individual de Nuevo Cliente</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nombre o Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Comercializadora Digital S.A. de C.V."
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    RFC o ID Fiscal
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. CDI980212ABC"
                    value={rfcOrId}
                    onChange={(e) => setRfcOrId(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Domicilio Exacto de Entrega *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Calle, Número, Colonia, Municipio, Estado, C.P."
                    value={domicilioEntrega}
                    onChange={(e) => setDomicilioEntrega(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. (55) 1234-5678"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="compras@cliente.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Atención / Contacto Principal
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Ing. Carlos Mendoza"
                    value={contactoNombre}
                    onChange={(e) => setContactoNombre(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-1.5 rounded-lg shadow cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          )}

          {/* Customers List */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No hay clientes registrados que coincidan. Haz clic en "Dar de Alta Cliente" para agregar uno nuevo.
              </div>
            ) : (
              filteredCustomers.map((c) => (
                <div key={c.id} className="p-4 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-slate-900 text-sm">{c.razonSocial}</span>
                      {c.rfcOrId && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded">
                          RFC: {c.rfcOrId}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{c.domicilioEntrega}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                      {c.telefono && (
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.telefono}</span>
                        </span>
                      )}
                      {c.email && (
                        <span className="flex items-center space-x-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{c.email}</span>
                        </span>
                      )}
                      {c.contactoNombre && (
                        <span className="flex items-center space-x-1 font-semibold text-slate-700">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>At'n: {c.contactoNombre}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    {onSelectCustomer && (
                      <button
                        onClick={() => {
                          onSelectCustomer(c);
                          onClose();
                        }}
                        className="flex items-center space-x-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Seleccionar</span>
                      </button>
                    )}

                    {onDeleteCustomer && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar cliente "${c.razonSocial}"?`)) {
                            onDeleteCustomer(c.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar Cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Total de clientes registrados: <strong>{customers.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
