import React, { useState } from 'react';
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
  UserCheck 
} from 'lucide-react';
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
  
  // New Customer Form State
  const [razonSocial, setRazonSocial] = useState('');
  const [rfcOrId, setRfcOrId] = useState('');
  const [domicilioEntrega, setDomicilioEntrega] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [contactoNombre, setContactoNombre] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredCustomers = customers.filter(c => 
    c.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefono.includes(searchTerm) ||
    (c.rfcOrId && c.rfcOrId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Catálogo de Clientes</h3>
              <p className="text-xs text-slate-400">Administra los datos de los receptores para Notas de Remisión.</p>
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

            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="flex items-center justify-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{isFormOpen ? 'Ocultar Formulario' : 'Dar de Alta Cliente'}</span>
            </button>
          </div>

          {/* New Customer Form */}
          {isFormOpen && (
            <form onSubmit={handleSubmitNewCustomer} className="bg-cyan-50/50 border border-cyan-200 rounded-2xl p-5 space-y-4">
              <h4 className="font-extrabold text-sm text-cyan-950 flex items-center space-x-2 border-b border-cyan-200/80 pb-2">
                <UserCheck className="w-4 h-4 text-cyan-600" />
                <span>Registro de Nuevo Cliente</span>
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
