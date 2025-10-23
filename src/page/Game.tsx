import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import BottomNav from "../components/BottomNav";
import { auth, db } from "../firebaseApp"; // Make sure db is correctly initialized Firestore instance
import { onAuthStateChanged, type User } from "firebase/auth";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    addDoc, // Used to add new history documents
    query,
    orderBy,
    limit,
    getDocs,
    Timestamp // Import Timestamp for potential use later, though Date.now() works
} from "firebase/firestore";

import GameWheel from "../components/GameWheel";
import PointsCard from "../components/PointsCard";
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

    // Prize definitions (no changes needed here)
    const prizes = useMemo(
        () => [
            { label: "ตั๋วกิจกรรมฟรี", emoji: "🎫", color: "#dc2626", probability: 15 },
            { label: "ตั๋วโหวตฟรี", emoji: "🗳️", color: "#ef4444", probability: 15 },
            { label: "ขนมกรุบกรอบ", emoji: "🍿", color: "#dc2626", probability: 20 },
            { label: "ตุ๊กตาไซส์เล็ก", emoji: "🧸", color: "#ef4444", probability: 20 },
            { label: "ตุ๊กตากลาง", emoji: "🧸🧸", color: "#dc2626", probability: 15 },
            { label: "ตุ๊กตาใหญ่", emoji: "🧸🧸🧸", color: "#ef4444", probability: 5 },
            { label: "สมุดโน้ต", emoji: "📓", color: "#dc2626", probability: 20 },
            { label: "ยางมัดผม", emoji: "🎀", color: "#ef4444", probability: 20 },
            { label: "ขนมสปอนเซอร์", emoji: "🍬", color: "#dc2626", probability: 10 },
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

            // 1. Deduct points
            const newPoints = Math.max(0, (points ?? 0) - DEFAULT_SPIN_COST);
            await updateDoc(userRef, { points: newPoints });
            setPoints(newPoints); // Update local state immediately

            // 2. ✅ Save to History Subcollection
            const ticketId = generateTicketId();
            const historyEntry: Omit<HistoryItem, 'id'> = { // Data to save (without id)
                prize: winningPrize,
                emoji: winningEmoji,
                timestamp: Date.now(), // Use current timestamp
                ticketId: ticketId,
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
            <div className="min-h-screen pb-28" style={{ backgroundImage: "url('/Artwork.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="p-6 text-center bg-black/30 backdrop-blur-sm">
                    <div className="max-w-4xl mx-auto p-6 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md shadow-xl">
                        {/* Header and Logo */}
                        <img src="/Logo_eg'oke.jpg" alt="Logo" className="mx-auto w-28 md:w-36 rounded-full shadow-xl mb-4 border-4 border-white/20" />
                        <h1 className="text-2xl md:text-3xl text-white font-extrabold mb-1">เกมวงล้อสุ่มของรางวัล</h1>
                        <p className="text-sm md:text-base text-gray-200 mb-4">ใช้แต้มเพื่อหมุน (แต่ละครั้งจะหัก {DEFAULT_SPIN_COST} แต้ม)</p>

                        {/* Login Prompt */}
                        {!user && (
                            <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                                <p className="text-yellow-200 text-sm">⚠️ กรุณาเข้าสู่ระบบเพื่อเล่นเกมและบันทึกคะแนน</p>
                            </div>
                        )}

                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                            {/* Left Column: Wheel and Points */}
                            <div className="flex flex-col items-center gap-8">
                                <GameWheel
                                    prizes={prizes}
                                    isSpinning={isSpinning}
                                    onSpin={handleSpin}
                                    disabled={isSpinning || !user || (points ?? 0) < DEFAULT_SPIN_COST}
                                    wheelRef={wheelRef as RefObject<HTMLDivElement>}
                                />
                                <PointsCard points={points} />
                            </div>

                            {/* Right Column: User Summary and History */}
                            <div className="text-left text-white px-2 sm:px-0">
                                <UserSummary user={user} points={points} />
                                <HistoryList
                                    history={history}
                                    onSelect={(item) => { setSelectedTicket(item); setShowTicketModal(true); }}
                                />
                            </div>
                        </div>

                        {/* Prize Legend */}
                        <div className="mt-6 text-center text-white/80 text-xs md:text-sm bg-gradient-to-r from-black/20 via-black/30 to-black/20 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                            <div className="font-bold mb-3 flex items-center justify-center gap-2 text-sm md:text-base">
                                <span className="text-xl">🎁</span>
                                <span>รางวัลบนวงล้อ</span>
                                <span className="text-xl">🎁</span>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                {prizes.map((p, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 bg-gradient-to-br from-white/15 to-white/5 px-3 py-1.5 rounded-full text-xs border border-white/20">
                                        <span className="text-base">{p.emoji}</span>
                                        <span className="font-semibold text-white">{p.label}</span>
                                    </span>
                                ))}
                            </div>
                            <div className="mt-3 text-[0.65rem] text-gray-400">หมุนวงล้อเพื่อลุ้นรับของรางวัลพิเศษ!</div>
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