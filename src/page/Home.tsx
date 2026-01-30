import { useEffect, useState } from "react"
import { auth } from "../firebaseApp"
import { onAuthStateChanged } from "firebase/auth"
import type { User } from "firebase/auth"
import { useNavigate, useLocation } from "react-router-dom"
import BottomNav from "../components/BottomNav"
import { useAuth } from "../hooks/useAuth"

export default function Home() {
    const [user, setUser] = useState<User | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [hideOnClose, setHideOnClose] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()
    const { currentUser } = useAuth()

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
                    <div className="text-center mb-6 animate-fade-in-down">
                        <div className="relative inline-block">
                            <img 
                                src="/logo.jpg" 
                                alt="EG'OKE Logo" 
                                className="w-20 h-20 mx-auto mb-3 rounded-2xl shadow-xl border-2 border-white/30 animate-float"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/art/logo.png';
                                }}
                            />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full animate-ping"></div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full"></div>
                        </div>
                        <h1 className="text-2xl font-bold text-amber-400 mb-1 animate-fade-in">
                            สวัสดี, {user.displayName?.split(' ')[0]}
                        </h1>
                        <p className="text-white/80 text-sm">ยินดีต้อนรับสู่ EG'OKE 2025</p>
                    </div>

                    {/* Quick Actions Cards - 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        {/* Admin/SuperAdmin Panel - Show only for authorized users */}
                        {currentUser && ['admin', 'staff', 'superadmin'].includes(currentUser.role || '') && (
                            <div 
                                onClick={() => navigate('/admin')}
                                className="group relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 p-5 rounded-2xl text-white cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-95 border-3 border-amber-400 hover:border-amber-300 hover:-translate-y-1 col-span-2"
                            >
                                <div className="relative z-10">
                                    <div className="text-4xl mb-2 transform group-hover:scale-110 transition-transform duration-300">
                                        {currentUser.role === 'superadmin' ? '👑' : currentUser.role === 'admin' ? '🛡️' : '🔧'}
                                    </div>
                                    <h3 className="font-bold text-shadow text-lg mb-1">
                                        {currentUser.role === 'superadmin' ? 'SuperAdmin Panel' : 
                                         currentUser.role === 'admin' ? 'Admin Panel' : 
                                         'Staff Panel'}
                                    </h3>
                                    <p className="text-white/90 text-xs">จัดการระบบและผู้ใช้</p>
                                </div>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl group-hover:bg-amber-400/20 transition-all duration-500"></div>
                                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-yellow-300/10 rounded-full blur-xl group-hover:bg-yellow-300/20 transition-all duration-500"></div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/0 to-white/0 group-hover:from-black/5 transition-all duration-300"></div>
                            </div>
                        )}

                        <div 
                            onClick={() => navigate('/game')}
                            className="group relative overflow-hidden bg-gradient-to-br from-red-500 via-red-600 to-red-700 p-5 rounded-2xl text-white cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-95 border-3 border-amber-400 hover:border-amber-300 hover:-translate-y-1"
                        >
                            <div className="relative z-10">
                                <div className="text-4xl mb-2 transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">🎡</div>
                                <h3 className="font-bold text-shadow text-lg mb-1">หมุนวงล้อ</h3>
                                <p className="text-white/90 text-xs">ลุ้นรางวัลสุดพิเศษ</p>
                            </div>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl group-hover:bg-amber-400/20 transition-all duration-500"></div>
                            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-yellow-300/10 rounded-full blur-xl group-hover:bg-yellow-300/20 transition-all duration-500"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/0 to-white/0 group-hover:from-black/5 transition-all duration-300"></div>
                        </div>
                        <div 
                            onClick={() => navigate('/vote')}
                            className="group relative overflow-hidden bg-gradient-to-br from-red-500 via-red-600 to-red-700 p-5 rounded-2xl text-white cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-95 border-3 border-amber-400 hover:border-amber-300 hover:-translate-y-1"
                        >
                            <div className="relative z-10">
                                <div className="text-4xl mb-2 transform group-hover:scale-110 transition-transform duration-300">🗳️</div>
                                <h3 className="font-bold text-shadow text-lg mb-1">โหวต</h3>
                                <p className="text-white/90 text-xs">เลือกศิลปินที่ชื่นชอบ</p>
                            </div>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl group-hover:bg-amber-400/20 transition-all duration-500"></div>
                            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-yellow-300/10 rounded-full blur-xl group-hover:bg-yellow-300/20 transition-all duration-500"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/0 to-white/0 group-hover:from-black/5 transition-all duration-300"></div>
                        </div>
                        {/* Show "ส่งวาปไอจีขึ้นจอ" for regular users, "สแกน QR" for admin/staff */}
                        {currentUser && ['admin', 'staff', 'superadmin'].includes(currentUser.role || '') ? (
                            <div 
                                onClick={() => navigate('/qrscan')}
                                className="group relative overflow-hidden bg-gradient-to-br from-red-500 via-red-600 to-red-700 p-5 rounded-2xl text-white cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-95 border-3 border-amber-400 hover:border-amber-300 hover:-translate-y-1"
                            >
                                <div className="relative z-10">
                                    <div className="text-4xl mb-2 transform group-hover:scale-110 transition-transform duration-300">📱</div>
                                    <h3 className="font-bold text-shadow text-lg mb-1">สแกน QR</h3>
                                    <p className="text-white/90 text-xs">รับแต้มสะสม</p>
                                </div>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl group-hover:bg-amber-400/20 transition-all duration-500"></div>
                                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-yellow-300/10 rounded-full blur-xl group-hover:bg-yellow-300/20 transition-all duration-500"></div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/0 to-white/0 group-hover:from-black/5 transition-all duration-300"></div>
                            </div>
                        ) : (
                            <div 
                                onClick={() => navigate('/vap-ig')}
                                className="group relative overflow-hidden bg-gradient-to-br from-red-500 via-red-600 to-red-700 p-5 rounded-2xl text-white cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-95 border-3 border-amber-400 hover:border-amber-300 hover:-translate-y-1"
                            >
                                <div className="relative z-10">
                                    <div className="text-4xl mb-2 transform group-hover:scale-110 transition-transform duration-300">📱</div>
                                    <h3 className="font-bold text-shadow text-lg mb-1">ส่งวาปไอจี</h3>
                                    <p className="text-white/90 text-xs">ขึ้นจอใหญ่</p>
                                </div>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl group-hover:bg-amber-400/20 transition-all duration-500"></div>
                                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-yellow-300/10 rounded-full blur-xl group-hover:bg-yellow-300/20 transition-all duration-500"></div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/0 to-white/0 group-hover:from-black/5 transition-all duration-300"></div>
                            </div>
                        )}
                        <div 
                            onClick={() => navigate('/profile')}
                            className="group relative overflow-hidden bg-gradient-to-br from-red-500 via-red-600 to-red-700 p-5 rounded-2xl text-white cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-95 border-3 border-amber-400 hover:border-amber-300 hover:-translate-y-1"
                        >
                            <div className="relative z-10">
                                <div className="text-4xl mb-2 transform group-hover:scale-110 transition-transform duration-300">👤</div>
                                <h3 className="font-bold text-shadow text-lg mb-1">โปรไฟล์</h3>
                                <p className="text-white/90 text-xs">ดูข้อมูลของคุณ</p>
                            </div>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl group-hover:bg-amber-400/20 transition-all duration-500"></div>
                            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-yellow-300/10 rounded-full blur-xl group-hover:bg-yellow-300/20 transition-all duration-500"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/0 to-white/0 group-hover:from-black/5 transition-all duration-300"></div>
                        </div>
                    </div>

                    {/* Event Info Card */}
                    <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-2xl p-6 shadow-2xl border-3 border-amber-400 animate-fade-in-up backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="text-3xl animate-bounce-gentle">⛩️</div>
                            <h2 className="text-lg font-bold text-white">กิจกรรมที่กำลังจะมาถึง</h2>
                        </div>
                        <div className="space-y-3">
                            <div className="group flex items-center gap-3 p-4 bg-white/95 rounded-xl border-2 border-amber-300 shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
                                <span className="text-2xl group-hover:scale-110 transition-transform duration-300">🎤</span>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">เวที Karaoke</p>
                                    <p className="text-xs text-gray-600">ร้องเพลงญี่ปุ่นกับเพื่อนๆ</p>
                                </div>
                            </div>
                            <div className="group flex items-center gap-3 p-4 bg-white/95 rounded-xl border-2 border-amber-300 shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
                                <span className="text-2xl group-hover:scale-110 transition-transform duration-300">🏮</span>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">ถนนอาหารญี่ปุ่น</p>
                                    <p className="text-xs text-gray-600">อร่อยครบทุกรส</p>
                                </div>
                            </div>
                            <div className="group flex items-center gap-3 p-4 bg-white/95 rounded-xl border-2 border-amber-300 shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer">
                                <span className="text-2xl group-hover:scale-110 transition-transform duration-300">🎲</span>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">EGOKE Game</p>
                                    <p className="text-xs text-gray-600">เกมสนุกสุดมันส์</p>
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
                            <img src="/Artwork.png" alt="EG'OKE Banner" className="w-full h-40 object-cover" />
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
                                <span className="text-2xl animate-bounce-soft">🎌</span>
                                <span className="text-2xl animate-bounce-soft" style={{ animationDelay: '0.1s' }}>⛩️</span>
                                <span className="text-2xl animate-bounce-soft" style={{ animationDelay: '0.2s' }}>🏮</span>
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 mb-2">ยินดีต้อนรับ!</h2>
                            <p className="text-gray-600 text-sm mb-4">ขอบคุณที่เข้าร่วมงาน EG'OKE 2025<br/>มาสนุกกับกิจกรรมมากมายกันเถอะ!</p>

                            <button
                                onClick={() => { handleModalClose(); navigate('/profile'); }}
                                className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-bold shadow-lg transition-all active:scale-95 mb-3"
                            >
                                เปิดหน้า Profile
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
