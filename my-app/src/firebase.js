// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {getAuth} from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCfLqY8Bdi0QkhjwDJqCd5aLCUM9qcWr1k",
  authDomain: "planit-sdp.firebaseapp.com",
  projectId: "planit-sdp",
  storageBucket: "planit-sdp.firebasestorage.app",
  messagingSenderId: "974183628209",
  appId: "1:974183628209:web:9345abf6fbb7d440351190",
  measurementId: "G-92D8JZN3MG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const analytics = getAnalytics(app);

export default app;
