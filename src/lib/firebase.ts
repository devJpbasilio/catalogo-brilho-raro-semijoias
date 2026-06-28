/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app;
let db;
let firebaseEnabled = false;

try {
  if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // Support custom firestore databaseId if defined
    if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
      db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);
    } else {
      db = getFirestore(app);
    }
    firebaseEnabled = true;
    console.log('Firebase initialized successfully.');
  } else {
    console.warn('Firebase configuration missing or incomplete. Running in Local Storage fallback mode.');
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

export { app, db, firebaseEnabled };
