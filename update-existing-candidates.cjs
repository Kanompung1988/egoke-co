/**
 * Update Existing Candidates - เพิ่มฟิลด์ isVisible และ isActive
 * 
 * สคริปต์นี้จะอัปเดตผู้สมัครเก่าทั้งหมดให้มีฟิลด์:
 * - isVisible: true (แสดงให้ User เห็นและโหวตได้)
 * - isActive: true (นับคะแนนใน Podium)
 * 
 * Usage: node update-existing-candidates.cjs
 */

const admin = require('firebase-admin');
const serviceAccount = require('./functions/egoke-7dae5-091db05d83c0.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateExistingCandidates() {
    console.log('🔧 Starting candidates update...\n');
    
    try {
        // 1. ดึงผู้สมัครทั้งหมด
        const candidatesRef = db.collection('candidates');
        const snapshot = await candidatesRef.get();
        
        if (snapshot.empty) {
            console.log('⚠️ ไม่พบผู้สมัครในระบบ');
            return;
        }

        console.log(`📦 พบผู้สมัครทั้งหมด: ${snapshot.size} คน\n`);

        // 2. อัปเดตทีละคน
        let updated = 0;
        let skipped = 0;

        const batch = db.batch();

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // ถ้ามี isVisible และ isActive อยู่แล้ว ข้าม
            if (data.hasOwnProperty('isVisible') && data.hasOwnProperty('isActive')) {
                console.log(`⏭️ Skip: ${data.name} (มีฟิลด์อยู่แล้ว)`);
                skipped++;
                return;
            }

            // อัปเดต
            batch.update(doc.ref, {
                isVisible: true,  // Default: แสดงให้ User เห็น
                isActive: true    // Default: นับคะแนนใน Podium
            });

            console.log(`✅ Update: ${data.name} (${data.category})`);
            updated++;
        });

        // 3. Commit batch
        if (updated > 0) {
            await batch.commit();
            console.log(`\n🎉 อัปเดตสำเร็จ: ${updated} คน`);
        } else {
            console.log('\n⚠️ ไม่มีผู้สมัครที่ต้องอัปเดต');
        }

        if (skipped > 0) {
            console.log(`⏭️ ข้าม: ${skipped} คน (มีฟิลด์อยู่แล้ว)`);
        }

        console.log('\n✅ เสร็จสิ้น!');
        
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
}

// Run the script
updateExistingCandidates()
    .then(() => {
        console.log('\n🎊 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Fatal error:', error);
        process.exit(1);
    });
