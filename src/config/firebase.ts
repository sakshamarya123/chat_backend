
import "dotenv/config";

import {
  initializeApp,
  cert,
  getApps
} from "firebase-admin/app";

import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Firebase credentials are missing");
}

const firebaseApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n")
        })
      })
    : getApps()[0];

export const firestore = getFirestore(firebaseApp);
