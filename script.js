import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
require('dotenv').config();
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: "egoke-7dae5.firebasestorage.app",
  messagingSenderId: "910235640821",
  appId: "1:910235640821:web:cc5163a4eee3e8dffc76bc",
  measurementId: "G-10MPJ3TPEB"
};
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);