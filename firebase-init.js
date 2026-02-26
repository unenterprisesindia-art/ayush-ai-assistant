import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAnalytics, isSupported as analyticsSupported } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDaQZ_N45ep9fq0ysOhqFfO7ougKhJpQUo",
  authDomain: "ayush-assistant-d52a3.firebaseapp.com",
  projectId: "ayush-assistant-d52a3",
  storageBucket: "ayush-assistant-d52a3.firebasestorage.app",
  messagingSenderId: "503934483863",
  appId: "1:503934483863:web:0e756682e8d648786698d2",
  measurementId: "G-F1JLEEQDKJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let analytics = null;
if (await analyticsSupported()) {
  analytics = getAnalytics(app);
}

window.auth = auth;
window.db = db;
window.analytics = analytics;

export { app, auth, db, analytics }
