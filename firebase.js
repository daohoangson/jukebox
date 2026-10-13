import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getFirestore, connectFirestoreEmulator, doc, collection,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig } from './config.js';

export * from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

// No project configured + running on localhost → use the local Firestore emulator (see README.md).
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
export const usingEmulator = isLocal && !firebaseConfig.projectId;

const app = initializeApp(usingEmulator ? { projectId: 'demo-jukebox', apiKey: 'demo' } : firebaseConfig);
export const db = getFirestore(app);
if (usingEmulator) connectFirestoreEmulator(db, '127.0.0.1', 8080);

// Single global room
export const stateRef = doc(db, 'jukebox', 'state');
export const queueRef = collection(stateRef, 'queue');
export const searchesRef = collection(db, 'searches');
