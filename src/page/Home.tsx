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
                            สวัสดี, {user.displayName?.split(' ')[0]}
                        </h1>
                        <p className="text-white/80 text-sm">ยินดีต้อนรับสู่ EG'OKE 2025</p>
                    </div>

                    {/* Quick Actions Cards - 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div 
                            onClick={() => navigate('/game')}
                            className="relative overflow-hidden bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 p-4 rounded-2xl text-white cursor-pointer shadow-lg transition-all active:scale-95 border border-red-500/50"
                            style={{ backgroundImage: "url('/art/game-bg.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundBlendMode: 'overlay' }}
                        >
                            <div className="relative z-10">
                                <svg className="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                                    <path d="M12 2 L12 22 M2 12 L22 12" stroke="currentColor" strokeWidth="1"/>
                                </svg>
                                <h3 className="font-bold text-shadow">หมุนวงล้อ</h3>
                                <p className="text-white/90 text-xs">ลุ้นรางวัลสุดพิเศษ</p>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>
                        <div 
                            onClick={() => navigate('/vote')}
                            className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 p-4 rounded-2xl text-white cursor-pointer shadow-lg transition-all active:scale-95 border border-amber-400/50"
                            style={{ backgroundImage: "url('/art/market.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundBlendMode: 'overlay' }}
                        >
                            <div className="relative z-10">
                                <svg className="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
                                </svg>
                                <h3 className="font-bold text-shadow">โหวต</h3>
                                <p className="text-white/90 text-xs">เลือกศิลปินที่ชื่นชอบ</p>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>
                        <div 
                            onClick={() => navigate('/vap-ig')}
                            className="relative overflow-hidden bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 p-4 rounded-2xl text-white cursor-pointer shadow-lg transition-all active:scale-95 border border-purple-500/50"
                            style={{ backgroundImage: "url('/art/2025.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundBlendMode: 'overlay' }}
                        >
                            <div className="relative z-10">
                                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                                </svg>
                                <h3 className="font-bold text-shadow">สแกน QR</h3>
                                <p className="text-white/90 text-xs">รับแต้มสะสม</p>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>
                        <div 
                            onClick={() => navigate('/profile')}
                            className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 p-4 rounded-2xl text-white cursor-pointer shadow-lg transition-all active:scale-95 border border-emerald-500/50"
                            style={{ backgroundImage: "url('/art/final.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundBlendMode: 'overlay' }}
                        >
                            <div className="relative z-10">
                                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                                <h3 className="font-bold text-shadow">โปรไฟล์</h3>
                                <p className="text-white/90 text-xs">ดูข้อมูลของคุณ</p>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>
                    </div>

                    {/* Event Info Card */}
                    <div className="bg-white/95 rounded-2xl p-5 shadow-xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                            </svg>
                            <h2 className="text-lg font-bold text-gray-800">กิจกรรมที่กำลังจะมาถึง</h2>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                                <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                                </svg>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">เวที Karaoke</p>
                                    <p className="text-xs text-gray-500">ร้องเพลงญี่ปุ่นกับเพื่อนๆ</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                <svg className="w-6 h-6 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>
                                </svg>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">ถนนอาหารญี่ปุ่น</p>
                                    <p className="text-xs text-gray-500">อร่อยครบทุกรส</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                                <svg className="w-6 h-6 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M15 16c.69 0 1.25.56 1.25 1.25S15.69 18.5 15 18.5s-1.25-.56-1.25-1.25.56-1.25 1.25-1.25zm-6 0c.69 0 1.25.56 1.25 1.25S9.69 18.5 9 18.5 7.75 17.94 7.75 17.25 8.31 16 9 16zm-.48-4.97l1.46 3.48c.22.52.49.99.74 1.39.25-.4.52-.87.74-1.39l1.46-3.48c.07-.17-.06-.38-.25-.38H8.77c-.19 0-.32.21-.25.38zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                                </svg>
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
                            <div className="flex justify-center gap-3 mb-3">
                                <svg className="w-8 h-8 text-red-600 animate-bounce-soft" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                                </svg>
                                <svg className="w-8 h-8 text-amber-600 animate-bounce-soft" style={{ animationDelay: '0.1s' }} fill="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10"/>
                                </svg>
                                <svg className="w-8 h-8 text-purple-600 animate-bounce-soft" style={{ animationDelay: '0.2s' }} fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 mb-2">ยินดีต้อนรับ!</h2>
                            <p className="text-gray-600 text-sm mb-4">ขอบคุณที่เข้าร่วมงาน EG'OKE 2025<br/>มาสนุกกับกิจกรรมมากมายกันเถอะ!</p>

                            <button
                                onClick={() => { handleModalClose(); navigate('/game'); }}
                                className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-bold shadow-lg transition-all active:scale-95 mb-3"
                            >
                                เริ่มหมุนวงล้อ
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
