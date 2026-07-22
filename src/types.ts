export interface Product {
  id: string; // Firestore doc ID or SKU
  sku: string; // Código (SKU)
  descripcion: string;
  medida: string;
  unidad: string;
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

export type ActiveTab = 'dashboard' | 'inventory' | 'entradas' | 'salidas' | 'pedidos' | 'reportes';
