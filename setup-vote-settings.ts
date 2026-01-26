// Setup Vote Settings in Firestore
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDCjt8DfkKCsjc73Oaay851FYu8pG1-3TY",
    authDomain: "egoke-7dae5.firebaseapp.com",
    projectId: "egoke-7dae5",
    storageBucket: "egoke-7dae5.appspot.com",
    messagingSenderId: "910235640821",
    appId: "1:910235640821:web:cc5163a4eee3e8dffc76bc",
    measurementId: "G-10MPJ3TPEB",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function setupVoteSettings() {
    try {
        console.log('🔧 Setting up Vote Settings...');
        
        const voteSettingsRef = doc(db, 'voteSettings', 'config');
        
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
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
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
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
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
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                }
            },
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        
        await setDoc(voteSettingsRef, voteSettings);
        
        console.log('✅ Vote Settings created successfully!');
        console.log('📋 Categories:');
        console.log('   🎤 Karaoke - Session:', voteSettings.categories.karaoke.sessionId);
        console.log('   🍜 Food - Session:', voteSettings.categories.food.sessionId);
        console.log('   👘 Cosplay - Session:', voteSettings.categories.cosplay.sessionId);
        console.log('');
        console.log('🎯 Next steps:');
        console.log('   1. เข้าหน้า /admin');
        console.log('   2. คลิกปุ่ม "▶️ เปิดการโหวต" ที่หมวดที่ต้องการ');
        console.log('   3. User สามารถโหวตได้ที่หน้า /vote');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up vote settings:', error);
        process.exit(1);
    }
}

setupVoteSettings();
