import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import multer from "multer"; // for parsing multipart/form-data
import { serviceAccount } from "./serviceAccountKey.js";

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "planit-sdp.appspot.com" // Make sure this is your correct Firebase Storage bucket
});

const db = admin.firestore();
const bucket = admin.storage().bucket();
const app = express();

app.use(cors());
app.use(express.json());

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to authenticate Firebase ID token
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Invalid token" });
  }
}

// POST /api/vendor/apply
app.post("/api/vendor/apply", authenticate, upload.single("profilePic"), async (req, res) => {
  try {
    const { businessName, phone, email, description, category, address } = req.body;
    let profilePicURL = "";

    // Upload profile picture if present
    if (req.file) {
      const fileRef = bucket.file(`Vendor/${req.uid}/profile.jpg`);
      await fileRef.save(req.file.buffer, { contentType: req.file.mimetype });
      // Make the file publicly accessible
      await fileRef.makePublic();
      profilePicURL = `https://storage.googleapis.com/${bucket.name}/${fileRef.name}`;
    }

    // Save vendor document in Firestore
    await db.collection("Vendor").doc(req.uid).set({
      businessName,
      phone,
      email,
      description,
      category,
      address: address || "None",
      profilePic: profilePicURL,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ message: "Vendor application submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET current vendor profile
app.get("/api/vendor/me", authenticate, async (req, res) => {
  try {
    const doc = await db.collection("Vendor").doc(req.uid).get();
    if (!doc.exists) return res.status(404).json({ message: "Vendor not found" });
    res.json(doc.data());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE current vendor profile
app.put("/api/vendor/me", authenticate, upload.single("profilePic"), async (req, res) => {
  try {
    const { description, address, phone, email } = req.body;

    let updateData = { description, address, phone, email };

    // If profile picture is uploaded, save to Firebase Storage
    if (req.file) {
      const fileRef = bucket.file(`Vendor/${req.uid}/profile.jpg`);
      await fileRef.save(req.file.buffer, { contentType: req.file.mimetype });

      updateData.profilePic = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(
        fileRef.name
      )}?alt=media`;
    }

    // Merge update
    await db.collection("Vendor").doc(req.uid).set(updateData, { merge: true });

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
