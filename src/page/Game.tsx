import { useEffect, useMemo, useRef, useState, type RefObject } from "react"
import BottomNav from "../components/BottomNav"
import { auth, db } from "../firebaseApp"
import { onAuthStateChanged } from "firebase/auth"
import type { User } from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, query, orderBy, limit, getDocs } from "firebase/firestore"

import GameWheel from "../components/GameWheel"
import PointsCard from "../components/PointsCard"
import UserSummary from "../components/UserSummary"
import HistoryList from "../components/HistoryList"
import PrizeModal from "../components/PrizeModal"
import TicketModal from "../components/TicketModal"

type HistoryItem = {
    id?: string
    prize: string
    emoji?: string
    timestamp: number
    ticketId?: string
}

const DEFAULT_SPIN_COST = 20

export default function Game() {
    const [user, setUser] = useState<User | null>(null)
    const [points, setPoints] = useState<number | null>(null)
    const [history, setHistory] = useState<HistoryItem[]>([])
    const [isSpinning, setIsSpinning] = useState(false)
    const [showPrizeModal, setShowPrizeModal] = useState(false)
    const [wonPrize, setWonPrize] = useState<{ label: string; emoji: string } | null>(null)
    const [selectedTicket, setSelectedTicket] = useState<HistoryItem | null>(null)
    const [showTicketModal, setShowTicketModal] = useState(false)

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
            if (e?.code === 'permission-denied') setPoints(0)
        }
    }

    async function loadHistory(uid: string) {
        try {
            const hcol = collection(db, "users", uid, "history")
            const q = query(hcol, orderBy("timestamp", "desc"), limit(20))
            const snaps = await getDocs(q)
            const items: HistoryItem[] = snaps.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
            setHistory(items)
        } catch (e: any) {
            console.error("loadHistory error", e)
            if (e?.code === 'permission-denied') setHistory([])
        }
    }

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
            currentRotationRef.current = newRotation

            await new Promise<void>((resolve) => setTimeout(resolve, 4000))

            const uid = user.uid
            const userRef = doc(db, "users", uid)

            try {
                const newPoints = Math.max(0, (points ?? 0) - DEFAULT_SPIN_COST)
                await updateDoc(userRef, { points: newPoints })
                setPoints(newPoints)

                const ticketId = generateTicketId()
                const histItem: HistoryItem = { prize, emoji: prizeEmoji, timestamp: Date.now(), ticketId }

                const hcol = collection(db, "users", uid, "history")
                const docRef = await addDoc(hcol, histItem)
                setHistory(prev => [{ ...histItem, id: docRef.id }, ...prev].slice(0, 20))
            } catch (dbError: any) {
                console.error("DB error", dbError)
                const ticketId = generateTicketId()
                const histItem: HistoryItem = { prize, emoji: prizeEmoji, timestamp: Date.now(), ticketId }
                setHistory(prev => [histItem, ...prev].slice(0, 20))
            }

            setWonPrize({ label: prize, emoji: prizeEmoji ?? "🎁" })
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
                                <p className="text-yellow-200 text-sm">⚠️ กรุณาเข้าสู่ระบบเพื่อเล่นเกมและบันทึกคะแนน</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                            <div className="flex flex-col items-center gap-8">
                                <GameWheel prizes={prizes} isSpinning={isSpinning} onSpin={handleSpin} disabled={isSpinning || !user || (points ?? 0) < DEFAULT_SPIN_COST} wheelRef={wheelRef as RefObject<HTMLDivElement>} />
                                <PointsCard points={points} />
                            </div>

                            <div className="text-left text-white px-2 sm:px-0">
                                <UserSummary user={user} points={points} />
                                <HistoryList history={history} onSelect={(item) => { setSelectedTicket(item); setShowTicketModal(true) }} />

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
                                    <span key={i} className="inline-flex items-center gap-1.5 bg-gradient-to-br from-white/15 to-white/5 px-3 py-1.5 rounded-full text-xs border border-white/20">
                                        <span className="text-base">{(p as any).emoji}</span>
                                        <span className="font-semibold text-white">{(p as any).label}</span>
                                    </span>
                                ))}
                            </div>
                            <div className="mt-3 text-[0.65rem] text-gray-400">หมุนวงล้อเพื่อลุ้นรับของรางวัลพิเศษ!</div>
                        </div>
                    </div>
                </div>
            </div>

            <BottomNav />

            <PrizeModal show={showPrizeModal} wonPrize={wonPrize} onClose={() => setShowPrizeModal(false)} />
            <TicketModal show={showTicketModal} selectedTicket={selectedTicket} onClose={() => setShowTicketModal(false)} />
        </>
    )
}
