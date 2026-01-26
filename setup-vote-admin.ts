// Setup Vote Settings using Firebase Admin SDK
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read service account key
const serviceAccountPath = resolve(__dirname, 'functions/egoke-7dae5-091db05d83c0.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

// Initialize Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

const db = admin.firestore();

async function setupVoteSettings() {
    try {
        console.log('🔧 Setting up Vote Settings with Admin SDK...');
        
        const voteSettingsRef = db.collection('voteSettings').doc('config');
        
        const voteSettings = {
            categories: {
                karaoke: {
                    id: 'karaoke',
                    title: 'Karaoke Contest',
                    description: 'ประกวดร้องเพลง',
                    isOpen: false,
                    openTime: null,
                    closeTime: null,
                    autoClose: false,
                    sessionId: `session_${Date.now()}_karaoke`,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                },
                food: {
                    id: 'food',
                    title: 'Best Food',
                    description: 'อาหารอร่อยที่สุด',
                    isOpen: false,
                    openTime: null,
                    closeTime: null,
                    autoClose: false,
                    sessionId: `session_${Date.now()}_food`,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                },
                cosplay: {
                    id: 'cosplay',
                    title: 'Cosplay Contest',
                    description: 'คอสเพลย์สวยที่สุด',
                    isOpen: false,
                    openTime: null,
                    closeTime: null,
                    autoClose: false,
                    sessionId: `session_${Date.now()}_cosplay`,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        await voteSettingsRef.set(voteSettings);
        
        console.log('✅ Vote Settings created successfully!');
        console.log('');
        console.log('📋 Categories:');
        console.log('   🎤 Karaoke - isOpen: false');
        console.log('   🍜 Food - isOpen: false');
        console.log('   👘 Cosplay - isOpen: false');
        console.log('');
        console.log('🎯 Next steps:');
        console.log('   1. เปิด http://localhost:5173/admin');
        console.log('   2. กด F5 รีเฟรช');
        console.log('   3. คุณจะเห็นปุ่ม "▶️ เปิดการโหวต" สำหรับ 3 หมวด');
        console.log('   4. คลิกปุ่มเพื่อเปิดการโหวต');
        console.log('');
        console.log('🎉 เสร็จสมบูรณ์!');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up vote settings:', error);
        process.exit(1);
    }
}

setupVoteSettings();
