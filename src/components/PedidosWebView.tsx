import React, { useState, useRef, useEffect } from 'react';
import { 
  Globe, 
  Plus, 
  Search, 
  ExternalLink, 
  Upload, 
  Trash2, 
  Check, 
  Filter, 
  FileSpreadsheet, 
  Download,
  ShoppingBag,
  Truck,
  RefreshCw,
  Key,
  Settings,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PedidoWeb } from '../types';

interface PedidosWebViewProps {
  pedidos: PedidoWeb[];
  onAddPedido: (pedido: Omit<PedidoWeb, 'id'>) => Promise<void>;
  onUpdatePedido: (id: string, updates: Partial<PedidoWeb>) => Promise<void>;
  onDeletePedido: (id: string) => Promise<void>;
}

export const PedidosWebView: React.FC<PedidosWebViewProps> = ({
  pedidos,
  onAddPedido,
  onUpdatePedido,
  onDeletePedido
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDIENTES' | 'COMPLETADOS' | 'CANCELADOS'>('TODOS');
  const [sortOrder, setSortOrder] = useState<'NUM_DESC' | 'DATE_DESC'>('NUM_DESC');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);

  // WooCommerce API Credentials State
  const [storeUrl, setStoreUrl] = useState('https://grupomasdigital.com');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Load saved credentials on mount
  useEffect(() => {
    const savedCk = localStorage.getItem('wc_consumer_key') || '';
    const savedCs = localStorage.getItem('wc_consumer_secret') || '';
    const savedUrl = localStorage.getItem('wc_store_url') || 'https://grupomasdigital.com';
    if (savedCk) setConsumerKey(savedCk);
    if (savedCs) setConsumerSecret(savedCs);
    if (savedUrl) setStoreUrl(savedUrl);
  }, []);

  // Form State
  const [numPedido, setNumPedido] = useState('');
  const [fechaPedido, setFechaPedido] = useState(new Date().toISOString().split('T')[0]);
  const [sku, setSku] = useState('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [direccionEnvio, setDireccionEnvio] = useState('');
  const [facturado, setFacturado] = useState<boolean>(false);
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPedidos = pedidos
    .filter(p => {
      const matchesSearch = 
        p.numPedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.direccionEnvio.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === 'CANCELADOS') return matchesSearch && !!p.cancelado;
      if (statusFilter === 'COMPLETADOS') return matchesSearch && p.completado && !p.cancelado;
      if (statusFilter === 'PENDIENTES') return matchesSearch && !p.completado && !p.cancelado;
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortOrder === 'NUM_DESC') {
        const numA = parseInt(a.numPedido.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.numPedido.replace(/\D/g, '') || '0', 10);
        if (numA !== numB && !isNaN(numA) && !isNaN(numB) && numA > 0 && numB > 0) {
          return numB - numA;
        }
        return b.numPedido.localeCompare(a.numPedido, undefined, { numeric: true });
      }
      const dateA = new Date(a.fechaPedido || a.createdAt || 0).getTime();
      const dateB = new Date(b.fechaPedido || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

  const handleOpenModal = () => {
    setNumPedido(`WEB-${Date.now().toString().slice(-5)}`);
    setFechaPedido(new Date().toISOString().split('T')[0]);
    setSku('');
    setCantidad(1);
    setDireccionEnvio('');
    setFacturado(false);
    setNotas('');
    setIsModalOpen(true);
  };

  const handleSaveApiSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('wc_consumer_key', consumerKey.trim());
    localStorage.setItem('wc_consumer_secret', consumerSecret.trim());
    localStorage.setItem('wc_store_url', storeUrl.trim());
    setIsApiSettingsOpen(false);
    setSyncStatus({
      message: 'Credenciales de WooCommerce API guardadas correctamente. ¡Listo para sincronizar!',
      type: 'success'
    });
  };

  // Synchronize orders directly via WooCommerce REST API /wp-json/wc/v3/orders
  const handleSyncWooCommerce = async () => {
    const ck = consumerKey.trim() || localStorage.getItem('wc_consumer_key') || '';
    const cs = consumerSecret.trim() || localStorage.getItem('wc_consumer_secret') || '';
    const baseUrl = (storeUrl.trim() || localStorage.getItem('wc_store_url') || 'https://grupomasdigital.com').replace(/\/$/, '');

    if (!ck || !cs) {
      setIsApiSettingsOpen(true);
      setSyncStatus({
        message: 'Por favor, ingrese el Consumer Key y Consumer Secret de la API REST de WooCommerce para iniciar.',
        type: 'info'
      });
      return;
    }

    setIsSyncing(true);
    setSyncStatus({ message: 'Conectando con la API de WooCommerce (grupomasdigital.com)...', type: 'info' });

    try {
      const endpoint = `${baseUrl}/wp-json/wc/v3/orders?consumer_key=${encodeURIComponent(ck)}&consumer_secret=${encodeURIComponent(cs)}&per_page=30&order=desc`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error en respuesta WooCommerce API (${response.status} ${response.statusText})`);
      }

      const orders = await response.json();

      if (!Array.isArray(orders)) {
        throw new Error('La respuesta de WooCommerce no devolvió un listado de pedidos válido.');
      }

      let importedCount = 0;
      const existingNums = new Set(pedidos.map(p => p.numPedido.toUpperCase()));

      for (const order of orders) {
        const orderNum = `#${order.number || order.id}`;
        
        if (existingNums.has(orderNum.toUpperCase())) continue;

        // Line Items SKU and Quantity
        const lineItems = order.line_items || [];
        const skusText = lineItems.map((item: any) => `${item.sku || 'N/A'}: ${item.name}`).join(' | ') || 'PRODUCTO-WEB';
        const totalQty = lineItems.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0) || 1;

        // Shipping / Billing Address
        const shipping = order.shipping || {};
        const billing = order.billing || {};
        const addressName = `${shipping.first_name || billing.first_name || ''} ${shipping.last_name || billing.last_name || ''}`.trim() || 'Cliente Web';
        const addressLine = `${shipping.address_1 || billing.address_1 || ''} ${shipping.address_2 || billing.address_2 || ''}`.trim();
        const cityState = `${shipping.city || billing.city || ''}, ${shipping.state || billing.state || ''} CP ${shipping.postcode || billing.postcode || ''}`.trim();
        const phone = shipping.phone || billing.phone || '';

        const fullAddress = `${addressName} - ${addressLine}, ${cityState} ${phone ? `(Tel: ${phone})` : ''}`.trim();
        const orderDate = order.date_created ? order.date_created.split('T')[0] : new Date().toISOString().split('T')[0];

        await onAddPedido({
          numPedido: orderNum,
          fechaPedido: orderDate,
          sku: skusText,
          cantidad: totalQty,
          direccionEnvio: fullAddress,
          recibido: true,
          pedidoKronaline: false,
          guiaGenerada: false,
          completado: order.status === 'completed',
          notas: `Estatus WC: ${order.status?.toUpperCase() || 'PROCESSING'} | Total: $${order.total || '0'}`,
          createdAt: new Date().toISOString()
        });

        importedCount++;
      }

      setSyncStatus({
        message: `✨ Sincronización exitosa con WooCommerce: Se procesaron ${orders.length} pedidos y se agregaron ${importedCount} pedidos nuevos.`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('WooCommerce API Error:', err);

      // Handle CORS or network failure by providing clear assistance
      setSyncStatus({
        message: `Error de conexión API: ${err.message || 'No se pudo conectar con la API de WooCommerce'}. Si encuentra restricciones de CORS en el servidor, asegúrese de habilitar los encabezados Access-Control-Allow-Origin en WordPress o usar importación Excel.`,
        type: 'error'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numPedido || !sku || !direccionEnvio) return;

    setIsSubmitting(true);
    try {
      await onAddPedido({
        numPedido,
        fechaPedido,
        sku,
        cantidad,
        direccionEnvio,
        recibido: true,
        pedidoKronaline: false,
        guiaGenerada: false,
        completado: false,
        facturado,
        notas: notas || undefined,
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Import Excel/CSV file from WooCommerce export
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        let count = 0;
        for (const row of data) {
          const numP = row['Número de pedido'] || row['Order Number'] || row['Pedido'] || row['ID'] || `WEB-${Math.floor(Math.random() * 10000)}`;
          const skuVal = row['SKU'] || row['Código'] || row['Producto'] || 'SKU-GENERAL';
          const qtyVal = parseInt(row['Cantidad'] || row['Qty'] || '1') || 1;
          const addressVal = row['Dirección'] || row['Shipping Address'] || row['Dirección de envío'] || 'Dirección de envío web';
          const fechaVal = row['Fecha'] || new Date().toISOString().split('T')[0];

          await onAddPedido({
            numPedido: String(numP).startsWith('#') ? String(numP) : `#${numP}`,
            fechaPedido: String(fechaVal),
            sku: String(skuVal),
            cantidad: qtyVal,
            direccionEnvio: String(addressVal),
            recibido: true,
            pedidoKronaline: false,
            guiaGenerada: false,
            completado: false,
            createdAt: new Date().toISOString()
          });
          count++;
        }
        setSyncStatus({
          message: `Se importaron ${count} pedidos web correctamente desde el archivo.`,
          type: 'success'
        });
      } catch (err) {
        console.error(err);
        setSyncStatus({
          message: 'Error al procesar el archivo Excel/CSV de pedidos web.',
          type: 'error'
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner with WooCommerce Integration Controls */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
            <Globe className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-white">Pedidos Web (WooCommerce)</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white">
                API REST Activa
              </span>
            </div>
            <p className="text-slate-300 text-xs mt-0.5">
              Integración directa vía API de WooCommerce (<code className="text-blue-300">grupomasdigital.com</code>). Sincronización automática de órdenes, direcciones e ítems.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sincronizar API WooCommerce */}
          <button
            onClick={handleSyncWooCommerce}
            disabled={isSyncing}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar API WooCommerce'}</span>
          </button>

          {/* Configurar API */}
          <button
            onClick={() => setIsApiSettingsOpen(true)}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3 py-2.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Configurar credenciales Consumer Key / Secret"
          >
            <Settings className="w-4 h-4 text-blue-400" />
            <span>Credenciales API</span>
          </button>

          <a
            href="https://grupomasdigital.com/wp-admin/edit.php?post_type=shop_order"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-3 py-2.5 rounded-xl shadow-md transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span>WordPress Orders</span>
          </a>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3 py-2.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Importar CSV</span>
          </button>

          <button
            onClick={handleOpenModal}
            className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Pedido</span>
          </button>
        </div>
      </div>

      {/* Sync Status Alert */}
      {syncStatus && (
        <div className={`p-4 rounded-2xl text-xs font-bold border flex items-start justify-between ${
          syncStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800' :
          syncStatus.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-800' :
          'bg-blue-500/10 border-blue-500/30 text-blue-800'
        }`}>
          <div className="flex items-start space-x-2">
            {syncStatus.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />}
            {syncStatus.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />}
            {syncStatus.type === 'info' && <Wifi className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5 animate-pulse" />}
            <span>{syncStatus.message}</span>
          </div>
          <button onClick={() => setSyncStatus(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por # pedido, SKU o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase px-2 font-black">Orden:</span>
            <button
              onClick={() => setSortOrder(sortOrder === 'NUM_DESC' ? 'DATE_DESC' : 'NUM_DESC')}
              className="px-2.5 py-1 bg-white text-slate-900 rounded-lg shadow-xs font-black flex items-center space-x-1 cursor-pointer"
              title="Cambiar orden de clasificación"
            >
              <span>{sortOrder === 'NUM_DESC' ? '# Pedido (Mayor a menor)' : 'Fecha (Más reciente)'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Estatus:</span>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setStatusFilter('TODOS')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'TODOS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Todos ({pedidos.length})
              </button>
              <button
                onClick={() => setStatusFilter('PENDIENTES')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'PENDIENTES' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setStatusFilter('COMPLETADOS')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'COMPLETADOS' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Completados
              </button>
              <button
                onClick={() => setStatusFilter('CANCELADOS')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'CANCELADOS' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Cancelados
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table of Web Orders */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4"># Pedido</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">SKU / Producto</th>
                <th className="py-3 px-4 text-center">Cantidad</th>
                <th className="py-3 px-4">Dirección de Envío</th>
                <th className="py-3 px-4 text-center">Recibido</th>
                <th className="py-3 px-4 text-center">Pedido Kronaline</th>
                <th className="py-3 px-4 text-center">Guía</th>
                <th className="py-3 px-4 text-center bg-purple-950 text-purple-300">Facturado</th>
                <th className="py-3 px-4 text-center">Completado</th>
                <th className="py-3 px-4 text-center bg-red-950 text-red-300">Cancelado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPedidos.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-slate-400">
                    No hay pedidos web registrados en este filtro. Haga clic en "Sincronizar API WooCommerce", importe desde CSV o agregue un pedido.
                  </td>
                </tr>
              ) : (
                filteredPedidos.map((pedido) => (
                  <tr key={pedido.id} className={`hover:bg-slate-50 transition-colors ${pedido.cancelado ? 'bg-red-50/40 opacity-75' : pedido.completado ? 'bg-emerald-50/20' : ''}`}>
                    <td className="py-3 px-4 font-black text-slate-900">
                      <span className={pedido.cancelado ? 'line-through text-slate-400' : ''}>{pedido.numPedido}</span>
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-semibold">
                      {pedido.fechaPedido}
                    </td>

                    <td className="py-3 px-4 font-extrabold text-blue-700 max-w-xs">
                      <span className="line-clamp-2">{pedido.sku}</span>
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {pedido.cantidad}
                    </td>

                    <td className="py-3 px-4 text-slate-700 max-w-xs">
                      <p className="line-clamp-2">{pedido.direccionEnvio}</p>
                      {pedido.notas && <p className="text-[10px] text-slate-400 italic mt-0.5">{pedido.notas}</p>}
                    </td>

                    {/* Recibido */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onUpdatePedido(pedido.id, { recibido: !pedido.recibido })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          pedido.recibido
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        {pedido.recibido ? '✓ Recibido' : 'Pendiente'}
                      </button>
                    </td>

                    {/* Pedido Kronaline */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onUpdatePedido(pedido.id, { pedidoKronaline: !pedido.pedidoKronaline })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          pedido.pedidoKronaline
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        {pedido.pedidoKronaline ? '✓ Solicitado' : 'Sin Solicitar'}
                      </button>
                    </td>

                    {/* Guía */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onUpdatePedido(pedido.id, { guiaGenerada: !pedido.guiaGenerada })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          pedido.guiaGenerada
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}
                      >
                        {pedido.guiaGenerada ? '✓ Generada' : 'Pendiente'}
                      </button>
                    </td>

                    {/* Facturado */}
                    <td className="py-3 px-4 text-center bg-purple-50/50">
                      <button
                        onClick={() => onUpdatePedido(pedido.id, { facturado: !pedido.facturado })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          pedido.facturado
                            ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-400'
                            : 'bg-white border border-slate-300 text-slate-500 hover:border-purple-400'
                        }`}
                      >
                        {pedido.facturado ? '✓ Facturado' : 'Sin Facturar'}
                      </button>
                    </td>

                    {/* Completado */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onUpdatePedido(pedido.id, { completado: !pedido.completado })}
                        disabled={pedido.cancelado}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-40 ${
                          pedido.completado
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {pedido.completado ? '✓ Completado' : 'En Proceso'}
                      </button>
                    </td>

                    {/* Cancelado */}
                    <td className="py-3 px-4 text-center bg-red-50/50">
                      <button
                        onClick={() => onUpdatePedido(pedido.id, { cancelado: !pedido.cancelado })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          pedido.cancelado
                            ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-400'
                            : 'bg-white border border-slate-300 text-slate-500 hover:border-red-400'
                        }`}
                      >
                        {pedido.cancelado ? '✕ CANCELADO' : 'Activo'}
                      </button>
                    </td>

                    {/* Delete Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Está seguro de eliminar el pedido ${pedido.numPedido}?`)) {
                            onDeletePedido(pedido.id);
                          }
                        }}
                        title="Eliminar pedido web"
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal API Credentials Settings */}
      {isApiSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-base">
                <Key className="w-5 h-5 text-blue-600" />
                <span>Configurar WooCommerce API REST</span>
              </div>
              <button onClick={() => setIsApiSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Obtenga sus credenciales en su panel de WordPress: <br />
              <strong className="text-slate-900">WooCommerce → Ajustes → Avanzado → API REST → Añadir clave</strong> (Permisos: Lectura).
            </p>

            <form onSubmit={handleSaveApiSettings} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">URL de la Tienda WordPress *</label>
                <input
                  type="url"
                  required
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Consumer Key (ck_...) *</label>
                <input
                  type="text"
                  required
                  placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Consumer Secret (cs_...) *</label>
                <input
                  type="password"
                  required
                  placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsApiSettingsOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Guardar Credenciales
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Pedido Web */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-base">
                <Globe className="w-5 h-5 text-blue-600" />
                <span>Nuevo Pedido Web</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Número de Pedido *</label>
                  <input
                    type="text"
                    required
                    value={numPedido}
                    onChange={(e) => setNumPedido(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-slate-50 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fecha de Pedido *</label>
                  <input
                    type="date"
                    required
                    value={fechaPedido}
                    onChange={(e) => setFechaPedido(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">SKU / Producto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Código SKU del producto"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-black text-center text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Dirección de Envío Completa *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Calle, número, colonia, código postal, ciudad, estado y teléfono..."
                  value={direccionEnvio}
                  onChange={(e) => setDireccionEnvio(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Notas / Observaciones</label>
                <input
                  type="text"
                  placeholder="Notas de paquetería o cliente..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-1 border-t border-slate-100">
                <label className="flex items-center space-x-2 text-purple-800 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={facturado}
                    onChange={(e) => setFacturado(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                  />
                  <span>Facturado</span>
                </label>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : 'Crear Pedido Web'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
