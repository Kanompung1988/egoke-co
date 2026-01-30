/**
 * Check and Update Warp Status Document
 * เช็คและอัปเดตข้อมูลในเอกสาร warpStatus/current
 * 
 * Usage: npx tsx check-warp-status.ts
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

async function checkWarpStatus() {
  try {
    console.log('🔍 Checking Warp Status Document...\n');

    const warpStatusRef = db.collection('warpStatus').doc('current');
    const doc = await warpStatusRef.get();
    
    if (!doc.exists) {
      console.log('❌ Document does not exist! Creating...');
      await warpStatusRef.set({
        canSend: false,
        senderCount: 0,
        maxSenders: 22,
        updatedAt: new Date(),
        createdAt: new Date()
      });
      console.log('✅ Document created successfully!');
      return;
    }

    const data = doc.data();
    console.log('📄 Current Document Data:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    // Check if all required fields exist
    const requiredFields = ['canSend', 'senderCount'];
    const missingFields = requiredFields.filter(field => !(field in data!));

    if (missingFields.length > 0) {
      console.log('⚠️  Missing fields:', missingFields);
      console.log('🔧 Adding missing fields...');
      
      const updates: any = { updatedAt: new Date() };
      
      if (!('canSend' in data!)) updates.canSend = false;
      if (!('senderCount' in data!)) updates.senderCount = 0;
      if (!('maxSenders' in data!)) updates.maxSenders = 22;
      
      await warpStatusRef.update(updates);
      console.log('✅ Fields updated!');
      
      // Re-fetch to show updated data
      const updatedDoc = await warpStatusRef.get();
      console.log('\n📄 Updated Document Data:');
      console.log(JSON.stringify(updatedDoc.data(), null, 2));
    } else {
      console.log('✅ All required fields present!');
    }

    // Show status summary
    console.log('\n📊 Status Summary:');
    console.log(`   🔴 System: ${data!.canSend ? '✅ OPEN' : '❌ CLOSED'}`);
    console.log(`   👥 Senders: ${data!.senderCount || 0}/${data!.maxSenders || 22}`);
    console.log(`   📅 Updated: ${data!.updatedAt?.toDate?.() || 'N/A'}`);

  } catch (error) {
    console.error('❌ Error checking Warp Status:', error);
    throw error;
  }
}

// Run the function
checkWarpStatus()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
