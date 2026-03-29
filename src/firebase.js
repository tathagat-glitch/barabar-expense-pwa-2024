import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  getFirestore,
  serverTimestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyAFEm0i-JaakdQt4r3pv4JWDbMqXfcSLvk',
  authDomain: 'barabar-fcbbe.firebaseapp.com',
  projectId: 'barabar-fcbbe',
  storageBucket: 'barabar-fcbbe.firebasestorage.app',
  messagingSenderId: '403598848987',
  appId: '1:403598848987:web:084093b014e6b9f68d2dfe',
  measurementId: 'G-7LZCB54ZSS'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Disable reCAPTCHA for development (remove this in production)
if (window.location.hostname === 'localhost' || window.location.hostname.includes('192.168')) {
  auth.settings.appVerificationDisabledForTesting = true;
}
export const db = getFirestore(app);

export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  serverTimestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  deleteDoc,
  arrayUnion,
  arrayRemove
};

