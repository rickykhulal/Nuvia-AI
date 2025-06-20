
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  type Auth,
  type UserCredential,
  createUserWithEmailAndPassword as fbCreateUserWithEmailAndPassword,
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  updateProfile as fbUpdateProfile,
  onAuthStateChanged as fbOnAuthStateChanged,
  signOut as fbSignOut,
  sendPasswordResetEmail as fbSendPasswordResetEmail
} from "firebase/auth";
import {
  getFirestore,
  type Firestore,
  serverTimestamp as fbServerTimestamp,
  doc as fbDoc,
  setDoc as fbSetDoc,
  collection as fbCollection,
  addDoc as fbAddDoc,
  updateDoc as fbUpdateDoc,
  getDocs as fbGetDocs,
  query as fbQuery,
  orderBy as fbOrderBy,
  where as fbWhere,
  Timestamp as fbTimestamp
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL as getStorageDownloadURL,
  deleteObject as deleteFirebaseObject,
  type FirebaseStorage
} from "firebase/storage";
import { getAnalytics, type Analytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getFunctions, type Functions } from "firebase/functions";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDIMIEqlhf-iHdEaTEB7coEWcPGxSm0whw",
  authDomain: "nuvia-af3b7.firebaseapp.com",
  projectId: "nuvia-af3b7",
  storageBucket: "nuvia-af3b7.appspot.com",
  messagingSenderId: "409850921297",
  appId: "1:409850921297:web:fe8e99b3ff3515975b9370",
  measurementId: "G-JPMH9ZNZB6"
};

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage; // Added for Firebase Storage
let analyticsInstance: Analytics | null = null;
let functionsInstance: Functions;
let firebaseInitializedCorrectly = false;

console.log("[firebase.ts] Attempting to initialize Firebase with hardcoded configuration...");

try {
  if (!getApps().length) {
    console.log("[firebase.ts] Initializing new Firebase app...");
    app = initializeApp(firebaseConfig);
  } else {
    console.log("[firebase.ts] Getting existing Firebase app...");
    app = getApp();
  }

  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app); // Initialize Firebase Storage
  functionsInstance = getFunctions(app);

  if (typeof window !== "undefined") {
    isAnalyticsSupported().then(supported => {
      if (supported) {
        analyticsInstance = getAnalytics(app);
        console.log("[firebase.ts] Firebase Analytics initialized.");
      } else {
        console.log("[firebase.ts] Firebase Analytics is not supported in this environment.");
      }
    }).catch(err => {
      console.error("[firebase.ts] Error checking Analytics support or initializing Analytics:", err);
    });
  } else {
    console.log("[firebase.ts] Firebase Analytics not initialized (server-side or non-browser).");
  }

  firebaseInitializedCorrectly = true;
  console.log("[firebase.ts] Firebase initialized successfully using hardcoded config.");

} catch (error: any) {
  console.error("CRITICAL_FIREBASE_INIT_ERROR: Firebase failed to initialize even with hardcoded config. Error:", error.message, error);

  const initFailedError = (methodName: string) => ({
    code: 'auth/initialization-failed',
    message: `Firebase core services failed to initialize. ${methodName} cannot be called. Check Firebase console settings and config.`
  });
  // @ts-ignore
  app = globalThis._firebaseAppInstance || (globalThis._firebaseAppInstance = { name: "[Initialization Failed]", options: {}, automaticDataCollectionEnabled: false });
  authInstance = {
      // @ts-ignore
      onAuthStateChanged: (callback: (user: any) => void) => { setTimeout(() => callback(null), 0); return () => {}; },
      signInWithEmailAndPassword: () => Promise.reject(initFailedError('signInWithEmailAndPassword')),
      createUserWithEmailAndPassword: () => Promise.reject(initFailedError('createUserWithEmailAndPassword')),
      signOut: () => Promise.reject(initFailedError('signOut')),
      updateProfile: () => Promise.reject(initFailedError('updateProfile')),
      sendPasswordResetEmail: () => Promise.reject(initFailedError('sendPasswordResetEmail')),
      currentUser: null,
  } as unknown as Auth;
  // @ts-ignore
  dbInstance = {
      doc: () => { throw initFailedError('doc'); },
      collection: () => { throw initFailedError('collection'); },
  } as unknown as Firestore;
  // @ts-ignore
  storageInstance = {
      ref: () => { throw initFailedError('storageRef'); },
      uploadBytesResumable: () => { throw initFailedError('uploadBytesResumable'); },
      getDownloadURL: () => { throw initFailedError('getStorageDownloadURL'); },
  } as unknown as FirebaseStorage;
  analyticsInstance = null;
  // @ts-ignore
  functionsInstance = { httpsCallable: () => { throw initFailedError('httpsCallable'); } } as unknown as Functions;
  firebaseInitializedCorrectly = false;
}

export {
  app,
  authInstance as auth,
  dbInstance as db,
  storageInstance as storage, // Export initialized Storage instance
  analyticsInstance as analytics,
  functionsInstance as functions,
  firebaseInitializedCorrectly,

  fbCreateUserWithEmailAndPassword as createUserWithEmailAndPassword,
  fbSignInWithEmailAndPassword as signInWithEmailAndPassword,
  fbUpdateProfile as updateProfile,
  fbOnAuthStateChanged as onAuthStateChanged,
  fbSignOut as signOut,
  fbSendPasswordResetEmail as sendPasswordResetEmail,
  type UserCredential,

  fbServerTimestamp as serverTimestamp,
  fbDoc as doc,
  fbSetDoc as setDoc,
  fbCollection as collection,
  fbAddDoc as addDoc, // Added addDoc to exports
  fbUpdateDoc as updateDoc, // Added updateDoc to exports
  fbGetDocs as getDocs,
  fbQuery as query,
  fbOrderBy as orderBy,
  fbWhere as where, // Added where to exports
  fbTimestamp as Timestamp,

  // Storage exports
  storageRef,
  uploadBytesResumable,
  getStorageDownloadURL,
  deleteFirebaseObject
};
