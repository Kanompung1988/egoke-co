const admin = require('firebase-admin');
const serviceAccount = require('./functions/egoke-7dae5-091db05d83c0.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUserVoteRights() {
  console.log('🔍 เช็คสิทธิ์โหวตของ User...\n');

  try {
    // ดึง 5 users แรกมาดู
    const usersSnapshot = await db.collection('users').limit(5).get();
    
    console.log(`📊 พบ User: ${usersSnapshot.size} คน\n`);
    
    usersSnapshot.docs.forEach((userDoc) => {
      const userData = userDoc.data();
      const voteRights = userData.voteRights || {};
      
      console.log('👤 User:', userData.displayName || userData.email);
      console.log('   UID:', userDoc.id);
      console.log('   Vote Rights:');
      console.log('      - solo:', voteRights.solo || 0);
      console.log('      - band:', voteRights.band || 0);
      console.log('      - cover:', voteRights.cover || 0);
      console.log('   freeVoteUsed:', userData.freeVoteUsed);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserVoteRights()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
