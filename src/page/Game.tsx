import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import BottomNav from "../components/BottomNav";
import { auth, db } from "../firebaseApp"; // Make sure db is correctly initialized Firestore instance
import { onAuthStateChanged, type User } from "firebase/auth";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    increment,
    collection,
    addDoc, // Used to add new history documents
    query,
    orderBy,
    limit,
    getDocs,
} from "firebase/firestore";

import GameWheel from "../components/GameWheel";
import UserSummary from "../components/UserSummary";
import HistoryList from "../components/HistoryList";
import PrizeModal from "../components/PrizeModal";
import TicketModal from "../components/TicketModal";

type HistoryItem = {
    id?: string; // Document ID from Firestore
    prize: string;
    emoji?: string;
    timestamp: number; // Use number (milliseconds since epoch) for simplicity here
    ticketId?: string;
    claimed?: boolean; // สถานะการเคลมรางวัล
    claimedAt?: number; // เวลาที่เคลม
    claimedBy?: string; // UID ของคนที่เคลม
};

const DEFAULT_SPIN_COST = 20;

export default function Game() {
    const [user, setUser] = useState<User | null>(null);
    const [points, setPoints] = useState<number | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [showPrizeModal, setShowPrizeModal] = useState(false);
    const [wonPrize, setWonPrize] = useState<{ label: string; emoji: string } | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<HistoryItem | null>(null);
    const [showTicketModal, setShowTicketModal] = useState(false);

    const wheelRef = useRef<HTMLDivElement | null>(null);
    const currentRotationRef = useRef<number>(0);

    // Prize definitions - Updated with new prizes and probabilities
    const prizes = useMemo(
        () => [
            { label: "ตุ๊กตาใหญ่", emoji: "🧸🧸🧸", color: "#dc2626", probability: 0.1 },
            { label: "ตุ๊กตาไซส์เล็ก", emoji: "🧸", color: "#ef4444", probability: 2.9 },
            { label: "ตั๋วเล่นกิจกรรมฟรี", emoji: "🎫", color: "#dc2626", probability: 35.0 },
            { label: "คูปองสปอนเซอร์", emoji: "🎟️", color: "#ef4444", probability: 30.0 },
            { label: "ตั๋วโหวตฟรี", emoji: "�️", color: "#dc2626", probability: 10.0 },
            { label: "ขนมสปอนเซอร์", emoji: "�", color: "#ef4444", probability: 5.0 },
            { label: "ขนมกรุบกรอบปลอบใจ", emoji: "�", color: "#dc2626", probability: 17.0 },
        ],
        []
    );

    // Auth state listener (loads points and history on login)
    useEffect(() => {
        const un = onAuthStateChanged(auth, async (u: User | null) => {
            setUser(u);
            if (u) {
                await loadUserPoints(u.uid);
                await loadHistory(u.uid); // Load history when user logs in
            } else {
                setPoints(null);
                setHistory([]); // Clear history on logout
            }
        });
        return () => un();
    }, []);

    // Function to load user points (no changes needed here)
    async function loadUserPoints(uid: string) {
        try {
            const userRef = doc(db, "users", uid);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
                const data = snap.data() as any; // Consider creating a UserProfile type
                setPoints(typeof data.points === "number" ? data.points : 0);
            } else {
                // Create user doc if it doesn't exist
                const currentUser = auth.currentUser;
                await setDoc(doc(db, "users", uid), {
                    uid,
                    displayName: currentUser?.displayName ?? "Anonymous",
                    email: currentUser?.email ?? "",
                    photoURL: currentUser?.photoURL ?? "",
                    points: 0,
                });
                setPoints(0);
            }
        } catch (e: any) {
            console.error("loadUserPoints error", e);
             if (e?.code === 'permission-denied') setPoints(0); // Handle permission error gracefully
        }
    }

    // ✅ Function to load history from Firestore
    async function loadHistory(uid: string) {
        console.log("Loading history for user:", uid); // Debug log
        try {
            // Reference to the 'history' subcollection for the specific user
            const historyCollectionRef = collection(db, "users", uid, "history");
            // Query to get the last 20 history items, ordered by timestamp descending
            const q = query(historyCollectionRef, orderBy("timestamp", "desc"), limit(20));
            const querySnapshot = await getDocs(q);

            // Map Firestore documents to HistoryItem objects
            const items: HistoryItem[] = querySnapshot.docs.map((doc) => ({
                id: doc.id, // Get the document ID
                prize: doc.data().prize,
                emoji: doc.data().emoji,
                timestamp: doc.data().timestamp,
                ticketId: doc.data().ticketId,
                claimed: doc.data().claimed || false, // เพิ่ม: สถานะการเคลม
                claimedAt: doc.data().claimedAt || undefined, // เพิ่ม: เวลาที่เคลม
                claimedBy: doc.data().claimedBy || undefined, // เพิ่ม: UID ของคนที่เคลม
            }));
            console.log("Loaded history items:", items); // Debug log
            setHistory(items);
        } catch (e: any) {
            console.error("loadHistory error:", e);
             if (e?.code === 'permission-denied') setHistory([]); // Handle permission error gracefully
             // Handle other potential errors like 'quota-exceeded' if needed
        }
    }

    // Function to generate a unique ticket ID (no changes needed)
    function generateTicketId() {
        // Simple unique ID generator
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    // Main function to handle the wheel spin
    async function handleSpin() {
        // --- Pre-spin checks (user logged in, not spinning, enough points) ---
        if (!user) { alert("กรุณาเข้าสู่ระบบก่อนเล่น"); return; }
        if (isSpinning) return;
        if (points === null) return; // Still loading points
        if (points < DEFAULT_SPIN_COST) { alert("คะแนนไม่เพียงพอสำหรับหมุน"); return; }

        setIsSpinning(true);

        try {
            // --- Determine the winning prize ---
            const totalProbability = prizes.reduce((sum, p) => sum + (p.probability || 1), 0);
            const randomNum = Math.random() * totalProbability;
            let cumulativeProbability = 0;
            let prizeIndex = 0;
            for (let i = 0; i < prizes.length; i++) {
                cumulativeProbability += prizes[i].probability || 1;
                if (randomNum <= cumulativeProbability) {
                    prizeIndex = i;
                    break;
                }
            }
            const prizeObj = prizes[prizeIndex];
            const winningPrize = prizeObj.label;
            const winningEmoji = prizeObj.emoji;

            // --- Animate the wheel ---
            const segAngle = 360 / prizes.length;
            const spinRotations = 5; // Base rotations
            const extraRotations = Math.random() * 3; // Random extra rotations
            const targetAngle = 360 - (prizeIndex * segAngle + segAngle / 2); // Center the pointer
            const totalRotation = (spinRotations + extraRotations) * 360 + targetAngle;
            const newRotation = currentRotationRef.current + totalRotation;

            if (wheelRef.current) {
                wheelRef.current.style.transition = "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)";
                wheelRef.current.style.transform = `rotate(${newRotation}deg)`;
            }
            currentRotationRef.current = newRotation;

            // Wait for animation to finish
            await new Promise<void>((resolve) => setTimeout(resolve, 4000));

            // --- Update Firestore and State ---
            const uid = user.uid;
            const userRef = doc(db, "users", uid);

            // ✅ 1. Deduct points using increment() to prevent race condition
            await updateDoc(userRef, { 
                points: increment(-DEFAULT_SPIN_COST) 
            });
            
            // Update local state
            setPoints(prev => Math.max(0, (prev ?? 0) - DEFAULT_SPIN_COST));

            // 2. ✅ Save to History Subcollection
            const ticketId = generateTicketId();
            const historyEntry: Omit<HistoryItem, 'id'> = { // Data to save (without id)
                prize: winningPrize,
                emoji: winningEmoji,
                timestamp: Date.now(), // Use current timestamp
                ticketId: ticketId,
                claimed: false, // เพิ่ม: ยังไม่ได้เคลมรางวัล
            };

            const historyCollectionRef = collection(db, "users", uid, "history");
            const newHistoryDocRef = await addDoc(historyCollectionRef, historyEntry);
            console.log("History saved with ID:", newHistoryDocRef.id); // Debug log

            // 3. Update local history state (add new item to the top, keep limit)
            setHistory(prev => [{ ...historyEntry, id: newHistoryDocRef.id }, ...prev].slice(0, 20));


            // 4. Show prize modal
            setWonPrize({ label: winningPrize, emoji: winningEmoji ?? "🎁" });
            setShowPrizeModal(true);

        } catch (e: any) {
            console.error("Error during spin or saving history:", e);
             // Attempt to update local history even if DB fails, so user sees the prize
            // (You might want more robust error handling, e.g., trying to refund points if history save fails)
            // For now, just alert the user.
            alert("เกิดข้อผิดพลาดขณะหมุนหรือบันทึกประวัติ: " + (e instanceof Error ? e.message : String(e)));
             // Consider adding the won prize to local history even on error?
             // const ticketId = generateTicketId();
             // const histItem: HistoryItem = { prize: wonPrize?.label || "Unknown", emoji: wonPrize?.emoji || "🎁", timestamp: Date.now(), ticketId };
             // setHistory(prev => [histItem, ...prev].slice(0, 20));
             // setShowPrizeModal(true); // Still show the prize modal
        } finally {
            setIsSpinning(false); // Allow spinning again
        }
    }

    // --- JSX Rendering ---
    return (
        <>
            <div className="min-h-screen pb-28 relative overflow-hidden">
                {/* Background */}
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/art/game-bg.png')" }}
                />
                <div className="absolute inset-0 bg-red-900/40" />
                
                {/* Fireworks */}
                <div className="fireworks-container">
                    <div className="firework firework-1"></div>
                    <div className="firework firework-2"></div>
                    <div className="firework firework-3"></div>
                </div>

                <div className="relative z-10 p-4 md:p-6">
                    <div className="max-w-6xl mx-auto">
                        {/* Header */}
                        <div className="text-center mb-4 animate-fade-in">
                            <img 
                                src="/logo.jpg" 
                                alt="Logo" 
                                className="mx-auto w-14 md:w-16 rounded-xl shadow-lg mb-2 border-2 border-white/50"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/art/logo.png'; }}
                            />
                            <h1 className="text-2xl md:text-3xl text-white font-bold mb-1 drop-shadow-lg">
                                🎡 วงล้อมหาสนุก
                            </h1>
                            <p className="text-white/90 text-sm">
                                ใช้ <span className="text-yellow-300 font-bold">{DEFAULT_SPIN_COST}</span> แต้มต่อครั้ง
                            </p>
                        </div>

                        {/* Login Prompt */}
                        {!user && (
                            <div className="mb-4 p-3 bg-amber-500/80 border border-amber-400 rounded-xl text-center animate-fade-in">
                                <p className="text-white text-sm font-medium">⚠️ กรุณาเข้าสู่ระบบเพื่อเล่นเกม</p>
                            </div>
                        )}

                        {/* Main Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Left: White Box with Wheel + Points + Prizes */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-3xl p-6 shadow-2xl">
                                    {/* Wheel */}
                                    <div className="flex justify-center mb-4">
                                        <GameWheel
                                            prizes={prizes}
                                            isSpinning={isSpinning}
                                            onSpin={handleSpin}
                                            disabled={isSpinning || !user || (points ?? 0) < DEFAULT_SPIN_COST}
                                            wheelRef={wheelRef as RefObject<HTMLDivElement>}
                                        />
                                    </div>
                                    
                                    {/* Points Display - Under Wheel */}
                                    <div className="flex justify-center mb-6">
                                        <div className="bg-gradient-to-r from-amber-400 to-yellow-500 rounded-2xl px-8 py-3 shadow-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow">
                                                    <span className="text-2xl">💰</span>
                                                </div>
                                                <div className="text-white">
                                                    <p className="text-xs font-medium opacity-90">คะแนนของคุณ</p>
                                                    <p className="text-2xl font-black">{points ?? 0} <span className="text-sm font-bold">แต้ม</span></p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="border-t border-gray-200 my-4"></div>
                                    
                                    {/* Prize Legend */}
                                    <div>
                                        <h3 className="text-gray-800 font-bold text-center mb-3 flex items-center justify-center gap-2">
                                            <span>🎁</span>
                                            <span>รายการของรางวัล</span>
                                            <span>🎁</span>
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {prizes.map((p, i) => (
                                                <div 
                                                    key={i} 
                                                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100 hover:bg-red-50 hover:border-red-200 transition-colors"
                                                >
                                                    <div 
                                                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs shadow"
                                                        style={{ backgroundColor: p.color }}
                                                    >
                                                        {i + 1}
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                                        <span className="text-lg">{p.emoji}</span>
                                                        <span className="text-gray-700 font-medium text-xs truncate">{p.label}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: User Info + History */}
                            <div className="space-y-4">
                                <UserSummary user={user} points={points} />
                                <HistoryList
                                    history={history}
                                    onSelect={(item) => { setSelectedTicket(item); setShowTicketModal(true); }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <BottomNav />

            {/* Modals */}
            <PrizeModal show={showPrizeModal} wonPrize={wonPrize} onClose={() => setShowPrizeModal(false)} />
            <TicketModal show={showTicketModal} selectedTicket={selectedTicket} onClose={() => setShowTicketModal(false)} />
        </>
    );
}