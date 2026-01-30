/**
 * Initialize Warp Status Document
 * Run this script once to create the warpStatus/current document
 * 
 * Usage: npx tsx initialize-warp-status.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'functions', 'egoke-7dae5-091db05d83c0.json');

initializeApp({
  credential: cert(serviceAccountPath)
});

const db = getFirestore();

async function initializeWarpStatus() {
  try {
    console.log('🔄 Initializing Warp Status...');

    const warpStatusRef = db.collection('warpStatus').doc('current');
    
    // Check if document already exists
    const doc = await warpStatusRef.get();
    
    if (doc.exists) {
      console.log('✅ Warp Status document already exists:');
      console.log(doc.data());
      
      // Ask if user wants to reset
      console.log('\n⚠️  Document already exists. Current values will be preserved.');
      console.log('💡 To reset manually, delete the document from Firebase Console first.');
      return;
    }

    // Create initial document
    await warpStatusRef.set({
      canSend: false,        // ระบบปิดโดย default
      senderCount: 0,        // จำนวนคนส่งเริ่มต้น
      maxSenders: 22,        // จำนวนคนสูงสุด
      updatedAt: new Date(),
      createdAt: new Date()
    });

    console.log('✅ Warp Status initialized successfully!');
    console.log({
      canSend: false,
      senderCount: 0,
      maxSenders: 22
    });

  } catch (error) {
    console.error('❌ Error initializing Warp Status:', error);
    throw error;
  }
}

// Run the function
initializeWarpStatus()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
