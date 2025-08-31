import functions from "firebase-functions";
import admin from "firebase-admin";

// If you want to use dotenv locally (not in Firebase deploy)
import dotenv from "dotenv";
dotenv.config();

// Build service account object from env vars
const serviceAccount = {
  type: "service_account",
  project_id: process.env.PROJECT_ID,
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: process.env.PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: ""
};

// Initialize Firebase Admin with service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Example Cloud Function: Get vendor data
export const getVendor = functions.https.onRequest(async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).send("Vendor ID is required");

    const doc = await db.collection("Vendor").doc(id).get();
    if (!doc.exists) return res.status(404).send("Vendor not found");

    res.json(doc.data());
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Example Cloud Function: Update vendor profile
export const updateVendor = functions.https.onRequest(async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).send("Vendor ID is required");

    const { description, address, phone, email } = req.body;
    await db.collection("Vendor").doc(id).set(
      { description, address, phone, email },
      { merge: true }
    );

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});
