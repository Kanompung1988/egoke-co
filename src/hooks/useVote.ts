import { useState, useEffect } from 'react';
import { 
    collection, 
    doc, 
    getDoc, 
    increment, 
    query, 
    where, 
    onSnapshot, 
    Timestamp,
    writeBatch, 
    serverTimestamp,
    runTransaction,
    orderBy,
    limit
} from 'firebase/firestore';
import { db, auth } from '../firebaseApp';
import type { VoteRights, VoteRightsPurchase, UserVoteRecord } from '../types/voteRights';
import { logVoteCast, logVoteRightsPurchase } from '../utils/activityLogger';

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
    isVisible: boolean; // แสดงให้ User เห็นและโหวตได้
    isActive: boolean;  // นับคะแนนใน Podium
    purchasePoints?: number; // ✅ คะแนนซื้อของ (70%)
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

// ===================================
// Vote Rights Hooks
// ===================================

/**
 * Hook to get user's vote rights for each category
 */
export function useVoteRights(userId: string | undefined) {
    const [voteRights, setVoteRights] = useState<VoteRights>({ band: 1, solo: 1, cover: 1 }); // Default ฟรี 1 ครั้ง
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const userDocRef = doc(db, 'users', userId);
        
        const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setVoteRights(data.voteRights || { band: 1, solo: 1, cover: 1 }); // ถ้าไม่มีให้ฟรี 1
            } else {
                setVoteRights({ band: 1, solo: 1, cover: 1 }); // User ใหม่ได้ฟรี 1
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    return { voteRights, loading };
}

/**
 * Purchase vote rights for a specific category
 */
export async function purchaseVoteRights(
    userId: string,
    userEmail: string,
    userName: string,
    category: 'band' | 'solo' | 'cover',
    rightsAmount: number
): Promise<{ success: boolean; message: string }> {
    if (!userId || !category || rightsAmount <= 0) {
        return { success: false, message: 'ข้อมูลไม่ถูกต้อง' };
    }

    const POINTS_PER_RIGHT = 15;
    const totalCost = rightsAmount * POINTS_PER_RIGHT;

    try {
        const result = await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', userId);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists()) {
                throw new Error('ไม่พบข้อมูลผู้ใช้');
            }

            const userData = userDoc.data();
            const currentPoints = userData.points || 0;
            const currentRights = userData.voteRights || { band: 1, solo: 1, cover: 1 }; // Default ฟรี 1

            if (currentPoints < totalCost) {
                throw new Error(`แต้มไม่เพียงพอ (ต้องการ ${totalCost} แต้ม, มีอยู่ ${currentPoints} แต้ม)`);
            }

            const newPoints = currentPoints - totalCost;
            const newRights = {
                ...currentRights,
                [category]: (currentRights[category] || 0) + rightsAmount // บวกตรงๆ ไม่ +1 เพิ่ม
            };

            // Update user document
            transaction.update(userRef, {
                points: newPoints,
                voteRights: newRights,
                updatedAt: serverTimestamp()
            });

            // Create purchase record
            const purchaseRef = doc(collection(db, 'voteRightsPurchases'));
            const purchase: Omit<VoteRightsPurchase, 'id'> = {
                userId,
                userEmail,
                userName,
                category,
                rightsAmount,
                pointsSpent: totalCost,
                pointsBefore: currentPoints,
                pointsAfter: newPoints,
                purchasedAt: serverTimestamp() as Timestamp
            };
            transaction.set(purchaseRef, purchase);

            return { pointsBefore: currentPoints, pointsAfter: newPoints };
        });

        // Log activity after successful transaction
        await logVoteRightsPurchase(
            userId,
            userEmail,
            userName,
            category,
            rightsAmount,
            result.pointsBefore,
            result.pointsAfter
        );

        return { 
            success: true, 
            message: `ซื้อสิทธิ์โหวต ${rightsAmount} ครั้ง สำเร็จ (ใช้ ${totalCost} แต้ม)` 
        };
    } catch (error) {
        console.error('Error purchasing vote rights:', error);
        return { 
            success: false, 
            message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการซื้อสิทธิ์โหวต' 
        };
    }
}

/**
 * Modified submit vote to use vote rights instead of checking hasVoted
 */
export async function submitVoteWithRights(
    userId: string,
    userEmail: string,
    userName: string,
    candidateId: string,
    category: string,
    sessionId: string
): Promise<{ success: boolean; message: string }> {
    if (!userId || !candidateId || !category || !sessionId) {
        return { success: false, message: 'ข้อมูลไม่ถูกต้อง' };
    }

    try {
        const result = await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', userId);
            const candidateRef = doc(db, 'candidates', candidateId);
            
            const userDoc = await transaction.get(userRef);
            const candidateDoc = await transaction.get(candidateRef);

            if (!userDoc.exists()) {
                throw new Error('ไม่พบข้อมูลผู้ใช้');
            }

            if (!candidateDoc.exists()) {
                throw new Error('ไม่พบข้อมูลผู้สมัคร');
            }

            const userData = userDoc.data();
            const candidateData = candidateDoc.data();
            const currentRights = userData.voteRights || { band: 1, solo: 1, cover: 1 };

            // Check if user has vote rights for this category
            if (!currentRights[category] || currentRights[category] <= 0) {
                throw new Error('คุณไม่มีสิทธิ์โหวตในหมวดนี้แล้ว กรุณาซื้อสิทธิ์เพิ่ม');
            }

            // Determine if this is a free vote or purchased vote
            const isFirstVote = !userData.voteHistory || 
                                !userData.voteHistory[category] || 
                                userData.voteHistory[category].length === 0;
            const voteType: 'free' | 'purchased' = isFirstVote ? 'free' : 'purchased';

            // Deduct vote right
            const newRights = {
                ...currentRights,
                [category]: currentRights[category] - 1
            };

            // Update vote history
            const voteHistory = userData.voteHistory || {};
            const categoryHistory = voteHistory[category] || [];
            categoryHistory.push({
                candidateId,
                candidateName: candidateData.name,
                votedAt: new Date(),
                voteType
            });

            // Update user document
            transaction.update(userRef, {
                voteRights: newRights,
                [`voteHistory.${category}`]: categoryHistory,
                updatedAt: serverTimestamp()
            });

            // Increment candidate vote count
            transaction.update(candidateRef, {
                voteCount: increment(1),
                updatedAt: serverTimestamp()
            });

            // Create vote record
            const voteRecordRef = doc(collection(db, 'votes'));
            const voteRecord: Omit<UserVoteRecord, 'id'> = {
                userId,
                userEmail,
                userName,
                category: category as 'band' | 'solo' | 'cover',
                candidateId,
                candidateName: candidateData.name,
                voteType,
                votedAt: serverTimestamp() as Timestamp
            };
            transaction.set(voteRecordRef, voteRecord);

            return {
                candidateName: candidateData.name,
                voteType,
                points: userData.points || 0
            };
        });

        // Log activity after successful vote
        await logVoteCast(
            userId,
            userEmail,
            userName,
            category as 'band' | 'solo' | 'cover',
            candidateId,
            result.candidateName,
            result.voteType,
            result.points
        );

        return {
            success: true,
            message: `โหวตให้ ${result.candidateName} สำเร็จ!`
        };
    } catch (error) {
        console.error('Error submitting vote:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการโหวต'
        };
    }
}

/**
 * Get user's vote history for a category
 */
export function useVoteHistory(userId: string | undefined, category: string) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId || !category) {
            setLoading(false);
            return;
        }

        const userRef = doc(db, 'users', userId);

        const unsubscribe = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                const voteHistory = data.voteHistory?.[category] || [];
                setHistory(voteHistory);
            } else {
                setHistory([]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, category]);

    return { history, loading };
}

/**
 * Get purchase history for a user
 */
export function usePurchaseHistory(userId: string | undefined) {
    const [purchases, setPurchases] = useState<VoteRightsPurchase[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const purchasesRef = collection(db, 'voteRightsPurchases');
        const q = query(purchasesRef, where('userId', '==', userId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const purchaseData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as VoteRightsPurchase[];
            
            setPurchases(purchaseData.sort((a, b) => 
                b.purchasedAt.toMillis() - a.purchasedAt.toMillis()
            ));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    return { purchases, loading };
}

/**
 * Get all activity logs (SuperAdmin only)
 */
export function useActivityLogs(limitCount?: number) {
    const [logs, setLogs] = useState<import('../types/voteRights').ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const logsRef = collection(db, 'activityLogs');
            
            // Build query with proper ordering
            const q = limitCount 
                ? query(logsRef, orderBy('timestamp', 'desc'), limit(limitCount))
                : query(logsRef, orderBy('timestamp', 'desc'));

            const unsubscribe = onSnapshot(q, 
                (snapshot) => {
                    const logsData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as import('../types/voteRights').ActivityLog[];
                    
                    setLogs(logsData);
                    setLoading(false);
                    setError(null);
                },
                (err) => {
                    console.error('Error fetching activity logs:', err);
                    setError(err.message);
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err) {
            console.error('Error setting up activity logs listener:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setLoading(false);
        }
    }, [limitCount]);

    return { logs, loading, error };
}
