import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

// Firebase config from firebaseApp.ts
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

const MOCK_DATA = {
  // Vote Settings - 3 categories
  voteSettings: [
    {
      category: 'karaoke',
      isOpen: false,
      sessionId: 'session_default_karaoke',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      category: 'food',
      isOpen: false,
      sessionId: 'session_default_food',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      category: 'cosplay',
      isOpen: false,
      sessionId: 'session_default_cosplay',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
  ],

  // Candidates - 10 per category
  candidates: [
    // Karaoke
    { name: 'Sakura Hoshino', description: 'นักร้องเพลงป็อปที่มีเสียงใสสะกดใจ', category: 'karaoke', imageUrl: '', voteCount: 0 },
    { name: 'Yuki Tanaka', description: 'ร้องเพลงบัลลาดสุดซึ้ง ทำให้หัวใจละลาย', category: 'karaoke', imageUrl: '', voteCount: 0 },
    { name: 'Hana Yamamoto', description: 'ผู้เชี่ยวชาญเพลงอนิเมะ พร้อมพลังเสียงที่น่าทึ่ง', category: 'karaoke', imageUrl: '', voteCount: 0 },
    { name: 'Riku Nakamura', description: 'นักร้องเพลงร็อคที่มีสไตล์ไม่เหมือนใคร', category: 'karaoke', imageUrl: '', voteCount: 0 },
    { name: 'Aoi Suzuki', description: 'เสียงนุ่มนวลแบบคลาสสิก ฟังแล้วผ่อนคลาย', category: 'karaoke', imageUrl: '', voteCount: 0 },
    { name: 'Ren Kobayashi', description: 'ราชาเพลงเจ-ป็อป ที่มีท่าเต้นสุดเจ๋ง', category: 'karaoke', imageUrl: '', voteCount: 0 },
    { name: 'Mio Watanabe', description: 'นักร้องหญิงที่มีความหลากหลายในแนวเพลง', category: 'karaoke', imageUrl: '', voteCount: 0 },
    { name: 'Sora Ito', description: 'ดาวรุ่งใหม่ที่มีเสียงหวานเหมือนน้ำผึ้ง', category: 'karaoke', imageUrl: '', voteCount: 0 },
    { name: 'Kaito Takahashi', description: 'เสียงทุ้มที่ลึกซึ้งสะท้อนอารมณ์ได้ยอดเยี่ยม', category: 'karaoke', imageUrl: '', voteCount: 0 },
    { name: 'Himari Sato', description: 'นางฟ้าเสียงเพราะที่จับใจทุกคน', category: 'karaoke', imageUrl: '', voteCount: 0 },

    // Food
    { name: 'Takoyaki Supreme', description: 'ทาโกะยากิสุดพิเศษ กรอบนอกนุ่มใน ซอสเข้มข้น', category: 'food', imageUrl: '', voteCount: 0 },
    { name: 'Ramen Paradise', description: 'ราเมนน้ำซุปหมูเข้มข้น เส้นเหนียวนุ่ม ท็อปปิ้งครบ', category: 'food', imageUrl: '', voteCount: 0 },
    { name: 'Onigiri Garden', description: 'โอนิกิริรสชาติหลากหลาย สดใหม่ทำสด', category: 'food', imageUrl: '', voteCount: 0 },
    { name: 'Tempura Heaven', description: 'เทมปุระกรอบเบา ทอดกรอบร้อนๆ ทานคู่ซอสพิเศษ', category: 'food', imageUrl: '', voteCount: 0 },
    { name: 'Sushi Dream', description: 'ซูชิหน้าปลาดิบสดใหม่ ข้าวหอมนุ่ม', category: 'food', imageUrl: '', voteCount: 0 },
    { name: 'Okonomiyaki Deluxe', description: 'โอโคโนมิยากิสไตล์โอซาก้า ใส่ท็อปปิ้งเต็ม', category: 'food', imageUrl: '', voteCount: 0 },
    { name: 'Mochi Bliss', description: 'โมจินุ่มนิ่ม ไส้ครีมหวานละมุน', category: 'food', imageUrl: '', voteCount: 0 },
    { name: 'Yakitori Master', description: 'ไก่ย่างสุดพิเศษ ทาเรหอมหวาน ย่างสุกกำลังดี', category: 'food', imageUrl: '', voteCount: 0 },
    { name: 'Udon Station', description: 'อุด้งเส้นใหญ่เหนียวนุ่ม น้ำซุปรสจัดจ้าน', category: 'food', imageUrl: '', voteCount: 0 },
    { name: 'Dorayaki Classic', description: 'โดรายากิแบบคลาสสิก ไส้ถั่วแดงหวานมัน', category: 'food', imageUrl: '', voteCount: 0 },

    // Cosplay
    { name: 'Sailor Moon Stellar', description: 'คอสเพลย์เซเลอร์มูนสุดเริ่ด ชุดเป๊ะทุกรายละเอียด', category: 'cosplay', imageUrl: '', voteCount: 0 },
    { name: 'Naruto Hokage', description: 'นารูโตะฮอกาเกะรูปร่างเหมือนจริง มีออร่า', category: 'cosplay', imageUrl: '', voteCount: 0 },
    { name: 'Demon Slayer Tanjiro', description: 'ทันจิโร่ จากดาบพิฆาตอสูร ชุดแม่นยำ', category: 'cosplay', imageUrl: '', voteCount: 0 },
    { name: 'Genshin Raiden', description: 'ไรเดนโชกุน จากเกม Genshin Impact สวยงาม', category: 'cosplay', imageUrl: '', voteCount: 0 },
    { name: 'Attack on Titan Levi', description: 'ลีไวจากอาทิตัน ครบเครื่อง ท่าเท่', category: 'cosplay', imageUrl: '', voteCount: 0 },
    { name: 'My Hero Deku', description: 'เดคุจากฮีโร่อคาเดเมีย ชุดสีเขียวจัดจ้าน', category: 'cosplay', imageUrl: '', voteCount: 0 },
    { name: 'Pikachu Cute', description: 'พิคาจูน่ารักจนใจละลาย เหมือนในเกม', category: 'cosplay', imageUrl: '', voteCount: 0 },
    { name: 'Final Fantasy Cloud', description: 'คลาวด์พร้อมดาบบัสเตอร์สุดเท่', category: 'cosplay', imageUrl: '', voteCount: 0 },
    { name: 'Jujutsu Kaisen Gojo', description: 'โกโจซาโทรุจากจูจุตสึไคเซ็น เจ๋งสุดๆ', category: 'cosplay', imageUrl: '', voteCount: 0 },
    { name: 'One Piece Luffy', description: 'ลูฟี่จากวันพีซ หมวกฟางครบเครื่อง', category: 'cosplay', imageUrl: '', voteCount: 0 }
  ]
};

async function setupFirestore() {
  console.log('🚀 Starting Firestore setup...\n');

  try {
    // 1. Add vote settings
    console.log('📝 Adding vote settings...');
    for (const setting of MOCK_DATA.voteSettings) {
      await addDoc(collection(db, 'voteSettings'), setting);
      console.log(`  ✅ Added ${setting.category} settings`);
    }

    // 2. Add candidates
    console.log('\n👥 Adding candidates...');
    for (const candidate of MOCK_DATA.candidates) {
      const candidateWithTimestamp = {
        ...candidate,
        createdAt: Timestamp.now()
      };
      await addDoc(collection(db, 'candidates'), candidateWithTimestamp);
      console.log(`  ✅ Added ${candidate.name} (${candidate.category})`);
    }

    console.log('\n✨ Firestore setup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Vote Settings: ${MOCK_DATA.voteSettings.length} categories`);
    console.log(`  - Candidates: ${MOCK_DATA.candidates.length} total`);
    console.log(`    • Karaoke: 10 candidates`);
    console.log(`    • Food: 10 candidates`);
    console.log(`    • Cosplay: 10 candidates`);
    console.log('\n🎉 You can now use the Vote + Admin system!');
    
  } catch (error) {
    console.error('❌ Error setting up Firestore:', error);
  }
}

// Run setup
setupFirestore();
