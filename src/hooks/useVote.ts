import { useState, useEffect } from 'react';
import { 
    collection, 
    doc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    increment, 
    query, 
    where,
    onSnapshot,
    Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebaseApp';

export interface VoteCategory {
    id: string;
    title: string;
    description: string;
    emoji?: string;
    isOpen: boolean;
    openTime: Timestamp | null;
    closeTime: Timestamp | null;
    autoClose: boolean;
    sessionId: string;
}

export interface Candidate {
    id: string;
    category: string;
    sessionId: string;
    name: string;
    description: string;
    imageUrl: string;
    voteCount: number;
    order: number;
}

export interface VoteRecord {
    id?: string;
    userId: string;
    userName: string;
    category: string;
    sessionId: string;
    candidateId: string;
    candidateName: string;
    timestamp: Timestamp;
}

export function useVoteSettings() {
    const [categories, setCategories] = useState<Record<string, VoteCategory>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const settingsRef = doc(db, 'voteSettings', 'config');
        
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCategories(data.categories || {});
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { categories, loading };
}

export function useCandidates(category: string) {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!category) return;

        const candidatesRef = collection(db, 'candidates');
        const q = query(candidatesRef, where('category', '==', category));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Candidate));
            
            // Sort by order
            data.sort((a, b) => a.order - b.order);
            setCandidates(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [category]);

    return { candidates, loading };
}

export function useUserVoteStatus(category: string, sessionId: string) {
    const [hasVoted, setHasVoted] = useState(false);
    const [votedCandidateId, setVotedCandidateId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkVoteStatus = async () => {
            const user = auth.currentUser;
            if (!user || !category || !sessionId) {
                setLoading(false);
                return;
            }

            try {
                const votesRef = collection(db, 'votes');
                const q = query(
                    votesRef,
                    where('userId', '==', user.uid),
                    where('category', '==', category),
                    where('sessionId', '==', sessionId)
                );

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    if (!snapshot.empty) {
                        const voteDoc = snapshot.docs[0];
                        setHasVoted(true);
                        setVotedCandidateId(voteDoc.data().candidateId);
                    } else {
                        setHasVoted(false);
                        setVotedCandidateId(null);
                    }
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error('Error checking vote status:', error);
                setLoading(false);
            }
        };

        checkVoteStatus();
    }, [category, sessionId]);

    return { hasVoted, votedCandidateId, loading };
}

export async function submitVote(
    category: string,
    sessionId: string,
    candidate: Candidate
): Promise<{ success: boolean; error?: string }> {
    try {
        const user = auth.currentUser;
        if (!user) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนโหวต' };
        }

        console.log('🗳️ Submitting vote:', { category, sessionId, candidateId: candidate.id });

        // Check if already voted in this session
        const votesRef = collection(db, 'votes');
        const q = query(
            votesRef,
            where('userId', '==', user.uid),
            where('category', '==', category),
            where('sessionId', '==', sessionId)
        );
        const existingVotes = await getDocs(q);

        if (!existingVotes.empty) {
            console.log('❌ User already voted in this session');
            return { success: false, error: 'คุณโหวตในหมวดนี้ไปแล้ว' };
        }

        // Create vote record with unique ID
        const voteId = `${user.uid}_${category}_${sessionId}`;
        const voteData: VoteRecord = {
            userId: user.uid,
            userName: user.displayName || 'Anonymous',
            category,
            sessionId,
            candidateId: candidate.id,
            candidateName: candidate.name,
            timestamp: Timestamp.now()
        };

        console.log('📝 Creating vote record:', voteId);

        // Add vote with specific ID to prevent duplicates
        await setDoc(doc(db, 'votes', voteId), voteData);

        // Update candidate vote count
        const candidateRef = doc(db, 'candidates', candidate.id);
        await updateDoc(candidateRef, {
            voteCount: increment(1),
            lastVotedAt: Timestamp.now()
        });

        console.log('✅ Vote submitted successfully');

        return { success: true };
    } catch (error) {
        console.error('❌ Error submitting vote:', error);
        const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
        return { success: false, error: `ไม่สามารถโหวตได้: ${errorMessage}` };
    }
}

export function useVoteStats(category: string) {
    const [totalVotes, setTotalVotes] = useState(0);
    const [topCandidate, setTopCandidate] = useState<Candidate | null>(null);

    useEffect(() => {
        if (!category) return;

        const candidatesRef = collection(db, 'candidates');
        const q = query(candidatesRef, where('category', '==', category));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let total = 0;
            let top: Candidate | null = null;

            snapshot.docs.forEach(doc => {
                const candidate = { id: doc.id, ...doc.data() } as Candidate;
                total += candidate.voteCount || 0;
                
                if (!top || (candidate.voteCount > (top.voteCount || 0))) {
                    top = candidate;
                }
            });

            setTotalVotes(total);
            setTopCandidate(top);
        });

        return () => unsubscribe();
    }, [category]);

    return { totalVotes, topCandidate };
}

// ✅ Real-time Vote Logs for Admin
export function useVoteLogs(category: string, limit: number = 50) {
    const [logs, setLogs] = useState<VoteRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!category) {
            setLogs([]);
            setLoading(false);
            return;
        }

        const votesRef = collection(db, 'votes');
        const q = query(
            votesRef,
            where('category', '==', category),
            // orderBy('timestamp', 'desc') // Commented out to avoid index requirement
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const voteData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as VoteRecord));

            // Sort in memory instead
            voteData.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
            
            setLogs(voteData.slice(0, limit));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [category, limit]);

    return { logs, loading };
}

// ✅ Real-time Vote Count for Admin Dashboard
export function useRealTimeVoteCount(category: string, sessionId: string) {
    const [voteCount, setVoteCount] = useState(0);
    const [voters, setVoters] = useState<string[]>([]);

    useEffect(() => {
        if (!category || !sessionId) return;

        const votesRef = collection(db, 'votes');
        const q = query(
            votesRef,
            where('category', '==', category),
            where('sessionId', '==', sessionId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setVoteCount(snapshot.size);
            const voterNames = snapshot.docs.map(doc => doc.data().userName);
            setVoters(voterNames);
        });

        return () => unsubscribe();
    }, [category, sessionId]);

    return { voteCount, voters };
}
