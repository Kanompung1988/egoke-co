import { useEffect, useState } from "react"
import { auth, logout } from "../firebaseApp"
import { onAuthStateChanged } from "firebase/auth"
import type { User } from "firebase/auth"
import { useNavigate, useLocation } from "react-router-dom"
import BottomNav from "../components/BottomNav"

export default function Home() {
    const [user, setUser] = useState<User | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [hideOnClose, setHideOnClose] = useState(false) // new: input state (select-like)
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser: User | null) => {
            if (!currentUser) {
                navigate("/") // ถ้ายังไม่ล็อกอิน → กลับไปหน้า Login
            } else {
                setUser(currentUser)

                const sessionHide = sessionStorage.getItem("home_modal_hide_session") === "1"
                const justLoggedIn = !!(location.state && (location.state as any).justLoggedIn)

                if (justLoggedIn) {
                    // ถ้าพึ่งล็อกอิน ให้แสดง modal เสมอ
                    setShowModal(true)
                    // ลบ state เพื่อไม่ให้ค้างเมื่อ user อยู่ในหน้าเดียวกันต่อ
                    navigate(location.pathname, { replace: true, state: {} })
                } else {
                    // ถ้าไม่ใช่กรณีเพิ่งล็อกอิน ให้ตรวจสอบ session hide
                    if (!sessionHide) setShowModal(true)
                }
            }
        })
        return () => unsubscribe()
    }, [navigate, location])

    const handleLogout = async () => {
        await logout()
        navigate("/")
    }

    // action ตอนปิด modal: ถ้า user ติ๊ก hideOnClose ให้เก็บเป็น session
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
            <main className="min-h-screen flex flex-col items-center justify-center bg-base-200 text-center p-6">
                <h1 className="text-4xl font-bold text-primary mb-2">🎵 Welcome, {user.displayName}</h1>
                <p className="text-gray-600 mb-6">You’re now signed in with Google</p>
                <button onClick={handleLogout}
                    className="btn bg-red-600 active:scale-95 text-white rounded-xl px-6 py-2">
                    Logout
                </button>
            </main>

            {/* Home modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="max-w-lg w-full bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                        <div className="relative">
                            <img src="/Home-modal.jpg" alt="Home modal" className="w-full h-auto object-cover" />
                            <button
                                onClick={handleModalClose}
                                aria-label="Close"
                                className="absolute top-3 right-3 bg-white/80 hover:bg-white text-gray-800 rounded-full w-9 h-9 flex items-center justify-center shadow"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 text-center">
                            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mb-2">Welcome to EG'OKE 2025 🎉</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">ขอบคุณที่เข้าสู่ระบบ — ดูข่าวสารและกิจกรรมต่างในเว็บไซต์ได้เลย!</p>

                            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={hideOnClose}
                                        onChange={(e) => setHideOnClose(e.target.checked)}
                                        className="w-4 h-4 accent-primary"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">ไม่ต้องแสดงอีก</span>
                                </label>

                                <button
                                    onClick={handleModalClose}
                                    className="px-5 py-2 rounded-xl bg-gray-100 text-gray-800 hover:bg-gray-200 transition"
                                >
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
