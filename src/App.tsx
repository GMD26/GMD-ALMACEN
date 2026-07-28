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
  deleteDoc,
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
import { 
  Product, 
  InventoryMovement, 
  PurchaseOrder, 
  UserProfile, 
  ActiveTab, 
  Customer, 
  Remision,
  Apartado,
  PedidoEspecial,
  PrecioListaItem,
  PedidoMercadoLibre,
  CotizacionPedido,
  PedidoWeb
} from './types';
import { INITIAL_PRODUCTS } from './data/initialCatalog';
import { cleanFirestoreData } from './utils/firestoreSanitizer';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { InventoryList } from './components/InventoryList';
import { StockInView } from './components/StockInView';
import { StockOutView } from './components/StockOutView';
import { LowStockOrders } from './components/LowStockOrders';
import { ReportsView } from './components/ReportsView';
import { AuthModal } from './components/AuthModal';
import { Portada } from './components/Portada';
import { RemisionView } from './components/RemisionView';
import { ExistenciasDisponiblesView } from './components/ExistenciasDisponiblesView';
import { PedidosEspecialesView } from './components/PedidosEspecialesView';
import { ReporteVendedorView } from './components/ReporteVendedorView';
import { ListasPreciosView } from './components/ListasPreciosView';
import { PedidosMercadoLibreView } from './components/PedidosMercadoLibreView';
import { PedidosCotizacionesView } from './components/PedidosCotizacionesView';
import { PedidosWebView } from './components/PedidosWebView';
import { DatabaseManagementModal } from './components/DatabaseManagementModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('portada');
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [remisiones, setRemisiones] = useState<Remision[]>([]);
  const [apartados, setApartados] = useState<Apartado[]>([]);
  const [pedidosEspeciales, setPedidosEspeciales] = useState<PedidoEspecial[]>([]);
  const [listasPrecios, setListasPrecios] = useState<PrecioListaItem[]>([]);
  const [pedidosML, setPedidosML] = useState<PedidoMercadoLibre[]>([]);
  const [pedidosCotizaciones, setPedidosCotizaciones] = useState<CotizacionPedido[]>([]);
  const [pedidosWeb, setPedidosWeb] = useState<PedidoWeb[]>([]);
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
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
      const itemsMap = new Map<string, Product>();
      snapshot.forEach((docSnap) => {
        const prod = { id: docSnap.id, ...docSnap.data() } as Product;
        const key = (prod.sku || docSnap.id).toUpperCase();
        if (!itemsMap.has(key)) {
          itemsMap.set(key, prod);
        } else {
          const existing = itemsMap.get(key)!;
          if (docSnap.id === prod.sku || (prod.updatedAt && (!existing.updatedAt || prod.updatedAt > existing.updatedAt))) {
            itemsMap.set(key, prod);
          }
        }
      });

      const items = Array.from(itemsMap.values());
      items.sort((a, b) => (a.sku || '').localeCompare(b.sku || ''));
      setProducts(items);

      if (items.length === 0 && !isSeeding) {
        seedDatabaseInternal();
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'products');
      setProducts(INITIAL_PRODUCTS);
    });

    // Movements Listener
    const movementsRef = collection(db, 'inventory_movements');
    const movementsQuery = query(movementsRef, orderBy('timestamp', 'desc'), limit(200));
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

    // Customers Listener
    const customersRef = collection(db, 'customers');
    const unsubCustomers = onSnapshot(customersRef, (snapshot) => {
      const custs: Customer[] = [];
      snapshot.forEach((doc) => {
        custs.push({ id: doc.id, ...doc.data() } as Customer);
      });
      setCustomers(custs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'customers'));

    // Remisiones Listener
    const remisionesRef = collection(db, 'remisiones');
    const remisionesQuery = query(remisionesRef, orderBy('createdAt', 'desc'), limit(100));
    const unsubRemisiones = onSnapshot(remisionesQuery, (snapshot) => {
      const rems: Remision[] = [];
      snapshot.forEach((doc) => {
        rems.push({ id: doc.id, ...doc.data() } as Remision);
      });
      setRemisiones(rems);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'remisiones'));

    // Apartados Listener
    const apartadosRef = collection(db, 'apartados');
    const unsubApartados = onSnapshot(apartadosRef, (snapshot) => {
      const list: Apartado[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Apartado);
      });
      setApartados(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'apartados'));

    // Pedidos Especiales Listener
    const pedidosEspRef = collection(db, 'pedidos_especiales');
    const unsubPedidosEsp = onSnapshot(pedidosEspRef, (snapshot) => {
      const itemsMap = new Map<string, PedidoEspecial>();
      snapshot.forEach((docSnap) => {
        itemsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as PedidoEspecial);
      });
      const list = Array.from(itemsMap.values());
      list.sort((a, b) => new Date(b.createdAt || b.fecha || 0).getTime() - new Date(a.createdAt || a.fecha || 0).getTime());
      setPedidosEspeciales(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedidos_especiales'));

    // Listas de Precios Listener
    const listasPreciosRef = collection(db, 'listas_precios');
    const unsubListasPrecios = onSnapshot(listasPreciosRef, (snapshot) => {
      const itemsMap = new Map<string, PrecioListaItem>();
      snapshot.forEach((docSnap) => {
        itemsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as PrecioListaItem);
      });
      setListasPrecios(Array.from(itemsMap.values()));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'listas_precios'));

    // Pedidos Mercado Libre Listener
    const pedidosMLRef = collection(db, 'pedidos_ml');
    const unsubPedidosML = onSnapshot(pedidosMLRef, (snapshot) => {
      const itemsMap = new Map<string, PedidoMercadoLibre>();
      snapshot.forEach((docSnap) => {
        itemsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as PedidoMercadoLibre);
      });
      const list = Array.from(itemsMap.values());
      list.sort((a, b) => new Date(b.createdAt || b.fecha || 0).getTime() - new Date(a.createdAt || a.fecha || 0).getTime());
      setPedidosML(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedidos_ml'));

    // Pedidos Cotizaciones (Mónica y César) Listener
    const cotizacionesRef = collection(db, 'pedidos_cotizaciones');
    const unsubCotizaciones = onSnapshot(cotizacionesRef, (snapshot) => {
      const itemsMap = new Map<string, CotizacionPedido>();
      snapshot.forEach((docSnap) => {
        itemsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as CotizacionPedido);
      });
      const list = Array.from(itemsMap.values());
      list.sort((a, b) => new Date(b.createdAt || b.fecha || 0).getTime() - new Date(a.createdAt || a.fecha || 0).getTime());
      setPedidosCotizaciones(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedidos_cotizaciones'));

    // Pedidos Web Listener
    const webRef = collection(db, 'pedidos_web');
    const unsubWeb = onSnapshot(webRef, (snapshot) => {
      const itemsMap = new Map<string, PedidoWeb>();
      snapshot.forEach((docSnap) => {
        itemsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as PedidoWeb);
      });
      const list = Array.from(itemsMap.values());
      list.sort((a, b) => new Date(b.createdAt || b.fechaPedido || 0).getTime() - new Date(a.createdAt || a.fechaPedido || 0).getTime());
      setPedidosWeb(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedidos_web'));

    return () => {
      unsubProducts();
      unsubMovements();
      unsubOrders();
      unsubCustomers();
      unsubRemisiones();
      unsubApartados();
      unsubPedidosEsp();
      unsubListasPrecios();
      unsubPedidosML();
      unsubCotizaciones();
      unsubWeb();
    };
  }, []);

  // Seed Catalog Function with 0 stock & 0 minStock
  const seedDatabaseInternal = async () => {
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      INITIAL_PRODUCTS.forEach((prod) => {
        const docRef = doc(db, 'products', prod.sku);
        batch.set(docRef, { ...prod, cantidadActual: 0, minStock: 0 });
      });
      await batch.commit();
      console.log("Database seeded successfully with 0 stock and 0 minStock!");
    } catch (err) {
      console.error("Error seeding catalog:", err);
      setProducts(INITIAL_PRODUCTS.map(p => ({ ...p, cantidadActual: 0, minStock: 0 })));
    } finally {
      setIsSeeding(false);
    }
  };

  // Full Database Export Handler
  const handleExportFullDatabaseBackup = () => {
    const backupObj = {
      exportDate: new Date().toISOString(),
      appName: 'Grupo Más Digital - Almacén e Inventario',
      products,
      inventory_movements: movements,
      purchase_orders: purchaseOrders,
      customers,
      remisiones,
      apartados,
      pedidos_especiales: pedidosEspeciales,
      listas_precios: listasPrecios,
      pedidos_ml: pedidosML,
      pedidos_cotizaciones: pedidosCotizaciones,
      pedidos_web: pedidosWeb
    };

    const jsonString = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `Respaldo_BaseDatos_GMD_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Full Database Restore Handler
  const handleRestoreDatabaseBackup = async (backupData: any) => {
    setIsSeeding(true);
    try {
      const collectionsMap: Record<string, any[]> = {
        products: backupData.products || [],
        inventory_movements: backupData.inventory_movements || backupData.movements || [],
        purchase_orders: backupData.purchase_orders || backupData.purchaseOrders || [],
        customers: backupData.customers || [],
        remisiones: backupData.remisiones || [],
        apartados: backupData.apartados || [],
        pedidos_especiales: backupData.pedidos_especiales || backupData.pedidosEspeciales || [],
        listas_precios: backupData.listas_precios || backupData.listasPrecios || [],
        pedidos_ml: backupData.pedidos_ml || backupData.pedidosML || [],
        pedidos_cotizaciones: backupData.pedidos_cotizaciones || backupData.pedidosCotizaciones || [],
        pedidos_web: backupData.pedidos_web || backupData.pedidosWeb || []
      };

      for (const [colName, items] of Object.entries(collectionsMap)) {
        if (!Array.isArray(items) || items.length === 0) continue;

        for (let i = 0; i < items.length; i += 350) {
          const chunk = items.slice(i, i + 350);
          const batch = writeBatch(db);
          chunk.forEach((item: any) => {
            const docId = item.id || item.sku || doc(collection(db, colName)).id;
            const docRef = doc(db, colName, docId);
            batch.set(docRef, cleanFirestoreData(item), { merge: true });
          });
          await batch.commit();
        }
      }

      console.log('Base de datos restaurada correctamente.');
    } catch (err) {
      console.error('Error al restaurar base de datos:', err);
      throw err;
    } finally {
      setIsSeeding(false);
    }
  };

  // Full Database Clear/Delete Handler
  const handleClearAllDatabase = async () => {
    setIsSeeding(true);
    try {
      const collectionsToClear = [
        'products',
        'inventory_movements',
        'purchase_orders',
        'customers',
        'remisiones',
        'apartados',
        'pedidos_especiales',
        'listas_precios',
        'pedidos_ml',
        'pedidos_cotizaciones',
        'pedidos_web'
      ];

      for (const colName of collectionsToClear) {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);
        if (!snapshot.empty) {
          const docs = snapshot.docs;
          for (let i = 0; i < docs.length; i += 350) {
            const chunk = docs.slice(i, i + 350);
            const batch = writeBatch(db);
            chunk.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        }
      }

      setProducts([]);
      setMovements([]);
      setPurchaseOrders([]);
      setCustomers([]);
      setRemisiones([]);
      setApartados([]);
      setPedidosEspeciales([]);
      setListasPrecios([]);
      setPedidosML([]);
      setPedidosCotizaciones([]);
      setPedidosWeb([]);

      console.log('Base de datos eliminada completamente.');
    } catch (err) {
      console.error('Error al eliminar base de datos:', err);
      throw err;
    } finally {
      setIsSeeding(false);
    }
  };

  // Reset all stock and minStock to 0 for manual inventory entry
  const handleResetAllStockToZero = async () => {
    setIsSeeding(true);
    try {
      const now = new Date().toISOString();
      const updatedBy = userProfile?.displayName || 'Usuario';

      if (products.length > 0) {
        // Process in chunks of 350 for Firestore batch safety
        const chunks: Product[][] = [];
        for (let i = 0; i < products.length; i += 350) {
          chunks.push(products.slice(i, i + 350));
        }

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach((prod) => {
            const docRef = doc(db, 'products', prod.id);
            batch.update(docRef, {
              cantidadActual: 0,
              minStock: 0,
              updatedAt: now,
              updatedBy: updatedBy
            });
          });
          await batch.commit();
        }
      } else {
        await seedDatabaseInternal();
      }

      setProducts(prev => prev.map(p => ({ ...p, cantidadActual: 0, minStock: 0, updatedAt: now })));
      console.log("Inventario y stock mínimo reiniciados a 0 exitosamente.");
    } catch (err) {
      console.error("Error al reiniciar inventario a 0:", err);
      // Fallback local update
      setProducts(prev => prev.map(p => ({ ...p, cantidadActual: 0, minStock: 0 })));
    } finally {
      setIsSeeding(false);
    }
  };

  // Bulk Import Products Handler for Excel/CSV (e.g. 613+ productos)
  const handleBulkImportProducts = async (newProducts: Omit<Product, 'id'>[], replaceExisting: boolean) => {
    setIsSeeding(true);
    try {
      const now = new Date().toISOString();
      const user = userProfile?.displayName || 'Importación Masiva';

      // Map to full Product objects with id = sku
      const formattedProducts: Product[] = newProducts.map(p => ({
        ...p,
        id: p.sku,
        updatedAt: now,
        updatedBy: user
      }));

      // Write in batches of 350 to Firestore
      const chunks: Product[][] = [];
      for (let i = 0; i < formattedProducts.length; i += 350) {
        chunks.push(formattedProducts.slice(i, i + 350));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(p => {
          const docRef = doc(db, 'products', p.id);
          batch.set(docRef, p, { merge: true });
        });
        await batch.commit();
      }

      if (replaceExisting) {
        setProducts(formattedProducts);
      } else {
        setProducts(prev => {
          const map = new Map<string, Product>();
          prev.forEach(p => map.set(p.id, p));
          formattedProducts.forEach(p => map.set(p.id, p));
          return Array.from(map.values());
        });
      }

      console.log(`${formattedProducts.length} productos importados con éxito.`);
    } catch (err) {
      console.error("Error en importación masiva:", err);
      throw err;
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

  // Customer & Remision Handlers
  const handleAddCustomer = async (customer: Omit<Customer, 'id'>) => {
    try {
      const custRef = collection(db, 'customers');
      await addDoc(custRef, customer);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'customers');
      throw err;
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      const custRef = doc(db, 'customers', id);
      await deleteDoc(custRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `customers/${id}`);
      throw err;
    }
  };

  const handleDeleteRemision = async (id: string) => {
    try {
      const remRef = doc(db, 'remisiones', id);
      await deleteDoc(remRef);
      setRemisiones(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `remisiones/${id}`);
      throw err;
    }
  };

  const handleSaveRemision = async (remisionData: Omit<Remision, 'id'>, discountStock: boolean) => {
    try {
      const remisionesRef = collection(db, 'remisiones');
      const docRef = await addDoc(remisionesRef, remisionData);

      if (discountStock) {
        const batch = writeBatch(db);
        const now = new Date();

        for (const item of remisionData.items) {
          if (!item.sku) continue;
          const prod = products.find(p => p.sku.toUpperCase() === item.sku.toUpperCase());
          if (prod) {
            const prevStock = prod.cantidadActual;
            const newStock = Math.max(0, prevStock - item.cantidad);

            const prodRef = doc(db, 'products', prod.id);
            batch.update(prodRef, {
              cantidadActual: newStock,
              updatedAt: now.toISOString()
            });

            // Add movement record
            const movRef = doc(collection(db, 'inventory_movements'));
            batch.set(movRef, {
              productId: prod.id,
              sku: prod.sku,
              descripcion: prod.descripcion,
              tipo: 'SALIDA',
              cantidad: item.cantidad,
              stockAnterior: prevStock,
              stockNuevo: newStock,
              referencia: `Remisión ${remisionData.folio} - ${remisionData.cliente.razonSocial}`,
              ubicacion: prod.ubicacionAlmacen || 'ALMACEN CENTRAL',
              usuarioEmail: userProfile?.email || 'Mas.Digital1@gmail.com',
              usuarioNombre: userProfile?.displayName || 'Grupo Más Digital',
              costoOPrecioUnitario: item.precioUnitario,
              notas: `Salida automática por emisión de Nota de Remisión ${remisionData.folio}`,
              fecha: remisionData.fecha,
              timestamp: now.getTime()
            });
          }
        }
        await batch.commit();
      }

      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'remisiones');
      throw err;
    }
  };

  // Delete Movements (Entradas or Salidas selected via checkboxes)
  const handleDeleteMovements = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        const ref = doc(db, 'inventory_movements', id);
        batch.delete(ref);
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'inventory_movements');
      throw err;
    }
  };

  // Reset Movements / Clean History
  const handleResetMovements = async (tipoFilter?: 'ENTRADA' | 'SALIDA' | 'ALL') => {
    try {
      const movsRef = collection(db, 'inventory_movements');
      const snap = await getDocs(movsRef);
      const batch = writeBatch(db);
      
      snap.forEach(d => {
        const data = d.data();
        if (!tipoFilter || tipoFilter === 'ALL' || data.tipo === tipoFilter) {
          batch.delete(d.ref);
        }
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'inventory_movements');
      throw err;
    }
  };

  // Apartados Handlers
  const handleAddApartado = async (apartadoData: Omit<Apartado, 'id' | 'createdAt' | 'estado'>) => {
    try {
      const ref = collection(db, 'apartados');
      await addDoc(ref, {
        ...apartadoData,
        estado: 'ACTIVO',
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'apartados');
      throw err;
    }
  };

  const handleLiberarApartado = async (id: string) => {
    try {
      const ref = doc(db, 'apartados', id);
      await updateDoc(ref, { estado: 'LIBERADO' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `apartados/${id}`);
      throw err;
    }
  };

  // Pedidos Especiales Handlers
  const handleAddPedidoEspecial = async (pedidoData: Omit<PedidoEspecial, 'id' | 'createdAt'>) => {
    try {
      const ref = collection(db, 'pedidos_especiales');
      await addDoc(ref, {
        ...pedidoData,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'pedidos_especiales');
      throw err;
    }
  };

  const handleUpdateEstadoPedidoEspecial = async (id: string, estado: PedidoEspecial['estado']) => {
    try {
      const ref = doc(db, 'pedidos_especiales', id);
      await updateDoc(ref, { estado });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `pedidos_especiales/${id}`);
      throw err;
    }
  };

  const handleDeletePedidoEspecial = async (id: string) => {
    try {
      const ref = doc(db, 'pedidos_especiales', id);
      await deleteDoc(ref);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `pedidos_especiales/${id}`);
      throw err;
    }
  };

  // Listas de Precios Handlers
  const handleAddPrecioItem = async (itemData: Omit<PrecioListaItem, 'id'>) => {
    try {
      const ref = collection(db, 'listas_precios');
      await addDoc(ref, itemData);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'listas_precios');
      throw err;
    }
  };

  const handleUpdatePrecioItem = async (id: string, updates: Partial<PrecioListaItem>) => {
    try {
      const ref = doc(db, 'listas_precios', id);
      await updateDoc(ref, updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `listas_precios/${id}`);
      throw err;
    }
  };

  const handleDeletePrecioItem = async (id: string) => {
    try {
      const ref = doc(db, 'listas_precios', id);
      await deleteDoc(ref);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `listas_precios/${id}`);
      throw err;
    }
  };

  const handleSyncPreciosFromCatalog = async () => {
    try {
      const now = new Date().toISOString();
      const categories = [
        { name: 'Precio', factor: 1 },
        { name: 'Precio más IVA', factor: 1.16 },
        { name: 'Precio descuento', factor: 0.90 },
        { name: '1.14', factor: 1.14 },
        { name: '1.16', factor: 1.16 },
        { name: '1.2798', factor: 1.2798 },
        { name: 'Costo', factor: 0.70 }
      ];

      const allItemsToSet: { docRef: any; data: any }[] = [];

      products.forEach(p => {
        const basePrice = p.precio || 0;
        const sku = p.sku || 'SKU';
        const desc = p.descripcion || '';

        categories.forEach(cat => {
          let calculatedPrice = basePrice * cat.factor;
          if (cat.name === 'Costo' && p.costo) {
            calculatedPrice = p.costo;
          }
          calculatedPrice = Math.round(calculatedPrice * 100) / 100;

          const docRef = doc(collection(db, 'listas_precios'));
          allItemsToSet.push({
            docRef,
            data: {
              categoria: cat.name,
              precio: calculatedPrice,
              descripcion: `[${sku}] ${desc}`,
              updatedAt: now
            }
          });
        });
      });

      // Commit in batches of max 400 operations
      for (let i = 0; i < allItemsToSet.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = allItemsToSet.slice(i, i + 400);
        chunk.forEach(item => batch.set(item.docRef, item.data));
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'listas_precios');
      throw err;
    }
  };

  // Mercado Libre Handlers
  const handleAddPedidoML = async (pedidoData: Omit<PedidoMercadoLibre, 'id' | 'createdAt'>) => {
    try {
      const ref = collection(db, 'pedidos_ml');
      const cleanData = cleanFirestoreData({
        ...pedidoData,
        createdAt: new Date().toISOString()
      });
      await addDoc(ref, cleanData);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'pedidos_ml');
      throw err;
    }
  };

  const handleToggleCampoML = async (id: string, field: 'pedidoAKronaline' | 'entregado' | 'cancelado' | 'facturado', value: boolean) => {
    try {
      const ref = doc(db, 'pedidos_ml', id);
      await updateDoc(ref, { [field]: value });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `pedidos_ml/${id}`);
      throw err;
    }
  };

  const handleDeletePedidoML = async (id: string) => {
    try {
      const ref = doc(db, 'pedidos_ml', id);
      await deleteDoc(ref);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `pedidos_ml/${id}`);
      throw err;
    }
  };

  const handleDescontarAlmacenGMD_ML = async (pedidoML: PedidoMercadoLibre, revertir: boolean = false) => {
    try {
      const now = new Date();
      const batch = writeBatch(db);

      // Find matching product in catalog by SKU or description
      const matchedProd = products.find(p => p.sku && pedidoML.sku && p.sku.trim().toUpperCase() === pedidoML.sku.trim().toUpperCase()) ||
        products.find(p => p.sku && pedidoML.sku && p.sku.trim().toUpperCase().includes(pedidoML.sku.trim().toUpperCase())) ||
        products.find(p => p.descripcion && pedidoML.descripcionProducto && p.descripcion.trim().toUpperCase().includes(pedidoML.descripcionProducto.trim().toUpperCase()));

      if (matchedProd) {
        const currentStock = matchedProd.cantidadActual || 0;
        const newStock = revertir 
          ? currentStock + pedidoML.cantidad 
          : Math.max(0, currentStock - pedidoML.cantidad);

        const prodRef = doc(db, 'products', matchedProd.id);
        batch.update(prodRef, {
          cantidadActual: newStock,
          updatedAt: now.toISOString()
        });

        // Record automatic inventory movement
        const movRef = doc(collection(db, 'inventory_movements'));
        batch.set(movRef, {
          productId: matchedProd.id,
          sku: matchedProd.sku,
          descripcion: matchedProd.descripcion,
          tipo: revertir ? 'ENTRADA' : 'SALIDA',
          cantidad: pedidoML.cantidad,
          stockAnterior: currentStock,
          stockNuevo: newStock,
          referencia: `Salida Almacén GMD - Pedido ML #${pedidoML.numPedidoML} (${pedidoML.clienteML})`,
          ubicacion: matchedProd.ubicacionAlmacen || 'ALMACEN GMD',
          usuarioEmail: userProfile?.email || 'Mas.Digital1@gmail.com',
          usuarioNombre: userProfile?.displayName || 'Grupo Más Digital',
          costoOPrecioUnitario: matchedProd.precio || 0,
          notas: revertir 
            ? `Reversión de Salida Almacén GMD para Pedido Mercado Libre #${pedidoML.numPedidoML}`
            : `Descuento automático por Salida de Almacén GMD - Pedido Mercado Libre #${pedidoML.numPedidoML}`,
          fecha: now.toISOString().split('T')[0],
          timestamp: now.getTime()
        });
      }

      // Update Mercado Libre Order
      const mlRef = doc(db, 'pedidos_ml', pedidoML.id);
      batch.update(mlRef, {
        salidaAlmacenGMD: !revertir,
        fechaSalidaAlmacenGMD: revertir ? null : now.toISOString()
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `pedidos_ml/${pedidoML.id}`);
      throw err;
    }
  };

  // Pedidos Cotizaciones Handlers (Mónica / César)
  const handleAddCotizacion = async (cotizacionData: Omit<CotizacionPedido, 'id'>) => {
    try {
      const ref = collection(db, 'pedidos_cotizaciones');
      const cleanData = cleanFirestoreData(cotizacionData);
      await addDoc(ref, cleanData);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'pedidos_cotizaciones');
      throw err;
    }
  };

  const handleUpdateCotizacion = async (id: string, updates: Partial<CotizacionPedido>) => {
    try {
      const ref = doc(db, 'pedidos_cotizaciones', id);
      const cleanUpdates = cleanFirestoreData(updates);
      await updateDoc(ref, cleanUpdates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `pedidos_cotizaciones/${id}`);
      throw err;
    }
  };

  const handleDeleteCotizacion = async (id: string) => {
    try {
      const ref = doc(db, 'pedidos_cotizaciones', id);
      await deleteDoc(ref);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `pedidos_cotizaciones/${id}`);
      throw err;
    }
  };

  // Pedidos Web Handlers
  const handleAddPedidoWeb = async (webData: Omit<PedidoWeb, 'id'>) => {
    try {
      const ref = collection(db, 'pedidos_web');
      const cleanData = cleanFirestoreData(webData);
      await addDoc(ref, cleanData);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'pedidos_web');
      throw err;
    }
  };

  const handleUpdatePedidoWeb = async (id: string, updates: Partial<PedidoWeb>) => {
    try {
      const ref = doc(db, 'pedidos_web', id);
      const cleanUpdates = cleanFirestoreData(updates);
      await updateDoc(ref, cleanUpdates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `pedidos_web/${id}`);
      throw err;
    }
  };

  const handleDeletePedidoWeb = async (id: string) => {
    try {
      const ref = doc(db, 'pedidos_web', id);
      await deleteDoc(ref);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `pedidos_web/${id}`);
      throw err;
    }
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

  const lowStockCount = products.filter(p => p.minStock > 0 && p.cantidadActual <= p.minStock).length;

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
        onOpenDatabaseManager={() => setIsDatabaseModalOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {activeTab === 'portada' && (
          <Portada
            onOpenInventario={() => setActiveTab('dashboard')}
            onOpenRemision={() => setActiveTab('remisiones')}
            onOpenListasPrecios={() => setActiveTab('listas-precios')}
            onImportListasPrecios={handleSyncPreciosFromCatalog}
            totalProductsCount={products.length}
          />
        )}

        {activeTab === 'remisiones' && (
          <RemisionView
            products={products}
            customers={customers}
            remisiones={remisiones}
            userProfile={userProfile}
            onSaveRemision={handleSaveRemision}
            onDeleteRemision={handleDeleteRemision}
            onAddCustomer={handleAddCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onBackToPortada={() => setActiveTab('portada')}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            products={products}
            movements={movements}
            setActiveTab={setActiveTab}
            onOpenStockIn={() => setActiveTab('entradas')}
            onOpenStockOut={() => setActiveTab('salidas')}
            onOpenQuickStockIn={handleQuickStockIn}
            onOpenQuickStockOut={handleQuickStockOut}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryList
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onBulkImport={handleBulkImportProducts}
            onSeedDatabase={seedDatabaseInternal}
            onResetAllStockToZero={handleResetAllStockToZero}
            onOpenQuickStockIn={handleQuickStockIn}
            onOpenQuickStockOut={handleQuickStockOut}
            isSeeding={isSeeding}
          />
        )}

        {activeTab === 'existencias' && (
          <ExistenciasDisponiblesView
            products={products}
            apartados={apartados}
            onAddApartado={handleAddApartado}
            onLiberarApartado={handleLiberarApartado}
          />
        )}

        {activeTab === 'entradas' && (
          <StockInView
            products={products}
            initialProduct={quickProductForIn}
            onRecordStockIn={handleRecordStockIn}
            movements={movements}
            onDeleteMovements={handleDeleteMovements}
          />
        )}

        {activeTab === 'salidas' && (
          <StockOutView
            products={products}
            initialProduct={quickProductForOut}
            onRecordStockOut={handleRecordStockOut}
            movements={movements}
            onDeleteMovements={handleDeleteMovements}
          />
        )}

        {activeTab === 'pedidos-especiales' && (
          <PedidosEspecialesView
            pedidosEspeciales={pedidosEspeciales}
            products={products}
            onAddPedidoEspecial={handleAddPedidoEspecial}
            onUpdateEstado={handleUpdateEstadoPedidoEspecial}
            onDeletePedidoEspecial={handleDeletePedidoEspecial}
          />
        )}

        {activeTab === 'pedidos-ml' && (
          <PedidosMercadoLibreView
            pedidosML={pedidosML}
            onAddPedidoML={handleAddPedidoML}
            onToggleCampoML={handleToggleCampoML}
            onDeletePedidoML={handleDeletePedidoML}
            onDescontarAlmacenGMD={handleDescontarAlmacenGMD_ML}
          />
        )}

        {activeTab === 'pedidos-monica' && (
          <PedidosCotizacionesView
            responsable="Mónica"
            pedidos={pedidosCotizaciones}
            onAddPedido={handleAddCotizacion}
            onUpdatePedido={handleUpdateCotizacion}
            onDeletePedido={handleDeleteCotizacion}
          />
        )}

        {activeTab === 'pedidos-cesar' && (
          <PedidosCotizacionesView
            responsable="César"
            pedidos={pedidosCotizaciones}
            onAddPedido={handleAddCotizacion}
            onUpdatePedido={handleUpdateCotizacion}
            onDeletePedido={handleDeleteCotizacion}
          />
        )}

        {activeTab === 'pedidos-web' && (
          <PedidosWebView
            pedidos={pedidosWeb}
            onAddPedido={handleAddPedidoWeb}
            onUpdatePedido={handleUpdatePedidoWeb}
            onDeletePedido={handleDeletePedidoWeb}
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

        {activeTab === 'reportes-vendedor' && (
          <ReporteVendedorView
            remisiones={remisiones}
            apartados={apartados}
            pedidosEspeciales={pedidosEspeciales}
            movements={movements}
          />
        )}

        {activeTab === 'listas-precios' && (
          <ListasPreciosView
            listasPrecios={listasPrecios}
            products={products}
            onAddPrecioItem={handleAddPrecioItem}
            onUpdatePrecioItem={handleUpdatePrecioItem}
            onDeletePrecioItem={handleDeletePrecioItem}
            onSyncFromCatalog={handleSyncPreciosFromCatalog}
          />
        )}

        {activeTab === 'reportes' && (
          <ReportsView
            products={products}
            movements={movements}
            onResetMovements={handleResetMovements}
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

      {/* Database Management Modal */}
      <DatabaseManagementModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        onExportBackup={handleExportFullDatabaseBackup}
        onRestoreBackup={handleRestoreDatabaseBackup}
        onClearDatabase={handleClearAllDatabase}
        totalProductsCount={products.length}
        totalOrdersCount={pedidosCotizaciones.length + pedidosML.length + pedidosWeb.length + pedidosEspeciales.length}
      />

    </div>
  );
}
