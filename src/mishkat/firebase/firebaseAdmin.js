/**
 * Mishkat Server-Side Firebase Admin Initialization & Ops Adapter
 *
 * Provides trusted, server-side access to Cloud Firestore using firebase-admin.
 * Bypasses client-side security rules securely without opening direct client access.
 *
 * CREDENTIAL RESOLUTION ORDER (Server-Side Only):
 * 1. FIREBASE_SERVICE_ACCOUNT_KEY (Raw JSON string in env)
 * 2. FIREBASE_SERVICE_ACCOUNT_PATH (Path to JSON key file)
 * 3. GOOGLE_APPLICATION_CREDENTIALS (Standard GCP key path)
 * 4. Local auto-detected service account file in project root (serviceAccountKey.json, etc.)
 * 5. Default application credentials / projectId: 'mishkat2'
 *
 * SECURITY INVARIANTS:
 * - Server-only execution. Never import in client/Vite bundles.
 * - Zero hardcoded secrets in source files.
 * - Credentials files strictly ignored in .gitignore.
 */

import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const DEFAULT_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'mishkat2';

/**
 * Searches for a local service account key file in root directory.
 * @returns {string|null}
 */
function findLocalServiceAccountFile() {
  const root = process.cwd();
  const candidates = [
    'serviceAccountKey.json',
    'service-account.json',
    'firebase-admin.json'
  ];

  for (const name of candidates) {
    const fullPath = path.join(root, name);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  // Also check any file matching firebase-adminsdk*.json
  try {
    const files = fs.readdirSync(root);
    const matched = files.find(f => f.startsWith('firebase-adminsdk') && f.endsWith('.json'));
    if (matched) {
      return path.join(root, matched);
    }
  } catch {
    // Ignore read errors
  }

  return null;
}

/**
 * Resolves credential object or cert for Firebase Admin initialization.
 * @returns {import('firebase-admin/app').Credential|null}
 */
export function resolveAdminCredential() {
  // 1. Inlined JSON string in env
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      return cert(parsed);
    } catch (err) {
      console.warn('[Mishkat Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY env:', err.message);
    }
  }

  // 2. Explicit path in env
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && fs.existsSync(envPath)) {
    try {
      const raw = fs.readFileSync(envPath, 'utf8');
      const parsed = JSON.parse(raw);
      return cert(parsed);
    } catch (err) {
      console.warn('[Mishkat Admin] Failed to load service account from env path:', err.message);
    }
  }

  // 3. Local ignored file
  const localFile = findLocalServiceAccountFile();
  if (localFile) {
    try {
      const raw = fs.readFileSync(localFile, 'utf8');
      const parsed = JSON.parse(raw);
      return cert(parsed);
    } catch (err) {
      console.warn('[Mishkat Admin] Failed to load local service account file:', err.message);
    }
  }

  return null;
}

/**
 * Checks whether valid server-side credentials are detected.
 * @returns {boolean}
 */
export function isAdminCredentialConfigured() {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    findLocalServiceAccountFile()
  );
}

/**
 * Returns or initializes the Firebase Admin App singleton.
 * @param {Object} [overrides]
 * @returns {import('firebase-admin/app').App}
 */
export function getAdminApp(overrides = {}) {
  const appName = overrides.appName || '[DEFAULT]';
  const existingApps = getApps();
  const existing = existingApps.find(a => a.name === appName);
  if (existing) {
    return existing;
  }

  const credential = overrides.credential || resolveAdminCredential();
  const projectId = overrides.projectId || DEFAULT_PROJECT_ID;

  const appOptions = { projectId };
  if (credential) {
    appOptions.credential = credential;
  }

  return initializeApp(appOptions, appName === '[DEFAULT]' ? undefined : appName);
}

/**
 * Returns or initializes the Admin Firestore instance.
 * @param {Object} [overrides]
 * @returns {import('firebase-admin/firestore').Firestore}
 */
export function getAdminFirestoreDb(overrides = {}) {
  const app = getAdminApp(overrides);
  return getFirestore(app);
}

/**
 * Creates a unified Ops adapter for Admin Firestore instance
 * that conforms to the existing storage contract:
 * doc, getDoc, setDoc, getDocs, collection, deleteDoc
 *
 * @param {import('firebase-admin/firestore').Firestore} adminDb
 * @returns {Object}
 */
export function createAdminFirestoreOps(adminDb) {
  return {
    doc(db, ...segments) {
      const targetDb = db || adminDb;
      const docPath = segments.join('/');
      return targetDb.doc(docPath);
    },

    collection(db, ...segments) {
      const targetDb = db || adminDb;
      const colPath = segments.join('/');
      return targetDb.collection(colPath);
    },

    async getDoc(docRef) {
      const snap = await docRef.get();
      return {
        id: snap.id,
        exists: () => (typeof snap.exists === 'function' ? snap.exists() : Boolean(snap.exists)),
        data: () => snap.data()
      };
    },

    async setDoc(docRef, data, options = {}) {
      if (options.merge) {
        return docRef.set(data, { merge: true });
      }
      return docRef.set(data);
    },

    async getDocs(colRef) {
      const snap = await colRef.get();
      const docs = snap.docs.map(d => ({
        id: d.id,
        data: () => d.data()
      }));
      return {
        docs,
        size: docs.length,
        empty: docs.length === 0,
        forEach(fn) {
          docs.forEach(fn);
        }
      };
    },

    async deleteDoc(docRef) {
      return docRef.delete();
    }
  };
}
