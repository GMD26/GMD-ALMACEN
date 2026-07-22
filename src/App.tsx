import React, { useState, useEffect } from 'react';
import { 
  db, 
  auth, 
  signInWithGoogle, 
  logoutUser, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  writeBatch,
  getDocs,
  handleFirestoreError,
  OperationType
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Product, InventoryMovement, PurchaseOrder, UserProfile, ActiveTab } from './types';
import { INITIAL_PRODUCTS } from './data/initialCatalog';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { InventoryList } from './components/InventoryList';
import { StockInView } from './components/StockInView';
import { StockOutView } from './components/StockOutView';
import { LowStockOrders } from './components/LowStockOrders';
import { ReportsView } from './components/ReportsView';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Quick Action Selected Product
  const [quickProductForIn, setQuickProductForIn] = useState<Product | null>(null);
  const [quickProductForOut, setQuickProductForOut] = useState<Product | null>(null);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setUserProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email || 'Mas.Digital1@gmail.com',
          displayName: firebaseUser.displayName || 'Mas Digital',
          photoURL: firebaseUser.photoURL || undefined,
          role: 'admin',
          lastLogin: new Date().toISOString()
        });
      } else {
        setUser(null);
        // Default guest user profile for immediate seamless usage
        setUserProfile({
          uid: 'guest-gmd',
          email: 'Mas.Digital1@gmail.com',
          displayName: 'Grupo Más Digital Almacén',
          role: 'almacenista',
          lastLogin: new Date().toISOString()
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore Listeners
  useEffect(() => {
    // Products Listener
    const productsRef = collection(db, 'products');
    const unsubProducts = onSnapshot(productsRef, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Product);
      });

      // Sort alphabetically by SKU
      items.sort((a, b) => a.sku.localeCompare(b.sku));
      setProducts(items);

      // Auto Seed if Firestore is completely empty!
      if (items.length === 0 && !isSeeding) {
        seedDatabaseInternal();
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'products');
      // Fallback to local catalog if Firestore connection experiences latency
      setProducts(INITIAL_PRODUCTS);
    });

    // Movements Listener
    const movementsRef = collection(db, 'inventory_movements');
    const movementsQuery = query(movementsRef, orderBy('timestamp', 'desc'), limit(150));
    const unsubMovements = onSnapshot(movementsQuery, (snapshot) => {
      const movs: InventoryMovement[] = [];
      snapshot.forEach((doc) => {
        movs.push({ id: doc.id, ...doc.data() } as InventoryMovement);
      });
      setMovements(movs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'inventory_movements'));

    // Purchase Orders Listener
    const ordersRef = collection(db, 'purchase_orders');
    const ordersQuery = query(ordersRef, orderBy('fecha', 'desc'), limit(50));
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      const orders: PurchaseOrder[] = [];
      snapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() } as PurchaseOrder);
      });
      setPurchaseOrders(orders);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'purchase_orders'));

    return () => {
      unsubProducts();
      unsubMovements();
      unsubOrders();
    };
  }, []);

  // Seed Catalog Function
  const seedDatabaseInternal = async () => {
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      INITIAL_PRODUCTS.forEach((prod) => {
        const docRef = doc(db, 'products', prod.sku);
        batch.set(docRef, prod);
      });
      await batch.commit();
      console.log("Database seeded successfully with official Grupo Más Digital catalog!");
    } catch (err) {
      console.error("Error seeding catalog:", err);
      setProducts(INITIAL_PRODUCTS);
    } finally {
      setIsSeeding(false);
    }
  };

  // Auth Handlers
  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleGuestLogin = (email: string) => {
    setUserProfile({
      uid: 'custom-gmail-' + Date.now(),
      email: email,
      displayName: email.split('@')[0],
      role: 'almacenista',
      lastLogin: new Date().toISOString()
    });
  };

  const handleLogout = async () => {
    await logoutUser();
    setUserProfile({
      uid: 'guest-gmd',
      email: 'Mas.Digital1@gmail.com',
      displayName: 'Grupo Más Digital Almacén',
      role: 'almacenista',
      lastLogin: new Date().toISOString()
    });
  };

  // Inventory CRUD Handlers
  const handleAddProduct = async (productData: Omit<Product, 'id'>) => {
    const docRef = doc(db, 'products', productData.sku);
    await setDoc(docRef, { ...productData, id: productData.sku });
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, updates);
  };

  // Stock IN (Entrada)
  const handleRecordStockIn = async (
    product: Product,
    quantity: number,
    reference: string,
    location: string,
    notes: string,
    cost?: number
  ) => {
    const prevStock = product.cantidadActual;
    const newStock = prevStock + quantity;
    const now = new Date();

    // 1. Update Product Stock in Firestore
    const prodRef = doc(db, 'products', product.id);
    await updateDoc(prodRef, {
      cantidadActual: newStock,
      ubicacionAlmacen: location || product.ubicacionAlmacen,
      costo: cost && cost > 0 ? cost : product.costo,
      updatedAt: now.toISOString(),
      updatedBy: userProfile?.displayName || userProfile?.email || 'Usuario'
    });

    // 2. Create Movement Log Doc
    const movementRef = collection(db, 'inventory_movements');
    await addDoc(movementRef, {
      productId: product.id,
      sku: product.sku,
      descripcion: product.descripcion,
      tipo: 'ENTRADA',
      cantidad: quantity,
      stockAnterior: prevStock,
      stockNuevo: newStock,
      referencia: reference,
      ubicacion: location || product.ubicacionAlmacen,
      usuarioEmail: userProfile?.email || 'Mas.Digital1@gmail.com',
      usuarioNombre: userProfile?.displayName || 'Grupo Más Digital',
      costoOPrecioUnitario: cost || product.costo,
      notas: notes,
      fecha: now.toISOString(),
      timestamp: now.getTime()
    });
  };

  // Stock OUT (Salida)
  const handleRecordStockOut = async (
    product: Product,
    quantity: number,
    reference: string,
    notes: string
  ) => {
    const prevStock = product.cantidadActual;
    if (quantity > prevStock) {
      throw new Error("No hay suficiente stock para realizar esta salida.");
    }

    const newStock = prevStock - quantity;
    const now = new Date();

    // 1. Update Product Stock in Firestore
    const prodRef = doc(db, 'products', product.id);
    await updateDoc(prodRef, {
      cantidadActual: newStock,
      updatedAt: now.toISOString(),
      updatedBy: userProfile?.displayName || userProfile?.email || 'Usuario'
    });

    // 2. Create Movement Log Doc
    const movementRef = collection(db, 'inventory_movements');
    await addDoc(movementRef, {
      productId: product.id,
      sku: product.sku,
      descripcion: product.descripcion,
      tipo: 'SALIDA',
      cantidad: quantity,
      stockAnterior: prevStock,
      stockNuevo: newStock,
      referencia: reference,
      ubicacion: product.ubicacionAlmacen,
      usuarioEmail: userProfile?.email || 'Mas.Digital1@gmail.com',
      usuarioNombre: userProfile?.displayName || 'Grupo Más Digital',
      costoOPrecioUnitario: product.precio,
      notas: notes,
      fecha: now.toISOString(),
      timestamp: now.getTime()
    });
  };

  // Create Purchase Order
  const handleCreatePurchaseOrder = async (order: Omit<PurchaseOrder, 'id'>) => {
    const ordersRef = collection(db, 'purchase_orders');
    await addDoc(ordersRef, order);
  };

  // Receive Purchase Order (Batch Add Stock)
  const handleReceivePurchaseOrder = async (order: PurchaseOrder) => {
    const batch = writeBatch(db);
    const now = new Date();

    // Mark order as RECIBIDO
    const orderDocRef = doc(db, 'purchase_orders', order.id);
    batch.update(orderDocRef, { estado: 'RECIBIDO' });

    // Update each product stock
    for (const item of order.items) {
      const p = products.find(prod => prod.sku === item.sku);
      if (p) {
        const prevStock = p.cantidadActual;
        const newStock = prevStock + item.cantidadPedida;

        const prodRef = doc(db, 'products', p.id);
        batch.update(prodRef, {
          cantidadActual: newStock,
          updatedAt: now.toISOString()
        });

        // Add movement
        const movRef = doc(collection(db, 'inventory_movements'));
        batch.set(movRef, {
          productId: p.id,
          sku: p.sku,
          descripcion: p.descripcion,
          tipo: 'ENTRADA',
          cantidad: item.cantidadPedida,
          stockAnterior: prevStock,
          stockNuevo: newStock,
          referencia: `Recepción Orden ${order.folio}`,
          ubicacion: p.ubicacionAlmacen,
          usuarioEmail: userProfile?.email || 'Mas.Digital1@gmail.com',
          usuarioNombre: userProfile?.displayName || 'Grupo Más Digital',
          costoOPrecioUnitario: item.costoEstimado,
          notas: `Recepción completa de pedido de material.`,
          fecha: now.toISOString(),
          timestamp: now.getTime()
        });
      }
    }

    await batch.commit();
  };

  // Quick action navigation helpers
  const handleQuickStockIn = (product: Product) => {
    setQuickProductForIn(product);
    setActiveTab('entradas');
  };

  const handleQuickStockOut = (product: Product) => {
    setQuickProductForOut(product);
    setActiveTab('salidas');
  };

  const lowStockCount = products.filter(p => p.cantidadActual <= p.minStock).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-white">
      
      {/* Top Corporate Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        userProfile={userProfile}
        onLogin={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        lowStockCount={lowStockCount}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {activeTab === 'dashboard' && (
          <Dashboard
            products={products}
            movements={movements}
            setActiveTab={setActiveTab}
            onOpenStockIn={() => setActiveTab('entradas')}
            onOpenStockOut={() => setActiveTab('salidas')}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryList
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onSeedDatabase={seedDatabaseInternal}
            onOpenQuickStockIn={handleQuickStockIn}
            onOpenQuickStockOut={handleQuickStockOut}
            isSeeding={isSeeding}
          />
        )}

        {activeTab === 'entradas' && (
          <StockInView
            products={products}
            initialProduct={quickProductForIn}
            onRecordStockIn={handleRecordStockIn}
            movements={movements}
          />
        )}

        {activeTab === 'salidas' && (
          <StockOutView
            products={products}
            initialProduct={quickProductForOut}
            onRecordStockOut={handleRecordStockOut}
            movements={movements}
          />
        )}

        {activeTab === 'pedidos' && (
          <LowStockOrders
            products={products}
            purchaseOrders={purchaseOrders}
            user={user}
            userProfile={userProfile}
            onCreatePurchaseOrder={handleCreatePurchaseOrder}
            onReceivePurchaseOrder={handleReceivePurchaseOrder}
          />
        )}

        {activeTab === 'reportes' && (
          <ReportsView
            products={products}
            movements={movements}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-white">Grupo Más Digital</span>
            <span>— Control Interno de Inventario y Almacén</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-500">
            <span>Base de Datos Centralizada Firestore</span>
            <span>•</span>
            <a href="https://grupomasdigital.com/" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 underline">
              grupomasdigital.com
            </a>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginWithGoogle={handleGoogleLogin}
        onGuestLogin={handleGuestLogin}
      />

    </div>
  );
}
