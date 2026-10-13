import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getFirestore, connectFirestoreEmulator, doc, collection,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig, firestoreDatabaseId } from './config.js';

export * from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

// On localhost, use the local Firestore emulator so dev never touches the live queue (see README.md).
// Add ?live to the URL to test against the real project instead.
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
const wantsLive = new URLSearchParams(location.search).has('live') && firebaseConfig.projectId;
export const usingEmulator = isLocal && !wantsLive;

const app = initializeApp(usingEmulator ? { projectId: 'demo-jukebox', apiKey: 'demo' } : firebaseConfig);
export const db = usingEmulator ? getFirestore(app) : getFirestore(app, firestoreDatabaseId || '(default)');
if (usingEmulator) connectFirestoreEmulator(db, '127.0.0.1', 8080);

// Single global room
export const stateRef = doc(db, 'jukebox', 'state');
export const queueRef = collection(stateRef, 'queue');
export const searchesRef = collection(db, 'searches');
