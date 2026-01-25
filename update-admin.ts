import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

// Firebase config
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

async function updateAdminUser() {
    const targetEmail = 'thanaponchanal@gmail.com';
    
    try {
        console.log(`🔍 Searching for user: ${targetEmail}...`);
        
        // Query for user by email
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', targetEmail));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            console.log('❌ User not found. Please make sure the user has logged in at least once.');
            console.log('\n💡 Steps to create the user:');
            console.log('1. Go to https://egoke.areazeroai.com');
            console.log('2. Login with Google using thanaponchanal@gmail.com');
            console.log('3. Run this script again');
            process.exit(1);
        }
        
        // Update the user document
        const userDoc = querySnapshot.docs[0];
        const userId = userDoc.id;
        
        console.log(`✅ User found! ID: ${userId}`);
        console.log('📝 Updating user permissions...');
        
        await updateDoc(doc(db, 'users', userId), {
            role: 'staff',
            isStaff: true,
            points: 999999999,  // Unlimited points (999 million)
            tickets: 999999,     // Unlimited tickets
            displayName: 'Admin - Thanapon',
            updatedAt: new Date()
        });
        
        console.log('\n✨ Successfully updated user:');
        console.log(`📧 Email: ${targetEmail}`);
        console.log(`🛡️ Role: staff (admin)`);
        console.log(`💎 Points: 999,999,999 (unlimited)`);
        console.log(`🎫 Tickets: 999,999 (unlimited)`);
        console.log('\n🎉 User can now access /admin dashboard!');
        
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error updating user:', error.message);
        process.exit(1);
    }
}

// Run the update
updateAdminUser();
