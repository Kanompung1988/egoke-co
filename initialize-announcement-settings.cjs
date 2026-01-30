const admin = require('firebase-admin');
const serviceAccount = require('./functions/egoke-7dae5-091db05d83c0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function initializeAnnouncementSettings() {
  console.log('📢 กำลังสร้าง Announcement Settings...\n');

  try {
    await db.collection('settings').doc('announcement').set({
      visible: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });

    console.log('✅ สร้าง Announcement Settings สำเร็จ!\n');
    console.log('สถานะเริ่มต้น: เปิดประกาศ (visible: true)');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

initializeAnnouncementSettings()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
