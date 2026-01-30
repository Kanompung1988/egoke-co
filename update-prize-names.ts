/**
 * Update Prize Names in User History
 * สคริปต์นี้จะอัปเดตชื่อรางวัลเก่าในประวัติของ user
 * 
 * การเปลี่ยนแปลง:
 * - "ตั๋วเล่นกิจกรรมฟรี" → ลบออก (ไม่มีแล้ว)
 * - อัปเดตเปอร์เซ็นต์ใหม่ในระบบ
 * 
 * Usage: npx tsx update-prize-names.ts
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

async function updatePrizeNames() {
  try {
    console.log('🔄 Starting prize names update...\n');

    // รายการรางวัลใหม่ (6 รางวัล)
    const newPrizes = [
      { label: "ตุ๊กตาใหญ่", emoji: "🧸🧸🧸", probability: 0.1 },
      { label: "ตุ๊กตาไซส์เล็ก", emoji: "🧸", probability: 2.9 },
      { label: "คูปองสปอนเซอร์", emoji: "🎟️", probability: 30.0 },
      { label: "ตั๋วโหวตฟรี", emoji: "🗳️", probability: 40.0 },
      { label: "ขนมสปอนเซอร์", emoji: "🍬", probability: 10.0 },
      { label: "ขนมกรุบกรอบปลอบใจ", emoji: "🍪", probability: 17.0 },
    ];

    console.log('📋 รายการรางวัลใหม่:');
    newPrizes.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.emoji} ${p.label} - ${p.probability}%`);
    });
    console.log('\n⚠️  รางวัลที่ลบออก: 🎫 ตั๋วเล่นกิจกรรมฟรี\n');

    // ดึง users ทั้งหมด
    const usersSnapshot = await db.collection('users').get();
    console.log(`👥 พบ ${usersSnapshot.size} users\n`);

    let totalUpdated = 0;
    let totalHistoryItems = 0;
    let removedActivityTickets = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // อัปเดต history subcollection
      const historyRef = db.collection('users').doc(userId).collection('history');
      const historySnapshot = await historyRef.get();
      
      if (historySnapshot.empty) continue;

      let userHistoryUpdated = 0;

      for (const historyDoc of historySnapshot.docs) {
        const historyData = historyDoc.data();
        
        // ลบรางวัล "ตั๋วเล่นกิจกรรมฟรี" ออก
        if (historyData.prize === 'ตั๋วเล่นกิจกรรมฟรี') {
          await historyRef.doc(historyDoc.id).delete();
          removedActivityTickets++;
          userHistoryUpdated++;
          console.log(`   ❌ Removed: ${historyData.prize} (User: ${userData.email})`);
        }
        
        totalHistoryItems++;
      }

      if (userHistoryUpdated > 0) {
        totalUpdated++;
      }
    }

    console.log('\n✅ Update completed!');
    console.log(`📊 Statistics:`);
    console.log(`   - Total users: ${usersSnapshot.size}`);
    console.log(`   - Total history items: ${totalHistoryItems}`);
    console.log(`   - Users with updates: ${totalUpdated}`);
    console.log(`   - Removed activity tickets: ${removedActivityTickets}`);
    
    console.log('\n📝 หมายเหตุ:');
    console.log('   - รางวัลที่ลบไปจะไม่แสดงในประวัติ');
    console.log('   - User ที่เคยได้รางวัลนี้จะไม่เห็นในประวัติแล้ว');
    console.log('   - ราคาหมุนเปลี่ยนจาก 20 → 30 แต้มแล้ว\n');

  } catch (error) {
    console.error('❌ Error updating prize names:', error);
    throw error;
  }
}

// Run the function
updatePrizeNames()
  .then(() => {
    console.log('✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
