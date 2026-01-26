import admin from 'firebase-admin';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Initialize Firebase Admin
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceAccountPath = join(__dirname, 'functions', 'egoke-7dae5-091db05d83c0.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixVoteCount() {
    console.log('🔧 Starting vote count fix...\n');

    try {
        // Get all candidates
        const candidatesSnapshot = await db.collection('candidates').get();
        
        console.log(`📋 Found ${candidatesSnapshot.size} candidates\n`);

        for (const candidateDoc of candidatesSnapshot.docs) {
            const candidate = candidateDoc.data();
            const candidateId = candidateDoc.id;
            
            console.log(`\n📊 Processing: ${candidate.name} (${candidate.category})`);
            
            // Count votes for this candidate
            const votesSnapshot = await db.collection('votes')
                .where('candidateId', '==', candidateId)
                .get();
            
            const voteCount = votesSnapshot.size;
            console.log(`   Current voteCount: ${candidate.voteCount || 0}`);
            console.log(`   Actual votes in DB: ${voteCount}`);
            
            // Update candidate with correct vote count
            await db.collection('candidates').doc(candidateId).update({
                voteCount: voteCount
            });
            
            console.log(`   ✅ Updated voteCount to: ${voteCount}`);
        }

        console.log('\n✅ Vote count fix completed successfully!');
        
        // Show summary
        console.log('\n📊 Summary by category:');
        const categories = ['karaoke', 'food', 'cosplay'];
        
        for (const category of categories) {
            const categoryCandidates = await db.collection('candidates')
                .where('category', '==', category)
                .get();
            
            let totalVotes = 0;
            categoryCandidates.forEach(doc => {
                const data = doc.data();
                totalVotes += data.voteCount || 0;
            });
            
            console.log(`\n${category.toUpperCase()}:`);
            console.log(`  - Candidates: ${categoryCandidates.size}`);
            console.log(`  - Total Votes: ${totalVotes}`);
            
            // Show each candidate's votes
            categoryCandidates.forEach(doc => {
                const data = doc.data();
                console.log(`    • ${data.name}: ${data.voteCount || 0} votes`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

fixVoteCount();
