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

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || configData?.firestoreDatabaseId || undefined;

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

// Google Sign In helper
export const signInWithGoogle = async () => {
  try {
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Error logging in with Google:", error);
    throw error;
  }
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
