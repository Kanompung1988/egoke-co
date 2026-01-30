const admin = require('firebase-admin');
const serviceAccount = require('./functions/egoke-7dae5-091db05d83c0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateOldTickets() {
  console.log('🔄 กำลัง Migrate ตั๋วเก่าไปยัง tickets collection...\n');

  try {
    const usersSnapshot = await db.collection('users').get();
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      const historySnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('history')
        .get();

      if (historySnapshot.empty) continue;

      console.log(`📦 กำลัง migrate ตั๋วของ ${userData.displayName || userData.email}...`);

      for (const ticketDoc of historySnapshot.docs) {
        const ticketData = ticketDoc.data();
        const ticketId = ticketData.ticketId || ticketDoc.id;

        try {
          // เช็คว่า ticketId นี้มีใน tickets collection แล้วหรือยัง
          const existingTicket = await db
            .collection('tickets')
            .where('ticketId', '==', ticketId)
            .get();

          if (!existingTicket.empty) {
            console.log(`   ⏭️  Skip: ${ticketId} (มีอยู่แล้ว)`);
            skippedCount++;
            continue;
          }

          // สร้างตั๋วใหม่ใน tickets collection
          await db.collection('tickets').add({
            ticketId: ticketId,
            userId: userId,
            userName: userData.displayName || userData.email || 'ไม่ระบุชื่อ',
            prize: ticketData.prize || 'ไม่ระบุรางวัล',
            emoji: ticketData.emoji || '🎁',
            claimed: ticketData.claimed || false,
            timestamp: ticketData.timestamp || admin.firestore.Timestamp.now(),
            claimedAt: ticketData.claimedAt || null,
            claimedBy: ticketData.claimedBy || null,
            migratedFrom: 'user-history',
            migratedAt: admin.firestore.Timestamp.now()
          });

          console.log(`   ✅ Migrated: ${ticketId} (${ticketData.prize})`);
          migratedCount++;

        } catch (error) {
          console.error(`   ❌ Error migrating ${ticketId}:`, error.message);
          errorCount++;
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 สรุปผลการ Migration:');
    console.log(`   ✅ Migrate สำเร็จ: ${migratedCount} ตั๋ว`);
    console.log(`   ⏭️  Skip (มีอยู่แล้ว): ${skippedCount} ตั๋ว`);
    console.log(`   ❌ Error: ${errorCount} ตั๋ว`);
    console.log('='.repeat(80));
    console.log('\n✅ Migration เสร็จสิ้น!');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

migrateOldTickets()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
