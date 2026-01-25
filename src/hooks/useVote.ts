import { useState, useEffect } from 'react';
import { 
    collection, 
    doc, 
    getDoc, 
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

        // Check if already voted
        const votesRef = collection(db, 'votes');
        const q = query(
            votesRef,
            where('userId', '==', user.uid),
            where('category', '==', category),
            where('sessionId', '==', sessionId)
        );
        const existingVotes = await getDocs(q);

        if (!existingVotes.empty) {
            return { success: false, error: 'คุณโหวตหมวดนี้ไปแล้ว' };
        }

        // Create vote record
        const voteData: VoteRecord = {
            userId: user.uid,
            userName: user.displayName || 'Anonymous',
            category,
            sessionId,
            candidateId: candidate.id,
            candidateName: candidate.name,
            timestamp: Timestamp.now()
        };

        // Add vote
        await setDoc(doc(collection(db, 'votes')), voteData);

        // Update candidate vote count
        const candidateRef = doc(db, 'candidates', candidate.id);
        await updateDoc(candidateRef, {
            voteCount: increment(1)
        });

        // Update user's voted sessions
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const votedSessions = userDoc.data()?.votedSessions || [];
        
        await updateDoc(userRef, {
            votedSessions: [...votedSessions, sessionId],
            voteHistory: [...(userDoc.data()?.voteHistory || []), {
                category,
                candidateId: candidate.id,
                candidateName: candidate.name,
                timestamp: Timestamp.now()
            }]
        });

        return { success: true };
    } catch (error) {
        console.error('Error submitting vote:', error);
        return { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' };
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
