/**
 * Firebase Admin Configuration
 * 
 * Initializes Firebase Admin SDK for Firestore access.
 * Uses environment variables for credentials.
 * 
 * @module utils/firebase
 */

import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from environment variables
 */
const initializeFirebase = (): void => {
    if (admin.apps.length === 0) {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });

        console.log("✅ Firebase Admin initialized successfully");
    }
};

initializeFirebase();

/**
 * Firestore database instance
 * @constant
 */
export const db = admin.firestore();

/**
 * Firestore collections
 * @constant
 */
export const COLLECTIONS = {
    MEETINGS: "meetings",
    USERS: "users",
} as const;
