const admin = require('firebase-admin');
const serviceAccount = require('./functions/egoke-7dae5-091db05d83c0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkVoteRights() {
  console.log('🔍 เช็คสิทธิ์โหวตแบบละเอียด...\n');

  try {
    // ดึง 10 users มาดู
    const usersSnapshot = await db.collection('users').limit(10).get();
    
    console.log(`📊 พบ User: ${usersSnapshot.size} คน\n`);
    
    let hasBandRights = 0;
    let hasSoloRights = 0;
    
    usersSnapshot.docs.forEach((userDoc) => {
      const userData = userDoc.data();
      const voteRights = userData.voteRights || {};
      
      if (voteRights.band > 0) hasBandRights++;
      if (voteRights.solo > 0) hasSoloRights++;
      
      console.log('👤', userData.displayName || userData.email);
      console.log('   solo:', voteRights.solo || 0, '| band:', voteRights.band || 0, '| cover:', voteRights.cover || 0);
    });
    
    console.log('\n📈 สรุป:');
    console.log(`   - User ที่มีสิทธิ์ solo: ${hasSoloRights} คน`);
    console.log(`   - User ที่มีสิทธิ์ band: ${hasBandRights} คน`);

    // เช็ค Activity Logs
    console.log('\n📋 Activity Logs (5 รายการล่าสุด):');
    const logsSnapshot = await db.collection('activityLogs')
      .where('type', '==', 'grant_free_vote')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();
    
    logsSnapshot.docs.forEach((logDoc) => {
      const log = logDoc.data();
      const timestamp = log.timestamp.toDate();
      console.log(`\n   ${timestamp.toLocaleString('th-TH')}`);
      console.log(`   📝 ${log.message}`);
      console.log(`   👥 Affected: ${log.affectedUsers} users`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkVoteRights()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
