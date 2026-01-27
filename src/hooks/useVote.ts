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
    Timestamp,
    writeBatch, 
    serverTimestamp 
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
    sheetId?: number | string;
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
    sheetId?: number | string;
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
                // เช็คจาก userVotes collection เพื่อความแม่นยำ
                const voteId = `${user.uid}_${sessionId}_${category}`;
                const userVoteRef = doc(db, 'userVotes', voteId);

                const unsubscribe = onSnapshot(userVoteRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setHasVoted(true);
                        setVotedCandidateId(docSnap.data().candidateId);
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

// ✅ ฟังก์ชัน Submit Vote ที่ปรับปรุงแล้ว
export async function submitVote(
    category: string,
    sessionId: string,
    candidate: Candidate
): Promise<{ success: boolean; error?: string; newVoteCount?: number }> {
    try {
        const user = auth.currentUser;
        if (!user) {
            return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนโหวต' };
        }

        console.log(`🗳️ [Start] User ${user.displayName} is voting for ${candidate.name}...`);

        const batch = writeBatch(db);

        // 1. สร้าง Reference
        const userVoteId = `${user.uid}_${sessionId}_${category}`;
        const userVoteRef = doc(db, 'userVotes', userVoteId);
        const voteRecordRef = doc(collection(db, 'votes'));
        const candidateRef = doc(db, 'candidates', candidate.id);

        // 2. ตรวจสอบก่อนว่าเคยโหวตไปหรือยัง (Client Check)
        const userVoteSnap = await getDoc(userVoteRef);
        if (userVoteSnap.exists()) {
            console.warn('❌ User already voted in this session');
            return { success: false, error: 'คุณโหวตในหมวดนี้ไปแล้ว' };
        }

        // 3. ใส่คำสั่งลงใน Batch (ทำงานพร้อมกัน)
        
        // A. บันทึกว่า User นี้โหวตแล้ว
        batch.set(userVoteRef, {
            userId: user.uid,
            candidateId: candidate.id,
            category: category,
            sessionId: sessionId,
            timestamp: serverTimestamp()
        });

        // B. สร้างประวัติการโหวต (สำหรับ Admin นับคะแนน)
        batch.set(voteRecordRef, {
            userId: user.uid,
            userName: user.displayName || 'Anonymous',
            category,
            sessionId,
            candidateId: candidate.id,
            candidateName: candidate.name,
            timestamp: serverTimestamp()
        });

        // C. บวกคะแนนทีละ 1 (Atomic Increment)
        batch.update(candidateRef, {
            voteCount: increment(1),
            lastVotedAt: serverTimestamp()
        });

        // 4. Commit Batch
        await batch.commit();

        // 5. อ่านค่าคะแนนล่าสุดทันทีเพื่อส่งกลับไปอัปเดต Sheet
        const updatedSnap = await getDoc(candidateRef);
        const newVoteCount = updatedSnap.exists() ? updatedSnap.data().voteCount : 0;

        // ---------------------------------------------------------
        // 🐛 DEBUG LOG
        // ---------------------------------------------------------
        console.group("✅ VOTE SUCCESS DEBUG");
        console.log(`👤 Voter: ${user.displayName} (${user.uid})`);
        console.log(`🎸 Voted For: ${candidate.name}`);
        console.log(`📊 Updated Score: ${newVoteCount}`);
        console.groupEnd();
        // ---------------------------------------------------------

        return { success: true, newVoteCount };

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

export function useVoteLogs(category: string, limitCount: number = 50) {
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
            where('category', '==', category)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const voteData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as VoteRecord));

            voteData.sort((a, b) => {
                const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
                const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
                return timeB - timeA;
            });
            
            setLogs(voteData.slice(0, limitCount));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [category, limitCount]);

    return { logs, loading };
}

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