export interface Product {
  id: string; // Firestore doc ID or SKU
  sku: string; // Código (SKU)
  descripcion: string;
  medida: string;
  unidad: string;
  peso?: string; // Peso / Gramaje (e.g., 240 g/m²)
  precio: number;
  precioIva: number;
  costo: number;
  cantidadActual: number;
  ubicacionAlmacen: string;
  minStock: number;
  categoria: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type MovementType = 'ENTRADA' | 'SALIDA';

export interface InventoryMovement {
  id: string;
  productId: string;
  sku: string;
  descripcion: string;
  tipo: MovementType;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  referencia: string; // Order #, Customer, Supplier, or Job name
  ubicacion: string;
  usuarioEmail: string;
  usuarioNombre: string;
  costoOPrecioUnitario: number;
  notas?: string;
  fecha: string; // ISO string or format
  timestamp: number;
}

export interface PurchaseOrderItem {
  sku: string;
  descripcion: string;
  medida: string;
  unidad: string;
  cantidadActual: number;
  minStock: number;
  cantidadSugerida: number;
  cantidadPedida: number;
  costoEstimado: number;
}

export interface PurchaseOrder {
  id: string;
  folio: string;
  fecha: string;
  solicitante: string;
  solicitanteEmail: string;
  estado: 'PENDIENTE' | 'SOLICITADO' | 'RECIBIDO' | 'CANCELADO';
  items: PurchaseOrderItem[];
  totalEstimado: number;
  proveedor?: string;
  notas?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'almacenista' | 'operador';
  lastLogin: string;
}

export interface Customer {
  id: string;
  razonSocial: string;
  rfcOrId?: string;
  domicilioEntrega: string;
  telefono: string;
  email: string;
  contactoNombre?: string;
  createdAt?: string;
}

export interface RemisionItem {
  id: string;
  sku: string;
  descripcion: string;
  medida: string;
  unidad: string;
  peso?: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
}

export interface Remision {
  id: string;
  folio: string;
  fecha: string;
  cliente: Customer;
  items: RemisionItem[];
  subtotal: number;
  aplicaIva: boolean;
  iva: number;
  total: number;
  observaciones: string;
  vendedorNombre: string;
  vendedorContacto?: string;
  formaPago?: string;
  condicionPago?: 'Contado' | 'Crédito';
  fechaPago?: string;
  firmaClienteUrl?: string;
  estado: 'EMITIDA' | 'CANCELADA' | 'ENTREGADA';
  descontoInventario?: boolean;
  createdAt: string;
}

export type ActiveTab = 'portada' | 'dashboard' | 'inventory' | 'entradas' | 'salidas' | 'pedidos' | 'reportes' | 'remisiones' | 'clientes';
