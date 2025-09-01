// index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const multer = require('multer');

admin.initializeApp();

const db = admin.firestore();
const bucket = admin.storage().bucket();

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',

    'https://witty-stone-03009b61e.1.azurestaticapps.net'
  ]
}));
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// Auth middleware
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'No token provided' });

  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Invalid token' });
  }
}


app.post('/vendor/apply', authenticate, async (req, res) => {
  try {
    const { businessName, phone, email, description, category, address, profilePic } = req.body;
    let profilePicURL = '';

    if (profilePic) {
      const buffer = Buffer.from(profilePic, 'base64');
      const fileRef = bucket.file(`Vendor/${req.uid}/profile.jpg`);
      await fileRef.save(buffer, { contentType: 'image/jpeg' });
      await fileRef.makePublic();
      profilePicURL = `https://storage.googleapis.com/${bucket.name}/${fileRef.name}`;
    }

    await db.collection('Vendor').doc(req.uid).set({
      businessName,
      phone,
      email,
      description,
      category,
      address: address || 'None',
      profilePic: profilePicURL,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: 'Vendor application submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// Get vendor
app.get('/vendor/me', authenticate, async (req, res) => {
  try {
    const doc = await db.collection('Vendor').doc(req.uid).get();
    if (!doc.exists) return res.status(404).json({ message: 'Vendor not found' });
    res.json(doc.data());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/vendor/me', authenticate, async (req, res) => {
  try {
    const { description, address, phone, email, profilePic } = req.body;
    const updateData = { description, address, phone, email };

    
    if (profilePic) {
      const buffer = Buffer.from(profilePic, 'base64');
      const fileRef = bucket.file(`Vendor/${req.uid}/profile.jpg`);
      await fileRef.save(buffer, { contentType: 'image/jpeg' });
      await fileRef.makePublic(); 
      updateData.profilePic = `https://storage.googleapis.com/${bucket.name}/${fileRef.name}`;
    }

    await db.collection('Vendor').doc(req.uid).set(updateData, { merge: true });

    res.status(200).json({ message: 'Profile updated successfully', data: updateData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});
exports.api = functions.https.onRequest(app);
