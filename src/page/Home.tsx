/* import { useEffect, useState } from "react"
import { auth, logout } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"
import type { User } from "firebase/auth"
import { useNavigate } from "react-router-dom"

export default function Home() {
    const [user, setUser] = useState<User | null>(null)
    const navigate = useNavigate()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                navigate("/") // ถ้ายังไม่ล็อกอิน → กลับไปหน้า Login
            } else {
                setUser(currentUser)
            }
        })
        return () => unsubscribe()
    }, [navigate])

    const handleLogout = async () => {
        await logout()
        navigate("/")
    }

    if (!user) return null

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-base-200 text-center p-6">
            <h1 className="text-4xl font-bold text-primary mb-2">🎵 Welcome, {user.displayName}</h1>
            <p className="text-gray-600 mb-6">You’re now signed in with Google</p>
            <button
                onClick={handleLogout}
                className="btn bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 py-2"
            >
                Logout
            </button>
        </main>
    )
}
 */

import { useEffect, useState } from "react"
import { auth, logout } from "../firebaseApp"
import { onAuthStateChanged } from "firebase/auth"
import type { User } from "firebase/auth"
import { useNavigate } from "react-router-dom"
import BottomNav from "../components/BottomNav"

export default function Home() {
    const [user, setUser] = useState<User | null>(null)
    const navigate = useNavigate()

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                navigate("/") // ถ้ายังไม่ล็อกอิน → กลับไปหน้า Login
            } else {
                setUser(currentUser)
            }
        })
        return () => unsubscribe()
    }, [navigate])

    const handleLogout = async () => {
        await logout()
        navigate("/")
    }

    if (!user) return null

    return (
        <>
            <BottomNav />
            <main className="min-h-screen flex flex-col items-center justify-center bg-base-200 text-center p-6">
                <h1 className="text-4xl font-bold text-primary mb-2">🎵 Welcome, {user.displayName}</h1>
                <p className="text-gray-600 mb-6">You’re now signed in with Google</p>
                <button onClick={handleLogout}
                    className="btn bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 py-2">
                    Logout
                </button>
            </main>
        </>
    )
}
