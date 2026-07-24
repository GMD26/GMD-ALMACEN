import React, { useState } from 'react';
import { Layers, Lock, Unlock, Plus, Search, Filter, AlertCircle, CheckCircle2, UserCheck, Package, ShoppingBag } from 'lucide-react';
import { Product, Apartado, VendedorNombre } from '../types';

interface ExistenciasDisponiblesViewProps {
  products: Product[];
  apartados: Apartado[];
  onAddApartado: (apartado: Omit<Apartado, 'id' | 'createdAt' | 'estado'>) => Promise<void>;
  onLiberarApartado: (id: string) => Promise<void>;
  onCompletarApartado?: (id: string) => Promise<void>;
}

export const ExistenciasDisponiblesView: React.FC<ExistenciasDisponiblesViewProps> = ({
  products,
  apartados,
  onAddApartado,
  onLiberarApartado,
  onCompletarApartado
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [cantidadSeparar, setCantidadSeparar] = useState<number>(1);
  const [nombreVendedor, setNombreVendedor] = useState<VendedorNombre>('Manuel');
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activeApartados = apartados.filter(a => a.estado === 'ACTIVO');

  // Compute total apartados map per SKU
  const apartadosBySku = new Map<string, number>();
  activeApartados.forEach(a => {
    const key = a.sku.toUpperCase();
    const current = apartadosBySku.get(key) || 0;
    apartadosBySku.set(key, current + a.cantidadApartada);
  });

  // Calculate Net Available Stock for each product
  const productsWithNetStock = products.map(p => {
    const totalApartado = apartadosBySku.get(p.sku.toUpperCase()) || 0;
    const disponibleNeto = Math.max(0, p.cantidadActual - totalApartado);
    return {
      ...p,
      totalApartado,
      disponibleNeto
    };
  });

  const filteredProducts = productsWithNetStock.filter(p =>
    p.disponibleNeto > 0 &&
    (p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredApartados = activeApartados.filter(a => {
    const matchesVendor = vendorFilter === 'ALL' || a.nombre === vendorFilter;
    const matchesSearch = a.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesVendor && matchesSearch;
  });

  const handleOpenModal = (sku?: string) => {
    setErrorMsg(null);
    if (sku) {
      setSelectedSku(sku);
    } else if (products.length > 0) {
      setSelectedSku(products[0].sku);
    }
    setCantidadSeparar(1);
    setNombreVendedor('Manuel');
    setNotas('');
    setIsModalOpen(true);
  };

  const selectedProduct = productsWithNetStock.find(p => p.sku === selectedSku);

  const handleSubmitApartado = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedProduct) {
      setErrorMsg('Seleccione un producto válido.');
      return;
    }

    if (cantidadSeparar <= 0) {
      setErrorMsg('La cantidad a separar debe ser mayor a 0.');
      return;
    }

    if (cantidadSeparar > selectedProduct.disponibleNeto) {
      setErrorMsg(`No hay suficiente inventario disponible. Disponible actual: ${selectedProduct.disponibleNeto} ${selectedProduct.unidad}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddApartado({
        productId: selectedProduct.id,
        sku: selectedProduct.sku,
        descripcion: selectedProduct.descripcion,
        medida: selectedProduct.medida,
        cantidadApartada: cantidadSeparar,
        nombre: nombreVendedor,
        fecha: new Date().toISOString(),
        notas
      });

      setSuccessMsg(`¡Mercancía congelada/apartada para ${nombreVendedor} (${cantidadSeparar} ${selectedProduct.unidad})!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error al registrar el apartado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white">Existencias Disponibles (Inventario Neto)</h1>
            <p className="text-cyan-200 text-xs mt-0.5">
              Refleja el stock real neto descontando la mercancía congelada en apartado para evitar doble asignación.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Lock className="w-4 h-4" />
          <span>Apartar / Separar Mercancía</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl flex items-center space-x-3 text-emerald-800 text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por SKU o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold text-slate-600">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filtrar Apartados por:</span>
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
          >
            <option value="ALL">Todos los Responsables</option>
            <option value="Manuel">Manuel</option>
            <option value="Luis">Luis</option>
            <option value="César">César</option>
            <option value="Mercado Libre">Mercado Libre</option>
            <option value="Mostrador">Mostrador</option>
          </select>
        </div>
      </div>

      {/* Net Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
            <Package className="w-4 h-4 text-cyan-600" />
            <span>Tabla de Inventario Neto y Congelado</span>
          </h2>
          <span className="text-xs text-slate-500 font-semibold">{filteredProducts.length} productos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Descripción del Producto</th>
                <th className="py-3 px-4">Medida / UM</th>
                <th className="py-3 px-4 text-center">Stock Físico Total</th>
                <th className="py-3 px-4 text-center">Mercancía Apartada</th>
                <th className="py-3 px-4 text-center bg-cyan-950 text-cyan-300">Inventario Neto Disponible</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No se encontraron productos en el inventario.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const hasApartado = p.totalApartado > 0;
                  return (
                    <tr key={p.id || p.sku} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.sku}</td>
                      <td className="py-3 px-4 text-slate-700 max-w-[280px]">{p.descripcion}</td>
                      <td className="py-3 px-4 text-slate-500">{p.medida} / {p.unidad}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800 text-sm">
                        {p.cantidadActual}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {hasApartado ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-100 text-amber-800 font-black rounded-lg text-xs">
                            <Lock className="w-3 h-3 text-amber-600" />
                            <span>{p.totalApartado}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center bg-cyan-50/60 font-black text-sm text-cyan-900">
                        <span className={`px-2.5 py-1 rounded-lg ${p.disponibleNeto === 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {p.disponibleNeto} {p.unidad}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenModal(p.sku)}
                          disabled={p.disponibleNeto === 0}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 font-bold text-[11px] rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          Separar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Apartados Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-amber-600" />
            <h2 className="font-bold text-slate-900 text-sm">Registro de Apartados Activos ({filteredApartados.length})</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">SKU</th>
                <th className="py-2.5 px-3">Descripción</th>
                <th className="py-2.5 px-3 text-center">Cantidad Separada</th>
                <th className="py-2.5 px-3">Nombre (Asignado A)</th>
                <th className="py-2.5 px-3">Notas</th>
                <th className="py-2.5 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredApartados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No hay apartados activos en este momento.
                  </td>
                </tr>
              ) : (
                filteredApartados.map((a) => (
                  <tr key={a.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {new Date(a.fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{a.sku}</td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-[200px] truncate">{a.descripcion}</td>
                    <td className="py-2.5 px-3 text-center font-extrabold text-amber-700 text-sm">
                      {a.cantidadApartada}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[11px]">
                        {a.nombre}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[150px] truncate">{a.notas || '-'}</td>
                    <td className="py-2.5 px-3 text-center space-x-2">
                      <button
                        onClick={() => onCompletarApartado ? onCompletarApartado(a.id) : onLiberarApartado(a.id)}
                        title="Marcar como Entregado / Despachado"
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Despachar
                      </button>
                      <button
                        onClick={() => onLiberarApartado(a.id)}
                        title="Liberar apartado (devuelve a inventario disponible)"
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Liberar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Separar Mercancía */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-base">
                <Lock className="w-5 h-5 text-amber-600" />
                <span>Separar Mercancía de Inventario</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-800 text-xs font-bold rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitApartado} className="space-y-3.5 text-xs">
              {/* Product Selector */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Producto / SKU *</label>
                <select
                  required
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs bg-slate-50 focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="" disabled>Seleccione producto...</option>
                  {productsWithNetStock.map((p) => (
                    <option key={p.id || p.sku} value={p.sku}>
                      [{p.sku}] - {p.descripcion.substring(0, 32)} (Disp: {p.disponibleNeto})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Stock Físico: {selectedProduct.cantidadActual}</span>
                    <span className="text-emerald-700">Disponible Neto: {selectedProduct.disponibleNeto}</span>
                  </div>
                </div>
              )}

              {/* Cantidad a separar */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Cantidad a separar *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedProduct ? selectedProduct.disponibleNeto : 1000}
                  value={cantidadSeparar}
                  onChange={(e) => setCantidadSeparar(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Esta cantidad se congelará inmediatamente del disponible para evitar duplicados.
                </p>
              </div>

              {/* Selector Nombre (Sin texto libre: Manuel, Luis, César, Mercado Libre, Mostrador) */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nombre (Responsable / Canal) *</label>
                <select
                  required
                  value={nombreVendedor}
                  onChange={(e) => setNombreVendedor(e.target.value as VendedorNombre)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs bg-slate-50 focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="Manuel">Manuel</option>
                  <option value="Luis">Luis</option>
                  <option value="César">César</option>
                  <option value="Mercado Libre">Mercado Libre</option>
                  <option value="Mostrador">Mostrador</option>
                </select>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">Notas u Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Ej. Apartado para entrega el viernes..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedProduct || selectedProduct.disponibleNeto === 0}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-400 font-bold rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : 'Confirmar Apartado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
