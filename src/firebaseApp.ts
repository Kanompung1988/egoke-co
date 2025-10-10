import { initializeApp } from "firebase/app"
import type { FirebaseApp } from "firebase/app"
import { getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut} from "firebase/auth"
import type { User } from "firebase/auth"
import { getFirestore, doc, getDoc, setDoc,Firestore,} from "firebase/firestore"

// ตั้งค่า Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDCjt8DfkKCsjc73Oaay851FYu8pG1-3TY",
    authDomain: "egoke-7dae5.firebaseapp.com",
    projectId: "egoke-7dae5",
    storageBucket: "egoke-7dae5.appspot.com",
    messagingSenderId: "910235640821",
    appId: "1:910235640821:web:cc5163a4eee3e8dffc76bc",
    measurementId: "G-10MPJ3TPEB",
}

// เริ่มต้น Firebase App
const app: FirebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db: Firestore = getFirestore(app)
const provider = new GoogleAuthProvider()

// ==========================
//  ฟังก์ชันล็อกอินด้วย Google
// ==========================
export async function loginWithGoogle(): Promise<void> {
    try {
        const result = await signInWithPopup(auth, provider)
        const user = result.user
        console.log("✅ Logged in:", user.displayName)
        await checkAndCreateUser(user)
    } catch (error) {
        console.error("❌ Login error:", error)
    }
}

// ==========================
//  สร้างเอกสารผู้ใช้ถ้ายังไม่มี
// ==========================
async function checkAndCreateUser(user: User | null): Promise<void> {
    if (!user) return

    const userRef = doc(db, "users", user.uid)
    const snapshot = await getDoc(userRef)

    if (!snapshot.exists()) {
        const newUser = {
            uid: user.uid,
            displayName: user.displayName ?? "Anonymous",
            email: user.email ?? "",
            points: 0,
        }
        await setDoc(userRef, newUser)
        console.log("✨ New user created in Firestore.")
    } else {
        console.log("👤 Existing user found.")
    }
}

// ==========================
//  ดึงข้อมูลผู้ใช้จาก Firestore
// ==========================
export async function fetchAndDisplayUserData(
    user: User,
    elements?: {
        userNameEl?: HTMLElement | null
        userPointsEl?: HTMLElement | null
        userImageEl?: HTMLImageElement | null
    }
): Promise<void> {
    const userRef = doc(db, "users", user.uid)
    const snapshot = await getDoc(userRef)

    if (snapshot.exists()) {
        const data = snapshot.data() as {
            displayName: string
            points: number
        }

        if (elements?.userNameEl) elements.userNameEl.textContent = data.displayName
        if (elements?.userPointsEl)
            elements.userPointsEl.textContent = `${data.points}`
        if (elements?.userImageEl && user.photoURL)
            elements.userImageEl.src = user.photoURL

        console.log("✅ User data loaded:", data)
    } else {
        console.warn("⚠️ No user document found in Firestore.")
    }
}

// ==========================
//  ฟังก์ชันออกจากระบบ
// ==========================
export async function logout(): Promise<void> {
    try {
        await signOut(auth)
        console.log("🚪 User signed out.")
    } catch (error) {
        console.error("❌ Sign-out error:", error)
    }
}

// ==========================
// ฟังก์ชันตรวจสอบสถานะล็อกอิน
// ==========================
export function watchAuthState(callback: (user: User | null) => void): void {
    onAuthStateChanged(auth, callback)
}
