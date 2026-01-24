import { useEffect, useState } from "react"
import { auth } from "../firebaseApp"
import { onAuthStateChanged } from "firebase/auth"
import type { User } from "firebase/auth"
import { useNavigate, useLocation } from "react-router-dom"
import BottomNav from "../components/BottomNav"

export default function Home() {
    const [user, setUser] = useState<User | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [hideOnClose, setHideOnClose] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
            if (!currentUser) {
                navigate("/")
            } else {
                setUser(currentUser)

                const sessionHide = sessionStorage.getItem("home_modal_hide_session") === "1"
                const justLoggedIn = !!(location.state && (location.state as any).justLoggedIn)

                if (justLoggedIn) {
                    setShowModal(true)
                    navigate(location.pathname, { replace: true, state: {} })
                } else {
                    if (!sessionHide) setShowModal(true)
                }
            }
        })
        return () => unsubscribe()
    }, [navigate, location])

    const handleModalClose = () => {
        if (hideOnClose) {
            sessionStorage.setItem("home_modal_hide_session", "1")
        }
        setShowModal(false)
        setHideOnClose(false)
    }

    if (!user) return null

    return (
        <>
            <BottomNav />
            <main className="min-h-screen flex flex-col items-center pt-6 pb-24 relative overflow-hidden">
                {/* Background - Red Theme */}
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/art/temple-bg.png')" }}
                />
                <div className="absolute inset-0 bg-red-900/30" />
                
                {/* Fireworks Animation */}
                <div className="fireworks-container">
                    <div className="firework firework-1"></div>
                    <div className="firework firework-2"></div>
                    <div className="firework firework-3"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 w-full max-w-lg px-4 animate-fade-in">
                    {/* Logo */}
                    <div className="text-center mb-6">
                        <img 
                            src="/logo.jpg" 
                            alt="EG'OKE Logo" 
                            className="w-20 h-20 mx-auto mb-3 rounded-2xl shadow-xl border-2 border-white/30"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = '/art/logo.png';
                            }}
                        />
                        <h1 className="text-2xl font-bold text-amber-400 mb-1">
                            สวัสดี, {user.displayName?.split(' ')[0]} 👋
                        </h1>
                        <p className="text-white/80 text-sm">ยินดีต้อนรับสู่ EG'OKE 2025</p>
                    </div>

                    {/* Quick Actions Cards - 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div 
                            onClick={() => navigate('/game')}
                            className="bg-red-600 hover:bg-red-700 p-4 rounded-2xl text-white cursor-pointer shadow-lg transition-all active:scale-95 border border-red-500/50"
                        >
                            <span className="text-2xl mb-1 block">🎡</span>
                            <h3 className="font-bold">หมุนวงล้อ</h3>
                            <p className="text-white/70 text-xs">ลุ้นรางวัลสุดพิเศษ</p>
                        </div>
                        <div 
                            onClick={() => navigate('/vote')}
                            className="bg-amber-500 hover:bg-amber-600 p-4 rounded-2xl text-white cursor-pointer shadow-lg transition-all active:scale-95 border border-amber-400/50"
                        >
                            <span className="text-2xl mb-1 block">🗳️</span>
                            <h3 className="font-bold">โหวต</h3>
                            <p className="text-white/70 text-xs">เลือกศิลปินที่ชื่นชอบ</p>
                        </div>
                        <div 
                            onClick={() => navigate('/vap-ig')}
                            className="bg-purple-600 hover:bg-purple-700 p-4 rounded-2xl text-white cursor-pointer shadow-lg transition-all active:scale-95 border border-purple-500/50"
                        >
                            <span className="text-2xl mb-1 block">📱</span>
                            <h3 className="font-bold">สแกน QR</h3>
                            <p className="text-white/70 text-xs">รับแต้มสะสม</p>
                        </div>
                        <div 
                            onClick={() => navigate('/profile')}
                            className="bg-emerald-600 hover:bg-emerald-700 p-4 rounded-2xl text-white cursor-pointer shadow-lg transition-all active:scale-95 border border-emerald-500/50"
                        >
                            <span className="text-2xl mb-1 block">👤</span>
                            <h3 className="font-bold">โปรไฟล์</h3>
                            <p className="text-white/70 text-xs">ดูข้อมูลของคุณ</p>
                        </div>
                    </div>

                    {/* Event Info Card */}
                    <div className="bg-white/95 rounded-2xl p-5 shadow-xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl">⛩️</span>
                            <h2 className="text-lg font-bold text-gray-800">กิจกรรมที่กำลังจะมาถึง</h2>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                                <span className="text-lg">🎤</span>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">เวที Karaoke</p>
                                    <p className="text-xs text-gray-500">ร้องเพลงญี่ปุ่นกับเพื่อนๆ</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                <span className="text-lg">🏮</span>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">ถนนอาหารญี่ปุ่น</p>
                                    <p className="text-xs text-gray-500">อร่อยครบทุกรส</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                                <span className="text-lg">🎭</span>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">Cosplay Contest</p>
                                    <p className="text-xs text-gray-500">ประกวดคอสเพลย์</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Home modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="max-w-sm w-full bg-white rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
                        <div className="relative">
                            <img src="/Home-modal.jpg" alt="EG'OKE Banner" className="w-full h-40 object-cover" />
                            <button
                                onClick={handleModalClose}
                                className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center shadow-lg"
                            >
                                ✕
                            </button>
                            <div className="absolute bottom-3 left-3 text-white">
                                <h2 className="text-xl font-bold drop-shadow-lg">EG'OKE 2025</h2>
                                <p className="text-white/90 text-xs">Japanese Festival</p>
                            </div>
                        </div>

                        <div className="p-5 text-center">
                            <div className="flex justify-center gap-2 mb-3">
                                <span className="text-xl animate-bounce-soft">🎌</span>
                                <span className="text-xl animate-bounce-soft" style={{ animationDelay: '0.1s' }}>⛩️</span>
                                <span className="text-xl animate-bounce-soft" style={{ animationDelay: '0.2s' }}>🏮</span>
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 mb-2">ยินดีต้อนรับ! 🎉</h2>
                            <p className="text-gray-600 text-sm mb-4">ขอบคุณที่เข้าร่วมงาน EG'OKE 2025<br/>มาสนุกกับกิจกรรมมากมายกันเถอะ!</p>

                            <button
                                onClick={() => { handleModalClose(); navigate('/game'); }}
                                className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-bold shadow-lg transition-all active:scale-95 mb-3"
                            >
                                🎡 เริ่มหมุนวงล้อ
                            </button>
                            
                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={hideOnClose}
                                        onChange={(e) => setHideOnClose(e.target.checked)}
                                        className="w-4 h-4 accent-red-500 rounded"
                                    />
                                    ไม่ต้องแสดงอีก
                                </label>
                                <button onClick={handleModalClose} className="text-gray-500 hover:text-gray-700">
                                    ปิด
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
