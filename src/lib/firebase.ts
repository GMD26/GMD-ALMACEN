import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  writeBatch 
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import configData from '../../firebase-applet-config.json';

// Support both firebase-applet-config.json AND VITE_ env variables for Netlify/GitHub deployments
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || configData?.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || configData?.authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || configData?.projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || configData?.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || configData?.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || configData?.appId || '',
};

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || (configData as Record<string, any>)?.firestoreDatabaseId || undefined;

let app;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (error) {
  console.warn("Firebase initialization warning (using fallback instance):", error);
  // Fallback instance if keys are missing in build environment
  app = getApps().length > 0 ? getApp() : initializeApp({
    apiKey: "AIzaSyDummyKeyForFallbackDeployment",
    authDomain: "gen-lang-client-0441062211.firebaseapp.com",
    projectId: "gen-lang-client-0441062211",
    storageBucket: "gen-lang-client-0441062211.firebasestorage.app",
    messagingSenderId: "400384370097",
    appId: "1:400384370097:web:a1cad17aa484acf1934990"
  });
}

// Initialize Firestore with custom database ID if specified
export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');

let cachedGoogleAccessToken: string | null = null;

export const getCachedGoogleAccessToken = () => cachedGoogleAccessToken;

// Google Sign In helper with access token capture
export const signInWithGoogle = async () => {
  try {
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedGoogleAccessToken = credential.accessToken;
    }
    return result.user;
  } catch (error: any) {
    console.error("Error logging in with Google:", error);
    throw error;
  }
};

/**
 * Uploads a JSON backup directly to Google Drive
 */
export const uploadBackupToGoogleDrive = async (backupDataObj: any, token?: string) => {
  const accessToken = token || cachedGoogleAccessToken;
  if (!accessToken) {
    throw new Error('No hay una sesión activa de Google con permisos de Drive. Por favor inicie sesión con Google primero.');
  }

  const fileName = `Respaldo_BaseDatos_GMD_${new Date().toISOString().split('T')[0]}.json`;
  const fileContent = JSON.stringify(backupDataObj, null, 2);

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: 'Respaldo automático de base de datos de Grupo Más Digital Almacén e Inventario'
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: 'application/json' }));

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: form
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error al subir a Google Drive: ${response.statusText} - ${errText}`);
  }

  return await response.json();
};

/**
 * Lists backup files from user's Google Drive
 */
export const listGoogleDriveBackups = async (token?: string) => {
  const accessToken = token || cachedGoogleAccessToken;
  if (!accessToken) {
    throw new Error('No hay una sesión activa de Google. Inicie sesión con Google.');
  }

  const queryParam = encodeURIComponent("name contains 'Respaldo_BaseDatos_GMD' and mimeType = 'application/json' and trashed = false");
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${queryParam}&fields=files(id,name,createdTime,size,webViewLink)&orderBy=createdTime desc`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Error al consultar archivos en Google Drive.');
  }

  const data = await response.json();
  return data.files || [];
};

/**
 * Downloads JSON content from a specific Google Drive file ID
 */
export const fetchGoogleDriveFileContent = async (fileId: string, token?: string) => {
  const accessToken = token || cachedGoogleAccessToken;
  if (!accessToken) {
    throw new Error('No hay una sesión activa de Google. Inicie sesión con Google.');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Error al descargar el contenido del respaldo desde Google Drive.');
  }

  return await response.json();
};

export const logoutUser = async () => {
  return signOut(auth);
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  writeBatch 
};
