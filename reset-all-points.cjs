// Reset All User Points to 0
// ตั้งแต้มทุกคนเป็น 0

const admin = require('firebase-admin');
const serviceAccount = require('./functions/egoke-7dae5-091db05d83c0.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function resetAllPoints() {
    console.log('🔧 Starting points reset...');
    
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();
        
        console.log(`📊 Found ${snapshot.size} users`);
        
        let updated = 0;
        let skipped = 0;
        
        for (const userDoc of snapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            const userEmail = userData.email || 'no-email';
            
            // ข้าม SuperAdmin
            if (userData.role === 'superadmin') {
                console.log(`⏭️  Skipped SuperAdmin: ${userEmail}`);
                skipped++;
                continue;
            }
            
            // ตั้งแต้มเป็น 0
            await userDoc.ref.update({
                points: 0,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`✅ Reset points to 0: ${userEmail}`);
            updated++;
        }
        
        console.log('\n✅ Points reset completed!');
        console.log(`📈 Updated: ${updated} users`);
        console.log(`⏭️  Skipped: ${skipped} users (SuperAdmin)`);
        
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

// Run the script
resetAllPoints().then(() => {
    console.log('🎉 Done!');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});
