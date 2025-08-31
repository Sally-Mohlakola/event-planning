// firebase.js
import { initializeApp, credential as _credential, firestore } from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json"; // download from Firebase console

initializeApp({
  credential: _credential.cert(serviceAccount)
});

const db = firestore();

export default db;
