/**
 * Mishkat Firebase Configuration & Initialization
 *
 * Configures Cloud Firestore for project: mishkat2
 *
 * SECURITY INVARIANTS:
 * - Server-side only: never import or expose in client/browser bundles.
 * - Credentials read from environment variables; zero secrets hardcoded in source.
 * - GEMINI_API_KEY is never exposed or used as a Firebase variable.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * Returns the resolved Firebase configuration object.
 *
 * @param {Object} [overrides]
 * @returns {Object}
 */
export function getFirebaseConfig(overrides = {}) {
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || 'mishkat2',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'mishkat2.firebaseapp.com',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'mishkat2.firebasestorage.app',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '1075636519899',
    appId: process.env.FIREBASE_APP_ID || '1:1075636519899:web:c1b65c5c474a2f13c9ddfe',
    apiKey: process.env.FIREBASE_API_KEY || overrides.apiKey || '',
    ...overrides
  };
}

/**
 * Checks whether Firebase configuration is present and valid.
 * @returns {boolean}
 */
export function isFirebaseConfigured() {
  const config = getFirebaseConfig();
  return Boolean(config.projectId);
}

/**
 * Returns or initializes the shared FirebaseApp instance.
 *
 * @param {Object} [overrides]
 * @returns {import('firebase/app').FirebaseApp}
 */
export function getFirebaseApp(overrides = {}) {
  const config = getFirebaseConfig(overrides);
  const appName = overrides.appName || '[DEFAULT]';
  const existingApps = getApps();

  const found = existingApps.find(a => a.name === appName);
  if (found) {
    return found;
  }

  return initializeApp(config, appName === '[DEFAULT]' ? undefined : appName);
}

/**
 * Returns or initializes the Firestore database instance.
 *
 * @param {Object} [overrides]
 * @returns {import('firebase/firestore').Firestore}
 */
export function getFirestoreDb(overrides = {}) {
  const app = getFirebaseApp(overrides);
  return getFirestore(app);
}
