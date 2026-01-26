// Setup Sample Candidates using Firebase Admin SDK
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Admin SDK (if not already initialized)
if (!admin.apps.length) {
    const serviceAccountPath = resolve(__dirname, 'functions/egoke-7dae5-091db05d83c0.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
    });
}

const db = admin.firestore();

// ข้อมูลผู้สมัครตัวอย่าง
const sampleCandidates = [
    // Karaoke
    {
        name: 'ปอเปอร์',
        description: 'นักร้องเสียงดี ท่วงทำนองสุดเพราะ',
        category: 'karaoke',
        imageUrl: '',
        voteCount: 0,
        order: 1
    },
    {
        name: 'เมย์',
        description: 'เสียงหวาน ร้องเพลงไพเราะมาก',
        category: 'karaoke',
        imageUrl: '',
        voteCount: 0,
        order: 2
    },
    {
        name: 'ปกป้อง',
        description: 'นักร้องมากความสามารถ',
        category: 'karaoke',
        imageUrl: '',
        voteCount: 0,
        order: 3
    },
    
    // Food
    {
        name: 'ส้มตำไทย',
        description: 'อร่อยแซ่บ รสชาติดั้งเดิม',
        category: 'food',
        imageUrl: '',
        voteCount: 0,
        order: 1
    },
    {
        name: 'ข้าวผัดกะเพรา',
        description: 'หอม อร่อย กลมกล่อม',
        category: 'food',
        imageUrl: '',
        voteCount: 0,
        order: 2
    },
    {
        name: 'ต้มยำกุ้ง',
        description: 'เผ็ดร้อน รสจัดจ้าน',
        category: 'food',
        imageUrl: '',
        voteCount: 0,
        order: 3
    },
    
    // Cosplay
    {
        name: 'ปอเปอร์',
        description: 'ประชานต้า',
        category: 'cosplay',
        imageUrl: '',
        voteCount: 0,
        order: 1
    },
    {
        name: 'เมย์',
        description: 'ประชานต้า',
        category: 'cosplay',
        imageUrl: '',
        voteCount: 0,
        order: 2
    },
    {
        name: 'ปกป้อง',
        description: 'ประชาน',
        category: 'cosplay',
        imageUrl: '',
        voteCount: 0,
        order: 3
    }
];

async function setupSampleCandidates() {
    try {
        console.log('🎭 Setting up Sample Candidates...');
        console.log('');
        
        const candidatesRef = db.collection('candidates');
        
        // เช็คว่ามี candidates อยู่แล้วหรือยัง
        const existingCandidates = await candidatesRef.limit(1).get();
        
        if (!existingCandidates.empty) {
            console.log('⚠️  มีผู้สมัครอยู่แล้ว ต้องการเพิ่มหรือไม่?');
            console.log('   ถ้าต้องการลบข้อมูลเก่า ให้รัน:');
            console.log('   firebase firestore:delete --all-collections');
            console.log('');
            console.log('💡 หรือถ้าต้องการเพิ่มเฉพาะที่ยังไม่มี กด Enter');
            console.log('');
        }
        
        let addedCount = 0;
        let skippedCount = 0;
        
        for (const candidate of sampleCandidates) {
            // เช็คว่ามีชื่อซ้ำในหมวดเดียวกันหรือไม่
            const existingQuery = await candidatesRef
                .where('name', '==', candidate.name)
                .where('category', '==', candidate.category)
                .limit(1)
                .get();
            
            if (existingQuery.empty) {
                await candidatesRef.add({
                    ...candidate,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                
                const emoji = candidate.category === 'karaoke' ? '🎤' : 
                              candidate.category === 'food' ? '🍜' : '👘';
                console.log(`✅ เพิ่ม: ${emoji} ${candidate.name} (${candidate.category})`);
                addedCount++;
            } else {
                console.log(`⏭️  มีอยู่แล้ว: ${candidate.name} (${candidate.category})`);
                skippedCount++;
            }
        }
        
        console.log('');
        console.log('📊 สรุป:');
        console.log(`   ✅ เพิ่มใหม่: ${addedCount} คน`);
        console.log(`   ⏭️  มีอยู่แล้ว: ${skippedCount} คน`);
        console.log('');
        console.log('🎯 ขั้นตอนต่อไป:');
        console.log('   1. เปิด http://localhost:5173/admin');
        console.log('   2. ตรวจสอบว่ามีผู้สมัครในตาราง');
        console.log('   3. ถ้าการโหวตเปิดอยู่แล้ว User สามารถโหวตได้เลย!');
        console.log('');
        console.log('🎉 เสร็จสมบูรณ์!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up candidates:', error);
        process.exit(1);
    }
}

setupSampleCandidates();
