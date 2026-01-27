// Fix Vote Permissions - เพิ่ม voteRights ให้ user ทุกคนที่ยังไม่มี
// ใช้ Firebase Admin SDK

const admin = require('firebase-admin');
const serviceAccount = require('./functions/egoke-7dae5-091db05d83c0.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixVotePermissions() {
    console.log('🔧 Starting vote permissions fix...');
    
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();
        
        console.log(`📊 Found ${snapshot.size} users`);
        
        let updated = 0;
        let skipped = 0;
        
        for (const userDoc of snapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            
            // ถ้ายังไม่มี voteRights ให้เพิ่ม
            if (!userData.voteRights) {
                console.log(`🔄 Adding voteRights to user: ${userData.email}`);
                
                await userDoc.ref.update({
                    voteRights: {
                        band: 1,
                        solo: 1,
                        cover: 1
                    },
                    voteHistory: {
                        band: [],
                        solo: [],
                        cover: []
                    },
                    points: userData.points || 100 // เพิ่ม points ถ้ายังไม่มี
                });
                
                updated++;
            } else {
                console.log(`✅ User already has voteRights: ${userData.email}`);
                skipped++;
            }
        }
        
        console.log('\n✅ Fix completed!');
        console.log(`📈 Updated: ${updated} users`);
        console.log(`⏭️  Skipped: ${skipped} users`);
        
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

// Run the fix
fixVotePermissions().then(() => {
    console.log('🎉 Done!');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});
