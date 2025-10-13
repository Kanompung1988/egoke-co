import { useEffect, useMemo, useRef, useState } from "react"
import BottomNav from "../components/BottomNav"
import { auth, db } from "../firebaseApp"
import { onAuthStateChanged } from "firebase/auth"
import type { User } from "firebase/auth"
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    getDocs,
} from "firebase/firestore"

type HistoryItem = {
    id?: string
    prize: string
    emoji?: string
    timestamp: number
    ticketId?: string
}

const DEFAULT_SPIN_COST = 20 // points to deduct per spin (can be changed)

export default function Game() {
    const [user, setUser] = useState<User | null>(null)
    const [points, setPoints] = useState<number | null>(null)
    const [history, setHistory] = useState<HistoryItem[]>([])
    const [isSpinning, setIsSpinning] = useState(false)
    const [showPrizeModal, setShowPrizeModal] = useState(false)
    const [wonPrize, setWonPrize] = useState<{ label: string; emoji: string } | null>(null)
    const [selectedTicket, setSelectedTicket] = useState<HistoryItem | null>(null)
    const [showTicketModal, setShowTicketModal] = useState(false)

    // wheel refs
    const wheelRef = useRef<HTMLDivElement | null>(null)
    const currentRotationRef = useRef<number>(0)

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
    )

    useEffect(() => {
        const un = onAuthStateChanged(auth, async (u: User | null) => {
            setUser(u)
            if (u) {
                await loadUserPoints(u.uid)
                await loadHistory(u.uid)
            } else {
                setPoints(null)
                setHistory([])
            }
        })
        return () => un()
    }, [])

    async function loadUserPoints(uid: string) {
        try {
            const userRef = doc(db, "users", uid)
            const snap = await getDoc(userRef)
            if (snap.exists()) {
                const data = snap.data() as any
                setPoints(typeof data.points === "number" ? data.points : 0)
            } else {
                // no user doc: create minimal with current user data
                const currentUser = auth.currentUser
                await setDoc(doc(db, "users", uid), {
                    uid,
                    displayName: currentUser?.displayName ?? "Anonymous",
                    email: currentUser?.email ?? "",
                    photoURL: currentUser?.photoURL ?? "",
                    points: 0,
                })
                setPoints(0)
            }
        } catch (e: any) {
            console.error("loadUserPoints error", e)
            // If permission error, set default points
            if (e?.code === 'permission-denied') {
                setPoints(0)
            }
        }
    }

    async function loadHistory(uid: string) {
        try {
            const hcol = collection(db, "users", uid, "history")
            const q = query(hcol, orderBy("timestamp", "desc"), limit(20))
            const snaps = await getDocs(q)
            const items: HistoryItem[] = snaps.docs.map((d) => ({
                id: d.id,
                ...(d.data() as any),
            }))
            setHistory(items)
        } catch (e: any) {
            console.error("loadHistory error", e)
            // If permission error, just show empty history
            if (e?.code === 'permission-denied') {
                setHistory([])
            }
        }
    }

    // generate a simple ticket id
    function generateTicketId() {
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    }

    async function handleSpin() {
        if (!user) {
            alert("กรุณาเข้าสู่ระบบก่อนเล่น")
            return
        }
        if (isSpinning) return
        if (points === null) return
        if (points < DEFAULT_SPIN_COST) {
            alert("คะแนนไม่เพียงพอสำหรับหมุน")
            return
        }

        setIsSpinning(true)

        try {
            // Pick prize based on probability (weighted random)
            const totalProbability = prizes.reduce((sum, p) => sum + (p.probability || 1), 0)
            const randomNum = Math.random() * totalProbability
            let cumulativeProbability = 0
            let prizeIndex = 0
            
            for (let i = 0; i < prizes.length; i++) {
                cumulativeProbability += prizes[i].probability || 1
                if (randomNum <= cumulativeProbability) {
                    prizeIndex = i
                    break
                }
            }
            
            const prizeObj = prizes[prizeIndex]
            const prize = prizeObj.label
            const prizeEmoji = prizeObj.emoji

            console.log("🎯 Spin initiated:", { 
                prizeIndex, 
                prize, 
                emoji: prizeEmoji,
                totalPrizes: prizes.length 
            })

  
            const segAngle = 360 / prizes.length
            const spinRotations = 5 
            const extraRotations = Math.random() * 3 
  
            const targetAngle = 360 - (prizeIndex * segAngle + segAngle / 2)
            const totalRotation = (spinRotations + extraRotations) * 360 + targetAngle
            const newRotation = currentRotationRef.current + totalRotation

            if (wheelRef.current) {
                wheelRef.current.style.transition = "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
                wheelRef.current.style.transform = `rotate(${newRotation}deg)`
            }

            // Update rotation reference
            currentRotationRef.current = newRotation

            // wait for animation to complete
            await new Promise<void>((resolve) => {
                setTimeout(() => {
                    resolve()
                }, 4000)
            })

            // deduct points and write history + ticket
            const uid = user.uid
            const userRef = doc(db, "users", uid)

            try {
                // optimistic update
                const newPoints = Math.max(0, (points ?? 0) - DEFAULT_SPIN_COST)
                await updateDoc(userRef, { points: newPoints })
                setPoints(newPoints)

                const ticketId = generateTicketId()
                const histItem: HistoryItem = {
                    prize,
                    emoji: prizeEmoji,
                    timestamp: Date.now(),
                    ticketId,
                }

                // Save ticket to database history
                const hcol = collection(db, "users", uid, "history")
                const docRef = await addDoc(hcol, histItem)
                console.log("✅ Ticket saved to database:", { 
                    id: docRef.id, 
                    ticketId, 
                    prize, 
                    emoji: prizeEmoji,
                    timestamp: new Date(histItem.timestamp).toLocaleString('th-TH')
                })

                // Update local history immediately for better UX
                setHistory(prevHistory => [
                    { ...histItem, id: docRef.id },
                    ...prevHistory
                ].slice(0, 20)) // Keep only last 20 items
            } catch (dbError: any) {
                console.error("❌ Database error:", dbError)
          
                if (dbError?.code === 'permission-denied') {
                    console.warn("⚠️ Permission denied for database write, showing prize anyway")
                    const ticketId = generateTicketId()
                    const histItem: HistoryItem = {
                        prize,
                        emoji: prizeEmoji,
                        timestamp: Date.now(),
                        ticketId,
                    }
                    setHistory(prevHistory => [histItem, ...prevHistory].slice(0, 20))
                } else {
                    // For other errors, still try to show the prize
                    const ticketId = generateTicketId()
                    const histItem: HistoryItem = {
                        prize,
                        emoji: prizeEmoji,
                        timestamp: Date.now(),
                        ticketId,
                    }
                    setHistory(prevHistory => [histItem, ...prevHistory].slice(0, 20))
                }
            }

            // Show prize modal
            setWonPrize({ label: prize, emoji: prizeEmoji })
            setShowPrizeModal(true)
        } catch (e: any) {
            console.error("spin error", e)
            alert("เกิดข้อผิดพลาดขณะหมุน: " + (e instanceof Error ? e.message : String(e)))
        } finally {
            setIsSpinning(false)
        }
    }

    return (
        <>
            <div className="min-h-screen pb-28" style={{ backgroundImage: "url('/Artwork.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="p-6 text-center bg-black/30 backdrop-blur-sm">
                    <div className="max-w-4xl mx-auto p-6 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md shadow-xl">
                        <img src="/Logo_eg'oke.jpg" alt="Logo" className="mx-auto w-28 md:w-36 rounded-full shadow-xl mb-4 border-4 border-white/20" />
                        <h1 className="text-2xl md:text-3xl text-white font-extrabold mb-1">เกมวงล้อสุ่มของรางวัล</h1>
                        <p className="text-sm md:text-base text-gray-200 mb-4">ใช้แต้มเพื่อหมุน (แต่ละครั้งจะหัก {DEFAULT_SPIN_COST} แต้ม)</p>

                        {!user && (
                            <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                                <p className="text-yellow-200 text-sm">
                                    ⚠️ กรุณาเข้าสู่ระบบเพื่อเล่นเกมและบันทึกคะแนน
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                            <div className="flex flex-col items-center gap-8">
                                {/* Wheel Container */}
                                <div className="relative w-full max-w-[500px] aspect-square">
                                    {/* Wheel */}
                                    <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: "1000px" }}>
                                        <div className="relative w-[90%] aspect-square">
                                            {/* Wheel border with white dots effect */}
                                            <div className="absolute inset-0 -m-3 rounded-full bg-gradient-to-br from-red-600 to-red-700 border-[8px] border-white shadow-[0_0_0_4px_#dc2626,0_8px_32px_rgba(0,0,0,0.3)]" />

                                            {/* Wheel */}
                                            <div
                                                ref={wheelRef}
                                                className="relative w-full h-full rounded-full overflow-hidden shadow-2xl"
                                                style={{
                                                    transition: isSpinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
                                                }}
                                            >
                                                {/* Segments */}
                                                {prizes.map((prize, index) => {
                                                    const segAngle = 360 / prizes.length
                                                    const angle = index * segAngle
                                                    return (
                                                        <div
                                                            key={index}
                                                            className="absolute w-full h-full"
                                                            style={{
                                                                transform: `rotate(${angle}deg)`,
                                                                clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((segAngle * Math.PI) / 180)}% ${
                                                                    50 - 50 * Math.cos((segAngle * Math.PI) / 180)
                                                                }%)`,
                                                                backgroundColor: prize.color,
                                                            }}
                                                        >
                                                            {/* Prize label - แนวนอนตามช่อง */}
                                                            <div
                                                                className="absolute left-1/2 top-[20%] -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none"
                                                                style={{
                                                                    transform: `rotate(${segAngle / 2}deg)`,
                                                                }}
                                                            >
                                                                <div className="text-2xl md:text-3xl">
                                                                    {prize.emoji}
                                                                </div>
                                                                <div className="px-2 py-1 rounded-lg bg-white/95 shadow-lg">
                                                                    <span className="text-gray-900 font-bold text-[9px] md:text-[10px] whitespace-nowrap">
                                                                        {prize.label}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}

                                                {/* Segment dividers */}
                                                {prizes.map((_, index) => (
                                                    <div
                                                        key={`divider-${index}`}
                                                        className="absolute w-full h-full"
                                                        style={{
                                                            transform: `rotate(${index * (360 / prizes.length)}deg)`,
                                                        }}
                                                    >
                                                        <div className="absolute left-1/2 w-[2px] h-1/2 bg-white/50 origin-bottom" />
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Fixed arrow pointer at top */}
                                            <div className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none" style={{ top: "-25px" }}>
                                                <div className="flex flex-col items-center">
                                                    <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-yellow-400 drop-shadow-xl" />
                                                    <div className="w-6 h-6 bg-yellow-400 rounded-full shadow-xl -mt-1" />
                                                </div>
                                            </div>

                                            {/* Center button */}
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <button
                                                    onClick={handleSpin}
                                                    disabled={isSpinning || !user || (points ?? 0) < DEFAULT_SPIN_COST}
                                                    className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-500 shadow-2xl flex flex-col items-center justify-center font-black text-3xl md:text-4xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all duration-300 pointer-events-auto z-10 relative"
                                                    style={{
                                                        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5), inset 0 -8px 16px rgba(0, 0, 0, 0.3), inset 0 8px 16px rgba(255, 255, 255, 0.5)",
                                                        textShadow: "0 3px 6px rgba(0, 0, 0, 0.6)",
                                                    }}
                                                >
                                                    <span className="tracking-wider">
                                                        {isSpinning ? "..." : "SPIN"}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Points Display */}
                                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-xl flex items-center gap-4">
                                    <span className="text-3xl">💰</span>
                                    <div>
                                        <p className="text-xs text-gray-300">คะแนนของคุณ</p>
                                        <p className="text-2xl font-black text-white">{points ?? 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="text-left text-white px-2 sm:px-0">
                                <div className="mb-4 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="relative">
                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-white/20 to-white/10 border-2 border-white/30 overflow-hidden shadow-lg">
                                                {user?.photoURL ? (
                                                    <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                ) : (
                                                    <img src="/Logo_eg'oke.jpg" alt="avatar" className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white"></div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs text-gray-300 mb-1">👤 ผู้เล่น</div>
                                            <div className="text-lg md:text-xl font-bold text-white truncate">{user?.displayName ?? 'Guest'}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg p-3 shadow-lg">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">💰</span>
                                            <div>
                                                <div className="text-xs text-orange-900 font-medium">คะแนนของคุณ</div>
                                                <div className="text-2xl font-extrabold text-orange-900">{points ?? 0}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-orange-800 bg-white/30 px-2 py-1 rounded-md">
                                            แต้ม
                                        </div>
                                    </div>
                                </div>

                                {/* History Section */}
                                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
                                    <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                                        <span>📜</span>
                                        <span>ประวัติการหมุน</span>
                                    </h2>
                                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scroll-smooth">
                                        {history.length === 0 ? (
                                            <div className="text-center text-gray-300 py-8 bg-white/5 rounded-xl border border-white/10">
                                                <div className="text-5xl mb-3 opacity-50">🎁</div>
                                                <p className="font-semibold">ยังไม่มีประวัติการหมุน</p>
                                                <p className="text-xs text-gray-400 mt-1">หมุนวงล้อเพื่อรับรางวัลกันเลย!</p>
                                            </div>
                                        ) : (
                                            history.map((result, index) => (
                                                <div
                                                    key={result.id ?? result.timestamp}
                                                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-300 animate-slide-in-left cursor-pointer"
                                                    style={{ animationDelay: `${index * 0.05}s` }}
                                                    onClick={() => {
                                                        setSelectedTicket(result)
                                                        setShowTicketModal(true)
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-3xl">{result.emoji}</div>
                                                        <div className="flex-1">
                                                            <p className="font-bold text-white">{result.prize}</p>
                                                            <p className="text-xs text-gray-400">
                                                                {new Date(result.timestamp).toLocaleTimeString("th-TH")}
                                                            </p>
                                                        </div>
                                                        {result.ticketId && (
                                                            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full border border-green-400/30 font-bold">
                                                                ✓ มีตั๋ว
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-6 text-center text-white/80 text-xs md:text-sm bg-gradient-to-r from-black/20 via-black/30 to-black/20 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                            <div className="font-bold mb-3 flex items-center justify-center gap-2 text-sm md:text-base">
                                <span className="text-xl">🎁</span>
                                <span>รางวัลบนวงล้อ</span>
                                <span className="text-xl">🎁</span>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                {prizes.map((p, i) => (
                                    <span 
                                        key={i} 
                                        className="inline-flex items-center gap-1.5 bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 px-3 py-1.5 rounded-full text-xs border border-white/20 transition-all hover:scale-105 hover:shadow-lg"
                                        style={{
                                            animationDelay: `${i * 100}ms`
                                        }}
                                    >
                                        <span className="text-base">{(p as any).emoji}</span>
                                        <span className="font-semibold text-white">{(p as any).label}</span>
                                    </span>
                                ))}
                            </div>
                            <div className="mt-3 text-[0.65rem] text-gray-400">
                                หมุนวงล้อเพื่อลุ้นรับของรางวัลพิเศษ!
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <BottomNav />

            {/* Result Modal */}
            {showPrizeModal && wonPrize && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setShowPrizeModal(false)}>
                    <div className="bg-gradient-to-br from-yellow-300 via-orange-300 to-red-400 border-2 border-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-in text-center space-y-6" onClick={(e) => e.stopPropagation()}>
                        <div className="text-7xl sm:text-8xl animate-bounce inline-block">{wonPrize.emoji}</div>
                        <div className="space-y-2">
                            <h3 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                                ยินดีด้วย! 🎉
                            </h3>
                            <p className="text-xl sm:text-2xl font-bold text-white" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.3)'}}>
                                คุณได้รับ
                            </p>
                            <p className="text-3xl sm:text-4xl font-black text-white" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.3)'}}>
                                {wonPrize.label}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowPrizeModal(false)}
                            className="w-full py-4 rounded-xl bg-white hover:bg-gray-100 font-bold text-lg text-orange-600 shadow-lg transition-all duration-300 hover:scale-105"
                        >
                            ปิด ✓
                        </button>
                    </div>
                </div>
            )}

            {/* Ticket Modal */}
            {showTicketModal && selectedTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fadeIn" onClick={() => setShowTicketModal(false)}>
                    <div className="bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-scaleIn relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {/* Decorative elements */}
                        <div className="absolute top-0 left-0 w-32 sm:w-40 h-32 sm:h-40 bg-white/20 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 right-0 w-32 sm:w-40 h-32 sm:h-40 bg-blue-200/30 rounded-full blur-3xl"></div>
                        
                        <div className="relative z-10">
                            {/* Close button */}
                            <button
                                onClick={() => setShowTicketModal(false)}
                                className="absolute top-0 right-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white text-lg sm:text-xl transition-colors"
                            >
                                ×
                            </button>

                            <div className="text-center mb-4 sm:mb-6">
                                <div className="inline-block px-4 py-1.5 sm:px-6 sm:py-2 bg-white/90 rounded-full shadow-lg mb-2 sm:mb-3">
                                    <h2 className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 flex items-center gap-2 justify-center">
                                        <span>🎫</span> ตั๋วรางวัล
                                    </h2>
                                </div>
                            </div>

                            {/* Ticket content */}
                            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl border-3 sm:border-4 border-white/50 mb-4 sm:mb-6">
                                <div className="text-5xl sm:text-6xl mb-3 sm:mb-4 text-center">{(selectedTicket as any).emoji ?? '🎁'}</div>
                                
                                <div className="text-center mb-3 sm:mb-4">
                                    <p className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-1 sm:mb-2">
                                        {selectedTicket.prize}
                                    </p>
                                    <div className="text-xs sm:text-sm text-gray-600">
                                        {new Date(selectedTicket.timestamp).toLocaleString('th-TH')}
                                    </div>
                                </div>

                                {/* Ticket ID */}
                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border-2 border-dashed border-purple-300">
                                    <div className="text-xs text-gray-600 mb-1 text-center font-semibold">รหัสตั๋ว</div>
                                    <div className="text-center font-mono text-sm sm:text-lg font-bold text-purple-700 break-all">
                                        {selectedTicket.ticketId}
                                    </div>
                                </div>

                                {/* QR Code placeholder */}
                                <div className="mt-3 sm:mt-4 bg-gray-100 rounded-lg sm:rounded-xl p-4 sm:p-6 flex items-center justify-center">
                                    <div className="w-36 h-36 sm:w-48 sm:h-48 bg-white rounded-lg shadow-inner flex items-center justify-center border-3 sm:border-4 border-gray-200">
                                        <div className="text-center">
                                            <div className="text-3xl sm:text-4xl mb-1 sm:mb-2">📱</div>
                                            <div className="text-xs text-gray-500">QR Code</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/30">
                                <p className="text-xs sm:text-sm text-white font-medium text-center">
                                    💡 แสดงตั๋วนี้ให้ทีมงานเพื่อรับของรางวัล
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
