const admin = require('firebase-admin');
const serviceAccount = require('./functions/egoke-7dae5-091db05d83c0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const POINTS_TO_ADD = 30;
const REASON = 'ทางทีมงาน EGOKE อยากจะมอบของขวัญให้กับผู้เข้าร่วมงานทุกคน ที่ให้การตอบรับในการเข้างานวันแรกกัน เป็นอย่างดี ด้วยรางวัล 30 point และหวังว่าเราจะได้ร่วมสนุกกันในอีก 2 วันที่เหลือ ขอให้สนุกกับงานนะครับ🎉';

async function addPointsToAllUsers() {
  console.log('🎁 กำลังแจก 30 แต้มให้ทุกคน...\n');
  console.log(`เหตุผล: ${REASON}\n`);

  try {
    const usersSnapshot = await db.collection('users').get();
    let successCount = 0;
    let errorCount = 0;
    const results = [];

    console.log(`📊 พบผู้ใช้ทั้งหมด: ${usersSnapshot.size} คน\n`);

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const currentPoints = userData.points || 0;
      const newPoints = currentPoints + POINTS_TO_ADD;

      try {
        // อัปเดตแต้ม
        await db.collection('users').doc(userId).update({
          points: newPoints,
          lastBonusPoints: POINTS_TO_ADD,
          lastBonusReason: REASON,
          lastBonusAt: admin.firestore.Timestamp.now()
        });

        // บันทึก activity log
        await db.collection('activityLogs').add({
          type: 'admin_adjust_points',
          userId: userId,
          userEmail: userData.email || 'ไม่ระบุ',
          userName: userData.displayName || 'ไม่ระบุ',
          pointsBefore: currentPoints,
          pointsAfter: newPoints,
          adjustment: POINTS_TO_ADD,
          reason: REASON,
          adminId: 'system',
          adminEmail: 'system@egoke.co',
          timestamp: admin.firestore.Timestamp.now()
        });

        results.push({
          name: userData.displayName || userData.email,
          before: currentPoints,
          after: newPoints,
          status: '✅'
        });

        successCount++;
        console.log(`✅ ${userData.displayName || userData.email}: ${currentPoints} → ${newPoints} แต้ม`);

      } catch (error) {
        errorCount++;
        results.push({
          name: userData.displayName || userData.email,
          before: currentPoints,
          after: currentPoints,
          status: '❌'
        });
        console.error(`❌ Error for ${userData.displayName || userData.email}:`, error.message);
      }
    }

    // สร้าง global notification
    await db.collection('notifications').add({
      type: 'bonus_points',
      title: '🎉 ได้รับแต้มโบนัส!',
      message: `คุณได้รับแต้มโบนัส ${POINTS_TO_ADD} แต้ม เนื่องจากเราต้องการเฉลิมฉลองและขอบคุณผู้เข้าร่วมงานทุกท่านที่ให้การตอบรับในงานวันแรกอย่างล้นหลาม! 🎊`,
      points: POINTS_TO_ADD,
      createdAt: admin.firestore.Timestamp.now(),
      showOnce: true,
      isGlobal: true
    });

    console.log('\n' + '='.repeat(80));
    console.log('📊 สรุปผลการแจกแต้ม:');
    console.log(`   ✅ สำเร็จ: ${successCount} คน`);
    console.log(`   ❌ ล้มเหลว: ${errorCount} คน`);
    console.log(`   🎁 แต้มที่แจกต่อคน: ${POINTS_TO_ADD} แต้ม`);
    console.log(`   💰 แต้มรวมทั้งหมดที่แจก: ${successCount * POINTS_TO_ADD} แต้ม`);
    console.log('='.repeat(80));
    console.log('\n✅ แจกแต้มเสร็จสิ้น!');
    console.log('📢 Notification ถูกสร้างแล้ว - ผู้ใช้จะเห็นเมื่อ login ครั้งถัดไป\n');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

addPointsToAllUsers()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
