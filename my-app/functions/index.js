// index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const multer = require('multer');

//ee702ea5-50cd-466b-a94b-41285799f3f0

const nodemailer = require('nodemailer');
const { onDocumentCreated } = require('firebase-functions/firestore');
const { v4: uuidv4 } = require("uuid");


admin.initializeApp();

const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY || 'external-api-key-here';
const db = admin.firestore();
const bucket = admin.storage().bucket();


function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== EXTERNAL_API_KEY) {
    return res.status(401).json({ message: 'Invalid or missing API key' });
  }
  next();
}

// Rate limiting middleware (basic in-memory limiter for demo; use Redis or Firestore for production)
const rateLimit = require('express-rate-limit');
const guestListLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window per IP
  message: { message: 'Too many requests, please try again later.' },
});


const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "noreply.planit.online@gmail.com",
        pass: "viwxojqfceyzmjye"
    }
});



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
// completely donw
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

          budget:eventData.budget,
          eventId: eventDoc.id,
          eventName: eventData.name,
          description: eventData.description,

          date: eventData.date,
          location: eventData.location,
          expectedGuestCount: eventData.expectedGuestCount,

          style: eventData.style,
          specialRequirements: eventData.specialRequirements||[],
          eventCategory: eventData.eventCategory,
          theme: eventData.theme,

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


app.put("/event/:eventId/vendor/:vendorId/status", authenticate, async (req, res) => {
  try {
    const { eventId, vendorId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const vendorRef = db
      .collection("Event")
      .doc(eventId)
      .collection("Vendors")
      .doc(vendorId);

    // Use update() instead of set() if you just want to update fields
    await vendorRef.update({ status });

    res.json({ message: "Vendor status updated successfully" });
  } catch (err) {
    console.error("Error updating vendor status:", err);

    // If the doc doesn't exist, update() will throw
    if (err.code === 5 || err.message.includes("No document to update")) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(500).json({ message: "Server error", error: err.message });
  }
});



app.put("/vendor/:eventId/contract",authenticate,upload.single("contract"),
  async (req, res) => {
    try {
      const vendorId = req.uid;
      const eventId = req.params.eventId;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type" });
      }

      // Upload to Firebase Storage
      const fileName = `contracts/${eventId}/${vendorId}/${uuidv4()}-${file.originalname}`;
      const fileRef = storage.bucket().file(fileName); // make sure to use .bucket()
      await fileRef.save(file.buffer, { metadata: { contentType: file.mimetype } });

      const [downloadUrl] = await fileRef.getSignedUrl({
        action: "read",
        expires: new Date("2026-09-03"),
      });

      // Update Firestore
      const vendorRef = db.collection("Event").doc(eventId).collection("Vendors").doc(vendorId);
      const vendorSnap = await vendorRef.get();
      if (!vendorSnap.exists) {
        return res.status(404).json({ message: "Vendor not found for this event" });
      }

      await vendorRef.set({ contractUrl: downloadUrl }, { merge: true });

      res.json({ message: "Contract uploaded successfully", contractUrl: downloadUrl });
    } catch (err) {
      console.error("Error uploading contract:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);




app.get("/analytics/:vendorId", authenticate, async (req, res) => {
  try {
    const vendorId = req.params.vendorId; // Use the URL param
    console.log("Fetching analytics for vendor:", vendorId);

    // Fetch the Analytics document for this vendor
    const analyticsDoc = await db.collection("Analytics").doc(vendorId).get();
    if (!analyticsDoc.exists) {
      return res.status(404).json({ message: "Vendor analytics not found" });
    }

    const analyticsData = analyticsDoc.data();

    // Fetch Reviews subcollection
    const reviewsSnapshot = await db
      .collection("Analytics")
      .doc(vendorId)
      .collection("Reviews")
      .get();

    const reviews = reviewsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ ...analyticsData, reviews });
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

    await db.collection("Event").doc(eventId).collection("Guests").add({
      token: uuidv4(),
      ...guestDetails});

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

//Import guests
app.post('/planner/events/:eventId/guests/import', authenticate, async (req, res) => {
  try{
    const eventId = req.params.eventId;
    const { guests } = req.body;

    //Validate guest data
    const validGuests = guests.filter(guest => 
      guest.email && guest.firstname
    ).map(guest => ({
      token: uuidv4(),
      firstname: guest.firstname?.trim(),
      lastname: guest.lastname?.trim() || '',
      email: guest.email?.toLowerCase().trim(),
      rsvpStatus: 'pending'
    }));

    // Batch write to Firestore
    const batch = db.batch();
    const guestCollection = db.collection('Event').doc(eventId).collection('Guests');
    
    validGuests.forEach(guest => {
      const guestRef = guestCollection.doc();
      batch.set(guestRef, guest);
    });

    await batch.commit();
    return res.status(200).json({ success: true, imported: validGuests.length });
  }
  catch{
    console.error(error);
    return res.status(500).json({message: "Internal Server Error"});
  }
});

//Fetch and filter best vendors
//Will perhaps make logic more complex in the future

app.get('/planner/events/:eventId/bestvendors', authenticate, async (req, res) => {
try {
    const eventId = req.params.eventId;
    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    // Fetch the event document to get its category
    const eventSnap = await db.collection("Event").doc(eventId).get();
    if (!eventSnap.exists) {
      return res.status(404).json({ error: "Event not found" });
    }

    const event = eventSnap.data();
    const category = event.eventCategory;

    // Fetch approved vendors
    const vendorSnap = await db
      .collection("Vendor")
      .where("status", "==", "approved")
      .get();

    if (vendorSnap.empty) return res.status(200).json({ vendors: [] });

    const vendors = vendorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Apply scoring
    const scoredVendors = vendors.map(vendor => {
      let score = 0;
      if (vendor.category && vendor.category.toLowerCase() === category.toLowerCase()) score += 50;
      if (vendor.profilePic && vendor.profilePic.trim() !== "") score += 20;
      if (vendor.description && vendor.description.trim() !== "") score += 20;
      if (vendor.businessName && vendor.businessName.trim() !== "") score += 10;
      return { ...vendor, score };
    });

    const sortedVendors = scoredVendors.sort((a, b) => b.score - a.score);

    res.status(200).json({ vendors: sortedVendors });
  } catch (err) {
    console.error("Error matching vendors:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

//Fetch and filter best vendors for all events
//Will perhaps make logic more complex in the future
app.get('/planner/:plannerId/bestvendors', authenticate, async (req, res) => {
  try{
    const plannerId = req.params.plannerId;
    if (!plannerId) {
      return res.status(400).json({ error: "Missing plannerId" });
    }

    // Get all events created by this planner
    const eventsSnap = await db
      .collection("Event")
      .where("plannerId", "==", plannerId)
      .get();

    if (eventsSnap.empty) {
      // Get all vendors, no sorting will be done
      const vendorsSnap = await db
      .collection("Vendor")
      .where("status", "==", "approved")
      .get();
      const vendors = vendorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.status(200).json({ vendors });
    }

    // Collect unique categories across all events
    const categories = new Set();
    eventsSnap.forEach((doc) => {
      const data = doc.data();
      if (data.category) {
        categories.add(data.category.toLowerCase());
      }
    });

    if (categories.size === 0) {
      return res.status(400).json({ error: "No categories found in planner's events" });
    }

    // Get all vendors
    const vendorsSnap = await db.collection("Vendor").get();

    const vendors = vendorsSnap.docs.map((doc) => {
      const v = doc.data();
      v.id = doc.id;

      // Score vendors: +1 for each matching category
      let score = 0;
      if (v.category) {
        categories.forEach((cat) => {
          if (v.category.toLowerCase() === cat) {
            score++;
          }
        });
      }
      return { ...v, score };
    });

    // Sort vendors by score (highest first)
    const sorted = vendors.sort((a, b) => b.score - a.score);

    return res.json({ vendors: sorted });
  }
  catch(error){
    console.error("Error recommending vendors: ", error);
    res.status(500).json({message: "Internal Server error"});
  }
});

//Add a vendor to an event
app.post('/planner/:eventId/vendors/:vendorId', authenticate, async (req, res) => {
  try{
    const eventId = req.params.eventId;
    const vendorId = req.params.vendorId;
    
    if (!eventId || !vendorId){
      return res.status(400).json({message: "Missing eventId or vendorId"});
    }

    const vendorSnap = await db.collection("Vendor").doc(vendorId).get();
    if (!vendorSnap.exists) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const vendor = { id: vendorSnap.id, ...vendorSnap.data() };

    await db.collection("Event").doc(eventId).collection("Vendors").doc(vendor.id).set({
      businessName: vendor.businessName || "",
      email: vendor.email || "",
      status: "pending",
      extraNotes: "",
      AllContracts: [],
      services: []
    });

    res.status(200).json({message: "Vendor added to event successfully"});
  }
  catch(error){
    console.error("Error adding vendor to event: ", error);
    res.status(500).json({message: "Internal Server error"});
  }
});

// Send an invitation email when a guest is added
exports.sendInvitationOnGuestAdded = onDocumentCreated('Event/{eventId}/Guests/{guestId}', async (event) => {
    
  try {
      const snap = event.data;
      const guestData = snap.data();
      const { firstname, email, token: guestToken } = guestData;
      
      if (!email || !firstname) {
        console.error('Missing guest email or firstname');
        return;
      }

      const { eventId, guestId} = event.params;

      // Fetch event data
      const eventDoc = await db.collection('Event').doc(eventId).get();
      if (!eventDoc.exists) {
        console.error('Event not found:', eventId);
        return;
      }

      const eventData = eventDoc.data();
      const { name, date, duration, location, description } = eventData;

      const acceptUrl = `https://witty-stone-03009b61e.1.azurestaticapps.net/planner/rsvp/${eventId}/${guestToken}/accept`;
      const declineUrl = `https://witty-stone-03009b61e.1.azurestaticapps.net/planner/rsvp/${eventId}/${guestToken}/decline`;
      const tempacceptUrl = `http://localhost:5173/planner/rsvp/${eventId}/${guestToken}/accept`;
      const tempdeclineUrl = `http://localhost:5173/planner/rsvp/${eventId}/${guestToken}/decline`;

      const mailOptions = {
        from: 'noreply.planit.online@gmail.com',
        to: email,
        subject: `Event Invitation: ${name}`,
        html: `
          <section style="font-family: Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: 0 auto;">
            <section style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">PlanIT</h1>
              <p style="color: #666; margin: 5px 0;">Event Invitation</p>
            </section>
            
            <p style="font-size: 16px;">Dear ${firstname},</p>
            
            <p style="font-size: 16px;">You are cordially invited to the following event:</p>
            
            <section style="background-color: #f8f9fa; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #2563eb;">
              <h2 style="color: #2563eb; margin-top: 0; margin-bottom: 15px;">${name}</h2>
              <p style="margin: 8px 0;"><strong>Date:</strong> ${date}</p>
              ${duration ? `<p style="margin: 8px 0;"><strong>Duration:</strong> ${duration}</p>` : ''}
              ${location ? `<p style="margin: 8px 0;"><strong>Location:</strong> ${location}</p>` : ''}
              ${description ? `<p style="margin: 8px 0;"><strong>Details:</strong> ${description}</p>` : ''}
            </section>
            
            <section style="text-align: center; margin: 30px 0;">
              <p style="font-size: 16px; margin-bottom: 20px;">Please RSVP as soon as possible:</p>
              <section style="display: inline-block;">
                <a href="${acceptUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 0 10px; display: inline-block;">Accept</a>
                <a href="${declineUrl}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 0 10px; display: inline-block;">Decline</a>
              </section>
            </section>
            
            <section style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="font-size: 14px; color: #666;">Best regards,<br><strong>The PlanIT Team</strong></p>
              <p style="font-size: 12px; color: #999; margin-top: 15px;">
                This is an automated invitation. Please do not reply directly to this email.
              </p>
            </section>
          </section>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`Invitation email sent successfully to ${email} for event ${name}`);
      
    } catch (error) {
      console.error('Error sending invitation email:', error);
    }
  }
);

// RSVP Accept endpoint
app.put("/rsvp/:eventId/:guestToken/accept", async (req, res) => {
  try {
    const { eventId, guestToken } = req.params;

    // Verify event exists
    const eventDoc = await db.collection('Event').doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ message: "Event not found" });
    }

    const eventData = eventDoc.data();

    // Verify guest exists
    const guestQuery = await db.collection('Event').doc(eventId).collection('Guests').where('token', '==', guestToken).get();
    
    // Check if any documents matched
    if (guestQuery.empty) {
      return res.status(404).json({ message: "Guest not found" });
    }

    // Get the first (and should be only) guest document
    const guestDoc = guestQuery.docs[0];
    const guestData = {id: guestDoc.id, ...guestDoc.data()};

    // Update guest RSVP status
    await db.collection('Event').doc(eventId)
      .collection('Guests').doc(guestDoc.id)
      .update({
        rsvpStatus: 'accepted',
      });

    // Send confirmation email
    const confirmationEmail = {
      from: 'noreply.planit.online@gmail.com',
      to: guestData.email,
      subject: `RSVP Confirmed: ${eventData.name}`,
      html: `
        <section style="font-family: Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: 0 auto;">
          <section style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">PlanIT</h1>
            <p style="color: #666; margin: 5px 0;">RSVP Confirmation</p>
          </section>
          
          <section style="background-color: #ecfdf5; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #10b981; text-align: center;">
            <h2 style="color: #10b981; margin-top: 0;">RSVP Accepted!</h2>
            <p style="font-size: 16px; margin: 10px 0;">Thank you for accepting the invitation to:</p>
            <h3 style="color: #2563eb; margin: 15px 0;">${eventData.name}</h3>
          </section>
          
          <p style="font-size: 16px;">Dear ${guestData.firstname},</p>
          <p style="font-size: 16px;">We're excited to confirm that you'll be joining us! We look forward to seeing you at the event.</p>
          
          <section style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="font-size: 14px; color: #666;">Best regards,<br><strong>The PlanIT Team</strong></p>
          </section>
        </section>
      `
    };

    await transporter.sendMail(confirmationEmail);
    res.status(200).json({event: eventData, guest: guestData});
    console.log(`RSVP accepted for guest ${guestData.id} in event ${eventId}`);

  } catch (error) {
    console.error('Error processing RSVP accept:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// RSVP Decline endpoint
app.put("/rsvp/:eventId/:guestToken/decline", async (req, res) => {
  try {
    const { eventId, guestToken } = req.params;

    // Verify event exists
    const eventDoc = await db.collection('Event').doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ message: "Event not found" });
    }

    const eventData = eventDoc.data();

    // Verify guest exists
    const guestQuery = await db.collection('Event').doc(eventId)
      .collection('Guests').where("token", "==", guestToken).get();
    
    // Check if any documents matched
    if (guestQuery.empty) {
      return res.status(404).json({ message: "Guest not found" });
    }

    // Get the first (and should be only) guest document
    const guestDoc = guestQuery.docs[0];
    const guestData = {id: guestDoc.id, ...guestDoc.data()};

    // Update guest RSVP status
    await db.collection('Event').doc(eventId)
      .collection('Guests').doc(guestData.id)
      .update({
        rsvpStatus: 'declined'
      });

    // Send confirmation email
    const confirmationEmail = {
      from: 'noreply.planit.online@gmail.com',
      to: guestData.email,
      subject: `RSVP Response Received: ${eventData.name}`,
      html: `
        <section style="font-family: Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: 0 auto;">
          <section style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">PlanIT</h1>
            <p style="color: #666; margin: 5px 0;">RSVP Response</p>
          </section>
          
          <section style="background-color: #fef2f2; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #ef4444; text-align: center;">
            <h2 style="color: #ef4444; margin-top: 0;">RSVP Response Received</h2>
            <p style="font-size: 16px; margin: 10px 0;">We understand you won't be able to join us for:</p>
            <h3 style="color: #2563eb; margin: 15px 0;">${eventData.name}</h3>
          </section>
          
          <p style="font-size: 16px;">Dear ${guestData.firstname},</p>
          <p style="font-size: 16px;">Thank you for letting us know. We're sorry you won't be able to make it, but we appreciate your response.</p>
          <p style="font-size: 16px;">If your plans change, please feel free to reach out to the event organizer.</p>
          
          <section style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="font-size: 14px; color: #666;">Best regards,<br><strong>The PlanIT Team</strong></p>
          </section>
        </section>
      `
    };

    await transporter.sendMail(confirmationEmail);
    res.status(200).json({event: eventData, guest: guestData});
    console.log(`RSVP declined for guest ${guestData.id}in event ${eventId}`);

  } catch (error) {
    console.error('Error processing RSVP decline:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Send reminder email to a specific guest
app.get("/planner/:eventId/:guestId/sendReminder", authenticate, async (req, res) => {
  try {
    const { eventId, guestId } = req.params;

    // Verify planner owns the event
    const eventDoc = await db.collection('Event').doc(eventId).get();
    if (!eventDoc.exists) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventData = eventDoc.data();

    // Get guest data
    const guestDoc = await db.collection('Event').doc(eventId)
      .collection('Guests').doc(guestId).get();
    
    if (!guestDoc.exists) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    const guestData = guestDoc.data();
    const { firstname, email, rsvpStatus } = guestData;

    if (!email || !firstname) {
      return res.status(400).json({ error: 'Guest email or name missing' });
    }

    const { name, date, duration, location, description } = eventData;

    // Determine reminder type based on RSVP status
    const isRsvpReminder = !rsvpStatus || rsvpStatus === 'pending';
    const reminderType = isRsvpReminder ? 'RSVP Reminder' : 'Event Reminder';
    const reminderMessage = isRsvpReminder 
      ? "We haven't received your RSVP yet. Please let us know if you can attend:"
      : "This is a friendly reminder about your upcoming event:";

    const mailOptions = {
      from: 'noreply.planit.online@gmail.com',
      to: email,
      subject: `${reminderType}: ${name}`,
      html: `
        <section style="font-family: Arial, sans-serif; color: #333; padding: 20px; max-width: 600px; margin: 0 auto;">
          <section style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">PlanIT</h1>
            <p style="color: #666; margin: 5px 0;">${reminderType}</p>
          </section>
          
          <p style="font-size: 16px;">Dear ${firstname},</p>
          
          <p style="font-size: 16px;">${reminderMessage}</p>
          
          <section style="background-color: #f8f9fa; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #2563eb;">
            <h2 style="color: #2563eb; margin-top: 0; margin-bottom: 15px;">${name}</h2>
            <p style="margin: 8px 0;"><strong>Date:</strong> ${date}</p>
            ${duration ? `<p style="margin: 8px 0;"><strong>Duration:</strong> ${duration}</p>` : ''}
            ${location ? `<p style="margin: 8px 0;"><strong>Location:</strong> ${location}</p>` : ''}
            ${description ? `<p style="margin: 8px 0;"><strong>Details:</strong> ${description}</p>` : ''}
          </section>
          
          ${isRsvpReminder ? `
            <section style="text-align: center; margin: 30px 0;">
              <p style="font-size: 16px; margin-bottom: 20px;">Please RSVP:</p>
              <section style="display: inline-block;">
                <a href="#" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 0 10px; display: inline-block;">Accept</a>
                <a href="#" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 0 10px; display: inline-block;">Decline</a>
              </section>
            </section>
          ` : `
            <section style="background-color: #ecfdf5; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #10b981;">
              <p style="margin: 0; color: #065f46;"><strong>Your RSVP Status:</strong> ${rsvpStatus === 'accepted' ? 'Accepted' : rsvpStatus === 'declined' ? 'Declined' : 'Pending'}</p>
            </section>
          `}
          
          <section style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="font-size: 14px; color: #666;">Best regards,<br><strong>The PlanIT Team</strong></p>
            <p style="font-size: 12px; color: #999; margin-top: 15px;">
              This is an automated reminder. Please do not reply directly to this email.
            </p>
          </section>
        </section>
      `
    };

    await transporter.sendMail(mailOptions);
    
    await db.collection('Event').doc(eventId)
      .collection('Guests').doc(guestId)
      .update({
        lastReminderSent: admin.firestore.FieldValue.serverTimestamp(),
        reminderCount: admin.firestore.FieldValue.increment(1)
      });

    console.log(`Reminder email sent successfully to ${email} for event ${name}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Reminder email sent successfully',
      sentTo: email,
      reminderType
    });

  } catch (error) {
    console.error('Error sending reminder email:', error);
    res.status(500).json({ 
      error: 'Failed to send reminder email',
      details: error.message 
    });
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
app.get('/planner/:eventId/guests', [guestListLimiter, authenticateApiKey], async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const snapshot = await db.collection("Event").doc(eventId).collection("Guests").get();

    if (snapshot.empty) {
      return res.json({ eventId, guests: [], message: "No guests found for this event" });
    }

    // Sanitize guest data to expose only necessary fields
    const guests = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        rsvpStatus: data.rsvpStatus || 'pending'
      };
    });

    res.json({ eventId, guests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
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

app.get('/admin/events', async (req, res) => {
  try {
    const snapshot = await db.collection('Event').get();
    if (snapshot.empty) {
      return res.json({ events: [] });
    }
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching events' });
  }
});

app.delete('/admin/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const eventRef = db.collection('Event').doc(eventId);

   
    await eventRef.delete();

    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while deleting event' });
  }
});


exports.api = functions.https.onRequest(app);


// =================================================================
// --- ADMIN PROFILE MANAGEMENT ROUTES ---
// =================================================================

/* Middleware to check if the user is an admin
async function isAdmin(req, res, next) {
    const userRef = db.collection('Admin').doc(req.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        return res.status(403).json({ message: 'Forbidden: Requires admin privileges' });
    }
    next();
}
*/

app.post('/admin/me', authenticate, async (req, res) => {
  try {
    const { fullName, phone, email, profilePic } = req.body;
    let profilePicURL = '';

    if (profilePic) {
      const buffer = Buffer.from(profilePic, 'base64');
      const fileRef = bucket.file(`Admin/${req.uid}/profile.jpg`);
      await fileRef.save(buffer, { contentType: 'image/jpeg' });
      await fileRef.makePublic();
      profilePicURL = `https://storage.googleapis.com/${bucket.name}/${fileRef.name}`;
    }

    await db.collection('Admin').doc(req.uid).set({
      fullName,
      phone,
      email,
      profilePic: profilePicURL,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: 'Admin profile created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// Get the admin profile
app.get('/admin/me', authenticate, async (req, res) => {
  try {
    const doc = await db.collection('Admin').doc(req.uid).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const adminData = doc.data();

    res.json({
      ...adminData,
      profilePic: adminData.profilePic || null // ensure field always exists
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update the Admin's profile
app.put('/admin/me', authenticate, async (req, res) => {
  try {
    const {fullName, phone, email, profilePic } = req.body;
    let profilePicURL = '';

    if (profilePic) {
      const buffer = Buffer.from(profilePic, 'base64');
      const fileRef = bucket.file(`admin/${req.uid}/profile.jpg`);
      await fileRef.save(buffer, { contentType: 'image/jpeg' });
      await fileRef.makePublic();
      profilePicURL = `https://storage.googleapis.com/${bucket.name}/${fileRef.name}`;
    }

    await db.collection('Admin').doc(req.uid).update({ fullName,
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

// admin planner management
app.get('/admin/planners', [authenticate, isAdmin], async (req, res) => {
  try {
    const snapshot = await db.collection('Planner').get();
    if (snapshot.empty) {
      return res.json([]);
    }
    const planners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(planners);
  } catch (err) {
    console.error('Error fetching planners:', err);
    res.status(500).json({ message: 'Server error while fetching planners' });
  }
});

app.put('/admin/planners/:plannerId/status', [authenticate, isAdmin], async (req, res) => {
  const { plannerId } = req.params;
  const { status } = req.body; // Expecting { "status": "suspended" } or { "status": "active" }

  if (!status || !['active', 'suspended'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status provided' });
  }

  try {
    const plannerRef = db.collection('Planner').doc(plannerId);
    await plannerRef.update({ status: status });
    res.json({ message: `Planner status has been updated to ${status}` });
  } catch (err) {
    console.error('Error updating planner status:', err);
    res.status(500).json({ message: 'Server error while updating planner' });
  }
});

/**
 * @route   DELETE /api/admin/planners/:plannerId
 * @desc    Delete a planner's profile.
 * @access  Private (Admin Only)
 */
app.delete('/admin/planners/:plannerId', [authenticate, isAdmin], async (req, res) => {
    const { plannerId } = req.params;
    try {
        await db.collection('Planner').doc(plannerId).delete();
        res.json({ message: 'Planner has been deleted successfully' });
    } catch (err) {
        console.error('Error deleting planner:', err);
        res.status(500).json({ message: 'Server error while deleting planner' });
    }
});

exports.api = functions.https.onRequest(app);