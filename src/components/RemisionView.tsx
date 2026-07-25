import React, { useState, useRef, useEffect } from 'react';
import { 
  Receipt, 
  Printer, 
  Download, 
  Save, 
  Plus, 
  Trash2, 
  Search, 
  Users, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  RotateCcw, 
  Edit3, 
  ArrowLeft,
  FileCheck,
  AlertCircle,
  Eye,
  Layers,
  Sparkles,
  User,
  Phone,
  CreditCard,
  Wallet,
  CalendarDays
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Product, Customer, Remision, RemisionItem, UserProfile } from '../types';
import { CustomersModal } from './CustomersModal';
import { CatalogPickerModal } from './CatalogPickerModal';
import { extractPeso, getPrecioConIva } from '../data/initialCatalog';

interface RemisionViewProps {
  products: Product[];
  customers: Customer[];
  remisiones: Remision[];
  userProfile: UserProfile | null;
  onSaveRemision: (remision: Omit<Remision, 'id'>, discountStock: boolean) => Promise<string>;
  onDeleteRemision?: (id: string) => Promise<void>;
  onAddCustomer: (customer: Omit<Customer, 'id'>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onBackToPortada: () => void;
}

export const RemisionView: React.FC<RemisionViewProps> = ({
  products,
  customers,
  remisiones,
  userProfile,
  onSaveRemision,
  onDeleteRemision,
  onAddCustomer,
  onDeleteCustomer,
  onBackToPortada
}) => {
  // Document Configuration State (Vendedor Info)
  const [razonSocialVendedor, setRazonSocialVendedor] = useState('Grupo Más Digital');
  const [direccionVendedor, setDireccionVendedor] = useState('Ave. Ignacio Zaragoza 2-1, Col. Héroes De Puebla, C.P. 72520, Puebla, Pue.');
  
  // Vendedor Selection & Contact Details
  const [vendedorNombre, setVendedorNombre] = useState<string>('Cesar Garcia');
  const [telefonoVendedor, setTelefonoVendedor] = useState('222 213 3239');
  const [whatsappVendedor, setWhatsappVendedor] = useState('+52 1 221 261 5111');
  const [emailVendedor, setEmailVendedor] = useState('ventas@grupomasdigital.com');

  const handleVendorChange = (name: string) => {
    setVendedorNombre(name);
    if (name === 'Cesar Garcia') {
      setTelefonoVendedor('222 213 3239');
      setWhatsappVendedor('+52 1 221 261 5111');
    } else if (name === 'Manuel Moreno') {
      setTelefonoVendedor('');
      setWhatsappVendedor('+52 1 222 661 4977');
    } else if (name === 'Luis Blanco' || name === 'Luis Blanno') {
      setTelefonoVendedor('');
      setWhatsappVendedor('+52 1 222 577 1532');
    } else if (name === 'Mostrador') {
      setTelefonoVendedor('');
      setWhatsappVendedor('+52 1 222 581 5351');
    }
  };

  // Document Identification State
  const [documentType, setDocumentType] = useState<'Nota de Remisión' | 'Nota de Venta'>('Nota de Remisión');
  const [folio, setFolio] = useState<string>(`REM-2026-${String(remisiones.length + 1).padStart(4, '0')}`);
  const [fechaEmision, setFechaEmision] = useState<string>(new Date().toISOString().split('T')[0]);

  // Payment Terms State
  const [formaPago, setFormaPago] = useState<string>('Efectivo');
  const [condicionPago, setCondicionPago] = useState<'Contado' | 'Crédito'>('Contado');
  const [fechaPago, setFechaPago] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });

  // Customer State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [nombreCliente, setNombreCliente] = useState('');
  const [rfcCliente, setRfcCliente] = useState('');
  const [domicilioCliente, setDomicilioCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [emailCliente, setEmailCliente] = useState('');

  // Items Table State
  const [items, setItems] = useState<RemisionItem[]>([
    {
      id: '1',
      sku: 'DTF01',
      descripcion: 'PELICULA DE IMPRESION DTF 30CM X 100M',
      medida: '30CM X 100M',
      unidad: 'ROLLO',
      peso: '100g',
      cantidad: 1,
      precioUnitario: 1850,
      importe: 1850
    }
  ]);

  // Pricing & Terms State
  const [aplicaIva, setAplicaIva] = useState(true);
  const [observaciones, setObservaciones] = useState('Mercancía entregada en perfectas condiciones y a entera satisfacción. Favor de verificar su pedido al momento de la entrega.');
  const [discountStockOnSave, setDiscountStockOnSave] = useState(true);

  // Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Modals & History Drawers
  const [isCustomersModalOpen, setIsCustomersModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  const printableRef = useRef<HTMLDivElement>(null);

  // Initialize auto folio on remisiones list change
  useEffect(() => {
    if (!folio || folio.startsWith('REM-2026-')) {
      setFolio(`REM-2026-${String(remisiones.length + 1).padStart(4, '0')}`);
    }
  }, [remisiones.length]);

  // Auto fill client details when selected
  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setNombreCliente(c.razonSocial);
    setRfcCliente(c.rfcOrId || '');
    setDomicilioCliente(c.domicilioEntrega);
    setTelefonoCliente(c.telefono || '');
    setEmailCliente(c.email || '');
  };

  // Canvas Drawing Handlers for Client Signature
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Item Table Logic
  const handleAddItem = (prod?: Product) => {
    const unitPrice = prod ? getPrecioConIva(prod) : 0;
    const newItem: RemisionItem = {
      id: String(Date.now() + Math.random()),
      sku: prod ? prod.sku : '',
      descripcion: prod ? prod.descripcion : '',
      medida: prod ? prod.medida : 'Estándar',
      unidad: prod ? prod.unidad : 'PZA',
      peso: prod ? (prod.peso || extractPeso(prod.descripcion)) : 'Estándar',
      cantidad: 1,
      precioUnitario: unitPrice,
      importe: unitPrice
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof RemisionItem, val: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: val };

      // If SKU changed, lookup product details
      if (field === 'sku') {
        const found = products.find(p => p.sku.toUpperCase() === String(val).toUpperCase() || p.id === val);
        if (found) {
          const unitPrice = getPrecioConIva(found);
          updated.sku = found.sku;
          updated.descripcion = found.descripcion;
          updated.medida = found.medida;
          updated.unidad = found.unidad;
          updated.peso = found.peso || extractPeso(found.descripcion);
          updated.precioUnitario = unitPrice;
        }
      }

      // Recalculate importe
      if (field === 'cantidad' || field === 'precioUnitario' || field === 'sku') {
        const qty = parseFloat(String(updated.cantidad)) || 0;
        const price = parseFloat(String(updated.precioUnitario)) || 0;
        updated.importe = Math.round(qty * price * 100) / 100;
      }

      return updated;
    }));
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      alert('La remisión debe tener al menos 1 producto.');
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // Calculations: Unit prices and line importes ALREADY include 16% IVA
  const total = items.reduce((acc, item) => acc + (item.importe || 0), 0);
  const subtotal = aplicaIva ? Math.round((total / 1.16) * 100) / 100 : total;
  const iva = aplicaIva ? Math.round((total - subtotal) * 100) / 100 : 0;

  // Save Remisión Handler
  const handleSaveDocument = async () => {
    if (!nombreCliente.trim() || !domicilioCliente.trim()) {
      alert('Por favor especifica el Nombre/Razón Social y Domicilio de entrega del Cliente.');
      return;
    }
    if (items.length === 0 || items.some(i => !i.descripcion.trim())) {
      alert('Por favor completa la información de los productos.');
      return;
    }

    setIsSaving(true);
    try {
      const signatureData = hasSignature && canvasRef.current ? canvasRef.current.toDataURL('image/png') : '';

      const remisionData: Omit<Remision, 'id'> = {
        folio,
        fecha: fechaEmision,
        cliente: {
          id: selectedCustomer?.id || `cli-${Date.now()}`,
          razonSocial: nombreCliente.trim(),
          rfcOrId: rfcCliente.trim(),
          domicilioEntrega: domicilioCliente.trim(),
          telefono: telefonoCliente.trim(),
          email: emailCliente.trim()
        },
        items,
        subtotal,
        aplicaIva,
        iva,
        total,
        observaciones: observaciones.trim(),
        vendedorNombre: vendedorNombre,
        vendedorContacto: `Tel: ${telefonoVendedor || 'N/A'} | WhatsApp: ${whatsappVendedor || 'N/A'}`,
        formaPago,
        condicionPago,
        fechaPago: condicionPago === 'Crédito' ? fechaPago : '',
        firmaClienteUrl: signatureData,
        estado: 'EMITIDA',
        descontoInventario: discountStockOnSave,
        createdAt: new Date().toISOString()
      };

      await onSaveRemision(remisionData, discountStockOnSave);
      setIsSaving(false);
      alert(`¡${documentType} ${folio} guardada exitosamente! ${discountStockOnSave ? 'Se generaron las salidas de almacén correspondientes.' : ''}`);
    } catch (err) {
      console.error(err);
      setIsSaving(false);
      alert('Error al guardar la remisión en la base de datos.');
    }
  };

  // Export PDF Handler
  const handleDownloadPdf = async () => {
    if (!printableRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const canvas = await html2canvas(printableRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${documentType.replace(/\s+/g, '_')}_${folio}.pdf`);
    } catch (err) {
      console.error(err);
      alert('No se pudo generar el archivo PDF. Intenta de nuevo.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Top Navigation & Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 text-white p-4 rounded-2xl shadow-xl print:hidden">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToPortada}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center space-x-1 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Portada</span>
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-black text-white">Módulo de Nota de Remisión</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                Grupo Más Digital
              </span>
            </div>
            <p className="text-xs text-slate-400">Emisión oficial, precios modificables, firma digital y exportación PDF.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center space-x-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 font-bold text-xs px-3 py-2 rounded-xl border border-cyan-700/60 transition-colors cursor-pointer"
          >
            <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Historial ({remisiones.length})</span>
          </button>

          <button
            onClick={() => setIsCustomersModalOpen(true)}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs px-3 py-2 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Catálogo Clientes</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3 py-2 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? 'Generando...' : 'PDF'}</span>
          </button>

          <button
            onClick={handleSaveDocument}
            disabled={isSaving}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Remisión'}</span>
          </button>
        </div>
      </div>

      {/* Options Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-xs print:hidden">
        
        {/* Vendedor Field Selector */}
        <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200 w-full md:w-auto">
          <User className="w-4 h-4 text-cyan-600" />
          <span className="font-extrabold text-slate-800">Vendedor:</span>
          <select
            value={vendedorNombre}
            onChange={(e) => handleVendorChange(e.target.value)}
            className="p-1.5 font-black border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-cyan-500 cursor-pointer"
          >
            <option value="Manuel Moreno">Manuel Moreno</option>
            <option value="Luis BlanNo">Luis BlanNo</option>
            <option value="Cesar Garcia">Cesar Garcia</option>
            <option value="Mostrador">Mostrador</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <label className="flex items-center space-x-2 font-bold text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={discountStockOnSave}
              onChange={(e) => setDiscountStockOnSave(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span>Descontar de Almacén al guardar (Salida de Stock)</span>
          </label>

          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-medium">Tipo Documento:</span>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as any)}
              className="p-1.5 font-bold border border-slate-300 rounded-lg text-slate-800 bg-slate-50 cursor-pointer"
            >
              <option value="Nota de Remisión">Nota de Remisión</option>
              <option value="Nota de Venta">Nota de Venta</option>
            </select>
          </div>
        </div>

      </div>

      {/* PRINTABLE NOTA DE REMISIÓN CONTAINER */}
      <div 
        ref={printableRef}
        className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-2xl space-y-8 font-sans text-slate-900 printable-document"
      >
        
        {/* 1. ENCABEZADO (DATOS DEL VENDEDOR) & IDENTIFICACIÓN DEL DOCUMENTO */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6 border-b-2 border-slate-900 pb-6">
          
          {/* Vendedor Info */}
          <div className="flex items-start max-w-xl">
            <div className="space-y-1.5">
              <h1 className="font-black text-2xl text-slate-900 tracking-tight leading-none">
                {razonSocialVendedor}
              </h1>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {direccionVendedor}
              </p>

              <div className="text-xs pt-2 space-y-1 border-t border-slate-100">
                <div className="flex items-center space-x-1.5 text-slate-900 font-extrabold">
                  <span className="text-slate-500 font-bold">Vendedor:</span>
                  <span className="bg-cyan-100 text-cyan-950 px-2 py-0.5 rounded text-xs font-black border border-cyan-200">
                    {vendedorNombre}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 font-bold pt-0.5">
                  {telefonoVendedor && (
                    <span className="inline-flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Tel: {telefonoVendedor}</span>
                    </span>
                  )}
                  {whatsappVendedor && (
                    <span className="inline-flex items-center space-x-1 text-emerald-700">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp: {whatsappVendedor}</span>
                    </span>
                  )}
                  {emailVendedor && (
                    <span className="text-slate-500 font-normal">
                      • {emailVendedor}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Document Title & Folio Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 text-right w-full sm:w-auto min-w-[220px] shadow-md border border-slate-800">
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-cyan-500 text-slate-950 rounded mb-1 inline-block">
              {documentType}
            </span>
            <div className="text-xs font-medium text-slate-400">Número de Folio</div>
            <div className="text-2xl font-black text-white tracking-widest my-0.5 font-mono">
              {folio}
            </div>
            <div className="text-xs text-slate-300 font-semibold flex items-center justify-end space-x-1 pt-1 border-t border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Fecha: {fechaEmision}</span>
            </div>
          </div>

        </div>

        {/* 2. DATOS DEL CLIENTE (RECEPTOR) */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-cyan-600" />
              <span>Datos del Cliente / Receptor</span>
            </h3>

            <button
              type="button"
              onClick={() => setIsCustomersModalOpen(true)}
              className="text-xs font-bold text-cyan-700 hover:text-cyan-900 underline flex items-center space-x-1 print:hidden cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Cargar del Catálogo de Clientes</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-0.5">
                Nombre Completo o Razón Social:
              </label>
              <input
                type="text"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                placeholder="Nombre o Razón Social del cliente..."
                className="w-full font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-0.5">
                RFC / ID Fiscal:
              </label>
              <input
                type="text"
                value={rfcCliente}
                onChange={(e) => setRfcCliente(e.target.value)}
                placeholder="RFC del cliente (opcional)"
                className="w-full font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-0.5">
                Domicilio Exacto de Entrega:
              </label>
              <input
                type="text"
                value={domicilioCliente}
                onChange={(e) => setDomicilioCliente(e.target.value)}
                placeholder="Dirección completa donde se entregará la mercancía..."
                className="w-full font-medium text-slate-800 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-0.5">
                Teléfono / Correo Contacto:
              </label>
              <input
                type="text"
                value={telefonoCliente}
                onChange={(e) => setTelefonoCliente(e.target.value)}
                placeholder="Teléfono o correo..."
                className="w-full font-medium text-slate-800 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* 3. CONDICIONES Y FORMA DE PAGO */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-cyan-600" />
              <span>Condiciones y Forma de Pago</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Forma de Pago */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-0.5">
                Forma de Pago:
              </label>
              <select
                value={formaPago}
                onChange={(e) => setFormaPago(e.target.value)}
                className="w-full font-extrabold text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia bancaria">Transferencia bancaria</option>
                <option value="Pago con tarjeta de débito">Pago con tarjeta de débito</option>
                <option value="Pago con tarjeta de crédito">Pago con tarjeta de crédito</option>
              </select>
            </div>

            {/* Condición de Pago */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-0.5">
                Condición de Pago:
              </label>
              <select
                value={condicionPago}
                onChange={(e) => setCondicionPago(e.target.value as 'Contado' | 'Crédito')}
                className="w-full font-extrabold text-slate-900 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="Contado">Contado</option>
                <option value="Crédito">Crédito</option>
              </select>
            </div>

            {/* Fecha de Pago */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-0.5 flex items-center justify-between">
                <span>Fecha Límete / Compromiso de Pago:</span>
                {condicionPago === 'Crédito' && (
                  <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                    A Crédito
                  </span>
                )}
              </label>
              <input
                type="date"
                disabled={condicionPago !== 'Crédito'}
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className={`w-full font-bold rounded-lg p-2 focus:ring-2 focus:ring-cyan-500 ${
                  condicionPago === 'Crédito'
                    ? 'bg-amber-50 text-amber-950 border-2 border-amber-400 font-black shadow-sm'
                    : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                }`}
              />
            </div>
          </div>
        </div>

        {/* 4. DETALLE DE PRODUCTOS O SERVICIOS (TABLA) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Detalle de Productos Entregados
            </h3>

            {/* Quick Add Buttons */}
            <div className="flex items-center space-x-2 print:hidden">
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(true)}
                className="flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Buscar en Catálogo ({products.length} SKUs)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="flex items-center space-x-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Renglón Vacío</span>
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-extrabold">
                <tr>
                  <th className="p-3 w-16 text-center">Cant.</th>
                  <th className="p-3 w-48">SKU / Selección Producto</th>
                  <th className="p-3">Descripción del Producto</th>
                  <th className="p-3 w-28">Medida / UM</th>
                  <th className="p-3 w-28">Peso / Gramaje</th>
                  <th className="p-3 w-28 text-right">P. Unitario ($)</th>
                  <th className="p-3 w-28 text-right">Importe ($)</th>
                  <th className="p-3 w-10 print:hidden text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {items.map((item) => {
                  const currentPeso = item.peso || extractPeso(item.descripcion);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      
                      {/* Cantidad */}
                      <td className="p-2 text-center font-bold">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.cantidad}
                          onChange={(e) => handleUpdateItem(item.id, 'cantidad', parseFloat(e.target.value) || 0)}
                          className="w-12 text-center p-1.5 font-bold border border-slate-300 rounded-md bg-slate-50 focus:bg-white"
                        />
                      </td>

                      {/* SKU / Product Options Selector */}
                      <td className="p-2 font-mono font-bold">
                        <select
                          value={item.sku}
                          onChange={(e) => handleUpdateItem(item.id, 'sku', e.target.value)}
                          className="w-full p-1.5 uppercase font-mono font-extrabold text-cyan-900 border border-slate-300 rounded-md bg-slate-50 focus:bg-white cursor-pointer text-xs"
                        >
                          <option value="">-- Seleccionar SKU ({products.length} opciones) --</option>
                          {products.map(p => {
                            const pPeso = p.peso || extractPeso(p.descripcion);
                            return (
                              <option key={p.id || p.sku} value={p.sku}>
                                [{p.sku}] {p.descripcion.substring(0, 30)}... | {p.medida} | {pPeso} | ${getPrecioConIva(p).toFixed(2)} (IVA incl.)
                              </option>
                            );
                          })}
                        </select>
                        <input
                          type="text"
                          value={item.sku}
                          onChange={(e) => handleUpdateItem(item.id, 'sku', e.target.value)}
                          placeholder="Código SKU manual..."
                          className="w-full mt-1 p-1 uppercase text-[10px] font-mono text-slate-700 border border-slate-200 rounded bg-white focus:ring-1 focus:ring-cyan-500"
                        />
                      </td>

                      {/* Descripción */}
                      <td className="p-2 font-medium">
                        <input
                          type="text"
                          value={item.descripcion}
                          onChange={(e) => handleUpdateItem(item.id, 'descripcion', e.target.value)}
                          placeholder="Descripción del artículo..."
                          className="w-full p-1.5 font-semibold text-slate-900 border border-slate-300 rounded-md bg-slate-50 focus:bg-white"
                        />
                      </td>

                      {/* Medida / Unidad */}
                      <td className="p-2 text-slate-600">
                        <input
                          type="text"
                          value={item.medida ? `${item.medida} (${item.unidad || 'PZA'})` : item.unidad || ''}
                          onChange={(e) => handleUpdateItem(item.id, 'medida', e.target.value)}
                          placeholder="Medida..."
                          className="w-full p-1.5 text-slate-700 font-medium border border-slate-300 rounded-md bg-slate-50 focus:bg-white"
                        />
                      </td>

                      {/* Peso / Gramaje */}
                      <td className="p-2 text-slate-700">
                        <input
                          type="text"
                          value={currentPeso}
                          onChange={(e) => handleUpdateItem(item.id, 'peso', e.target.value)}
                          placeholder="Gramaje / Peso..."
                          className="w-full p-1.5 text-amber-900 font-bold border border-slate-300 rounded-md bg-amber-50/50 focus:bg-white"
                        />
                      </td>

                      {/* Precio Unitario Editable & Flexible Category Selector */}
                      <td className="p-2 text-right">
                        <div className="space-y-1">
                          <select
                            onChange={(e) => {
                              const cat = e.target.value;
                              if (!cat) return;
                              const matchedProd = products.find(p => p.sku.toUpperCase() === item.sku.toUpperCase());
                              let newPrice = item.precioUnitario;
                              if (matchedProd) {
                                const base = matchedProd.precio || 0;
                                const pIva = matchedProd.precioIva || (base * 1.16);
                                const costo = matchedProd.costo || (base * 0.7);
                                switch (cat) {
                                  case 'Precio': newPrice = base; break;
                                  case 'Precio más IVA': newPrice = pIva; break;
                                  case 'Precio descuento': newPrice = Math.round(pIva * 0.9 * 100) / 100; break;
                                  case '1.14': newPrice = Math.round(base * 1.14 * 100) / 100; break;
                                  case '1.16': newPrice = Math.round(base * 1.16 * 100) / 100; break;
                                  case '1.2798': newPrice = Math.round(base * 1.2798 * 100) / 100; break;
                                  case 'Costo': newPrice = costo; break;
                                }
                              } else {
                                const base = item.precioUnitario;
                                switch (cat) {
                                  case 'Precio descuento': newPrice = Math.round(base * 0.9 * 100) / 100; break;
                                  case '1.14': newPrice = Math.round(base * 1.14 * 100) / 100; break;
                                  case '1.16': newPrice = Math.round(base * 1.16 * 100) / 100; break;
                                  case '1.2798': newPrice = Math.round(base * 1.2798 * 100) / 100; break;
                                }
                              }
                              handleUpdateItem(item.id, 'precioUnitario', newPrice);
                            }}
                            className="w-full text-[10px] p-1 font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded cursor-pointer print:hidden"
                          >
                            <option value="">-- Categoría de Precio --</option>
                            <option value="Precio">Precio</option>
                            <option value="Precio más IVA">Precio más IVA</option>
                            <option value="Precio descuento">Precio descuento (-10%)</option>
                            <option value="1.14">Factor 1.14</option>
                            <option value="1.16">Factor 1.16</option>
                            <option value="1.2798">Factor 1.2798</option>
                            <option value="Costo">Costo</option>
                          </select>

                          <div className="relative inline-block w-full">
                            <span className="absolute left-2 top-2 text-slate-400 font-bold">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.precioUnitario}
                              onChange={(e) => handleUpdateItem(item.id, 'precioUnitario', parseFloat(e.target.value) || 0)}
                              className="w-full pl-5 pr-1 py-1.5 text-right font-extrabold text-slate-900 border border-slate-300 rounded-md bg-slate-50 focus:bg-white"
                            />
                          </div>
                        </div>
                      </td>

                      {/* Importe Total */}
                      <td className="p-3 text-right font-black text-slate-900">
                        ${item.importe.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Delete Action */}
                      <td className="p-2 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Eliminar renglón"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. CIERRE Y TOTALES + OBSERVACIONES + FIRMA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          
          {/* Observaciones y Firma de Recibido */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                Observaciones y Condiciones de Entrega:
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                className="w-full p-2.5 text-xs text-slate-700 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Signature Box */}
            <div className="border border-slate-300 rounded-2xl p-3 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span>Nombre y Firma de Recibido (Cliente)</span>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-cyan-700 hover:text-cyan-900 underline text-[10px] print:hidden cursor-pointer"
                >
                  Limpiar Firma
                </button>
              </div>

              <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl overflow-hidden relative">
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={90}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-20 cursor-crosshair touch-none"
                />
                {!hasSignature && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-xs font-bold pointer-events-none">
                    Firme aquí con el mouse o dedo
                  </div>
                )}
              </div>
              <div className="text-[10px] text-slate-500 text-center font-medium">
                Al firmar, el receptor acepta haber recibido la mercancía a entera satisfacción.
              </div>
            </div>
          </div>

          {/* Totales & Desglose */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-lg border border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                <span className="text-slate-400 font-semibold">
                  {aplicaIva ? 'Subtotal (Base sin IVA):' : 'Subtotal:'}
                </span>
                <span className="font-extrabold text-base text-white">
                  ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                <label className="flex items-center space-x-2 cursor-pointer text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={aplicaIva}
                    onChange={(e) => setAplicaIva(e.target.checked)}
                    className="rounded text-cyan-500 focus:ring-cyan-400"
                  />
                  <span>Desglosar IVA (16% Incluido):</span>
                </label>
                <span className="font-bold text-slate-300">
                  ${iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                </span>
              </div>

              {/* Forma y Condición de Pago Summary */}
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                <span className="text-slate-400 font-semibold">Forma de Pago:</span>
                <span className="font-extrabold text-cyan-300">{formaPago}</span>
              </div>

              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                <span className="text-slate-400 font-semibold">Condición:</span>
                <span className={`font-extrabold ${condicionPago === 'Crédito' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {condicionPago} {condicionPago === 'Crédito' && fechaPago ? `(Vence: ${fechaPago})` : ''}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-xs font-bold text-cyan-400 block uppercase tracking-wider">
                    Total a Pagar
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {aplicaIva ? 'Impuestos incluidos' : 'Sin IVA'}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  ${total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-400 text-center italic">
              Este documento no es un comprobante fiscal. Válido para control interno de entrega de mercancía.
            </div>
          </div>

        </div>

      </div>

      {/* CUSTOMERS MODAL */}
      <CustomersModal
        isOpen={isCustomersModalOpen}
        onClose={() => setIsCustomersModalOpen(false)}
        customers={customers}
        onAddCustomer={onAddCustomer}
        onDeleteCustomer={onDeleteCustomer}
        onSelectCustomer={handleSelectCustomer}
      />

      {/* CATALOG PICKER MODAL */}
      <CatalogPickerModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        products={products}
        onSelectProduct={(prod) => {
          handleAddItem(prod);
        }}
      />

      {/* REMISIONES HISTORY MODAL */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-cyan-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Historial de Remisiones Guardadas</h3>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {remisiones.length} emitidas
                </span>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {remisiones.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No hay remisiones guardadas registradas.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-2.5">Folio</th>
                        <th className="p-2.5">Fecha</th>
                        <th className="p-2.5">Cliente</th>
                        <th className="p-2.5">Vendedor</th>
                        <th className="p-2.5 text-right">Total</th>
                        <th className="p-2.5 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {remisiones.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-cyan-800">{r.folio}</td>
                          <td className="p-2.5 text-slate-600">{r.fecha}</td>
                          <td className="p-2.5 text-slate-900 font-medium">{r.cliente?.razonSocial || 'Cliente General'}</td>
                          <td className="p-2.5 text-slate-600">{r.vendedorNombre || 'General'}</td>
                          <td className="p-2.5 text-right font-black text-emerald-700">
                            ${(r.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-center">
                            {onDeleteRemision && (
                              <button
                                onClick={async () => {
                                  if (confirm(`¿Confirma eliminar la remisión ${r.folio}?`)) {
                                    await onDeleteRemision(r.id);
                                  }
                                }}
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar remisión"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
