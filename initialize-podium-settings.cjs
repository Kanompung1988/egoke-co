const admin = require('firebase-admin');
const serviceAccount = require('./functions/egoke-7dae5-091db05d83c0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function initializePodiumSettings() {
  console.log('🎯 กำลังสร้าง Podium Settings...\n');

  try {
    await db.collection('settings').doc('podium').set({
      displayMode: 'total100',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });

    console.log('✅ สร้าง Podium Settings สำเร็จ!\n');
    console.log('โหมดเริ่มต้น: รวม (100%)');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

initializePodiumSettings()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
