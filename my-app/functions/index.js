// index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const multer = require('multer');

admin.initializeApp();

const db = admin.firestore();
const bucket = admin.storage().bucket();

//import { doc, setDoc } from 'firebase/firestore';

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',

    'https://witty-stone-03009b61e.1.azurestaticapps.net'
  ],
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

//VENDOR
//=============================================
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


      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: 'Vendor application submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});



// Get the vendor profile
app.get('/vendor/me', authenticate, async (req, res) => {
  try {
    const doc = await db.collection('Vendor').doc(req.uid).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const vendorData = doc.data();

    res.json({
      ...vendorData,
      profilePic: vendorData.profilePic || null // ensure field always exists
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update the vendor's profile
app.put('/vendor/me', authenticate, async (req, res) => {
  try {
    const { description, address, phone, email, profilePic } = req.body;
    let profilePicURL = '';

    if (profilePic) {
      const buffer = Buffer.from(profilePic, 'base64');
      const fileRef = bucket.file(`Vendor/${req.uid}/profile.jpg`);
      await fileRef.save(buffer, { contentType: 'image/jpeg' });
      await fileRef.makePublic();
      profilePicURL = `https://storage.googleapis.com/${bucket.name}/${fileRef.name}`;
    }

    await db.collection('Vendor').doc(req.uid).update({
      description,
      address,
      phone,
      email,
      ...(profilePicURL && { profilePic: profilePicURL }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


//Get the vendor bookings from the Event collection
app.get('/vendor/bookings', authenticate, async (req, res) => {
  try {
    const vendorID = req.uid;
    const eventsSnapshot = await db.collection("Event").get();
    const vendorEvents = [];

    for (const eventDoc of eventsSnapshot.docs) {
      const vendorsRef = db.collection("Event").doc(eventDoc.id).collection("Vendors").doc(vendorID);
      const vendorDoc = await vendorsRef.get();
      if (vendorDoc.exists) {
        const eventData = eventDoc.data();
        vendorEvents.push({
          eventId: eventDoc.id,
          eventName: eventData.name,
          date: eventData.date,
          location: eventData.location,
          vendorServices: vendorDoc.data().vendoringCategoriesNeeded || [], // services map for this vendor
          status: vendorDoc.data().status || "pending",     // optional overall status
        });
      }
    }

    res.json({ vendorID, bookings: vendorEvents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

//==============================================================

app.post('/event/apply', authenticate, async (req, res) => {
  try {
    const {
      name,
      description,
      theme,
      location,
      budget,
      expectedGuestCount,
      duration,
      eventCategory,
      notes,
      specialRequirements = [],
      style = [],
      tasks = [],
      vendoringCategoriesNeeded = [],
      files = null,
      schedules = null,
      services = null,
      date,
      plannerId
    } = req.body;

    const newEvent = {
      name,
      description,
      theme,
      location,
      budget: Number(budget),
      expectedGuestCount: Number(expectedGuestCount),
      duration: Number(duration),
      eventCategory,
      notes,
      specialRequirements,
      style,
      tasks,
      vendoringCategoriesNeeded,
      files,
      schedules,
      services,
      date: date ? new Date(date) : null,
      status: "planning",
      plannerId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("Event").add(newEvent);

    res.status(200).json({ message: "Event created successfully", id: docRef.id, event: newEvent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.get('/planner/me/events', authenticate, async (req, res) => {
  try {
    const plannerId = req.uid; 

    const snapshot = await db.collection("Event")
      .where("plannerId", "==", plannerId)
      .get();

    if (snapshot.empty) {
      return res.json({ plannerId, events: [] });
    }

    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ plannerId, events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


//Get the guests for a particular event
app.get('/planner/:eventId/guests', authenticate, async (req, res) =>{
  try{

    const eventId = req.params.eventId;
    const snapshot = await db.collection("Event").doc(eventId).collection("Guests").get();

    if(snapshot.empty){
      return res.json({message: "No guests found for this event"});
    }

    const guests = snapshot.docs.map(doc => ({id: doc.id, ...doc.data() }));
    res.json({eventId, guests});
  }
  catch(err){
    console.error(err);
    res.status(500).json({message: "Server error"});
  }
});

//Get the vendors for a particular event
app.get('/planner/:eventId/vendors', authenticate, async (req, res) => {

  try{
    const eventId = req.params.eventId;
    const snapshot = await db.collection("Event").doc(eventId).collection("Vendors").get();

    if(snapshot.empty){
      return res.json({message: "No vendors found for this event"});
    }

    const vendors = snapshot.docs.map(doc => ({id: doc.id, ...doc.data() }));
    res.json({eventId, vendors});
  }
  catch(err){
    console.error(err);
    res.status(500).json({message: "Server error"});
  }

});

//Updates the information of an event
app.put('/planner/me/:eventId', authenticate, async (req, res) => {
  try{
      const eventId = req.params.eventId;
      const updatedEventData = req.body;

      await db.collection("Event").doc(eventId).update(updatedEventData);

      res.json({message: "Event updated successfully"});


  }
  catch(err){
    console.error(err);
    res.status(500).json({message: "Server error"});
  }
});

//Create a guest manually
app.post('/planner/me/:eventId/guests', authenticate, async (req, res) => {

  try{
    const eventId = req.params.eventId;
    const guestDetails = req.body;

    await db.collection("Event").doc(eventId).collection("Guests").add(guestDetails);

    res.json({message: "Guest added successfully"});
  }
  catch(err){
    console.error(err);
    res.status(500).json({message: "Server error"});
  }
});

//Create planner doc on signup
app.post('/planner/signup', async (req, res) => {
  try{
    const {uid, name, email, eventHistory, activeEvents, preferences} = req.body;

    const plannerDoc = {
      uid,
      name,
      email,
      eventHistory,
      activeEvents,
      preferences
    };

    await db.collection('Planner').doc(plannerDoc.uid).set(plannerDoc);

    res.json({message: "Planner successfully created"});

  }



  catch(err){
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/vendor-applications
 * @desc    Get all vendor applications with a 'pending' status.
 * @access  PUBLIC
 */
// --- CHANGE 1: Removed all middleware from this route ---
app.get('/admin/vendor-applications', async (req, res) => {
  try {
    const snapshot = await db.collection('Vendor').where('status', '==', 'pending').get();
    if (snapshot.empty) {
      return res.json([]);
    }
    const applications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching applications' });
  }
});

/**
 * @route   PUT /api/admin/vendor-applications/:vendorId
 * @desc    Approve or reject a vendor application.
 * @access  PUBLIC
 */
// --- CHANGE 2: Removed all middleware from this route ---
app.put('/admin/vendor-applications/:vendorId', async (req, res) => {
  const { vendorId } = req.params;
  const { status } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status provided' });
  }

  try {
    const vendorRef = db.collection('Vendor').doc(vendorId);
    await vendorRef.update({ status: status });
    res.json({ message: `Vendor application has been ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while updating application' });
  }
});

//Get the vendors for a particular event
app.get('/planner/:eventId/vendors', authenticate, async (req, res) => {

  try{
    const eventId = req.params.eventId;
    const snapshot = await db.collection("Event").doc(eventId).collection("Vendors").get();

    if(snapshot.empty){
      return res.json({message: "No vendors found for this event"});
    }

    const vendors = snapshot.docs.map(doc => ({id: doc.id, ...doc.data() }));
    console.log(vendors);
    res.json({eventId, vendors});
  }
  catch(err){
    console.error(err);
    res.status(500).json({message: "Server error"});
  }

});

//Get the guests for a particular event
app.get('/planner/:eventId/guests', authenticate, async (req, res) =>{
  try{

    const eventId = req.params.eventId;
    const snapshot = await db.collection("Event").doc(eventId).collection("Guests").get();

    if(snapshot.empty){
      return res.json({message: "No guests found for this event"});
    }

    const guests = snapshot.docs.map(doc => ({id: doc.id, ...doc.data() }));
    console.log(guests);
    res.json({eventId, guests});
  }
  catch(err){
    console.error(err);
    res.status(500).json({message: "Server error"});
  }
});

app.get('/admin/vendor-applications', async (req, res) => {
  try {
    const snapshot = await db.collection('Vendor').where('status', '==', 'pending').get();
    if (snapshot.empty) {
      return res.json([]);
    }
    const applications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching applications' });
  }
});


app.put('/admin/vendor-applications/:vendorId', async (req, res) => {
  const { vendorId } = req.params;
  const { status } = req.body;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status provided' });
  }

  try {
    const vendorRef = db.collection('Vendor').doc(vendorId);
    await vendorRef.update({ status: status });
    res.json({ message: `Vendor application has been ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while updating application' });
  }
});



app.get("/vendor/status", authenticate, async (req, res) => {
  try {
    const vendorRef = db.collection("Vendor").doc(req.uid); 
    const doc = await vendorRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Vendor application not found" });
    }

    const { status } = doc.data();
    return res.json({ status });
  } catch (err) {
    console.error("Error fetching vendor status:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

exports.api = functions.https.onRequest(app);
