// ===================================
// Initialize Vote Rights for Existing Users
// ===================================
// Run this script once to add voteRights field to all existing users

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initializeVoteRights() {
  console.log('🚀 Starting vote rights initialization...');

  try {
    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    console.log(`📊 Found ${usersSnapshot.size} users`);

    // Process in batches (Firestore limit: 500 operations per batch)
    const batchSize = 500;
    let batch = writeBatch(db);
    let operationCount = 0;
    let totalUpdated = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();

      // Skip if voteRights already exists
      if (userData.voteRights) {
        console.log(`⏭️  Skipping ${userData.email} - already has voteRights`);
        continue;
      }

      // Add voteRights field
      const userRef = doc(db, 'users', userDoc.id);
      batch.update(userRef, {
        voteRights: {
          band: 1,
          solo: 1,
          cover: 1
        },
        voteHistory: {
          band: [],
          solo: [],
          cover: []
        }
      });

      operationCount++;
      totalUpdated++;

      // Commit batch when reaching limit
      if (operationCount >= batchSize) {
        console.log(`💾 Committing batch of ${operationCount} operations...`);
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
      }

      console.log(`✅ Initialized voteRights for ${userData.email}`);
    }

    // Commit remaining operations
    if (operationCount > 0) {
      console.log(`💾 Committing final batch of ${operationCount} operations...`);
      await batch.commit();
    }

    console.log(`\n🎉 Successfully initialized vote rights for ${totalUpdated} users!`);
    console.log(`✓ Each user now has 1 free vote right for each category (band, solo, cover)`);

  } catch (error) {
    console.error('❌ Error initializing vote rights:', error);
    throw error;
  }
}

// Run the script
initializeVoteRights()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
