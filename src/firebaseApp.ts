import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { 
    getAuth, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    type Unsubscribe,
    type User 
} from "firebase/auth";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    type Firestore 
} from "firebase/firestore";

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
const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db: Firestore = getFirestore(app);
const provider = new GoogleAuthProvider();


// -------------------------------------
// ฟังก์ชันสำหรับ Staff Login โดยเฉพาะ
// -------------------------------------
export async function loginAsStaff(staffCode: string): Promise<{ user: User | null; error: string | null }> {
    if (!staffCode) {
        return { user: null, error: "กรุณากรอก Staff Code" };
    }

    // 1. ตรวจสอบ Staff Code ก่อน
    const role = await validateStaffCode(staffCode);
    if (!role) {
        return { user: null, error: "Staff Code ไม่ถูกต้อง" };
    }

    // 2. ถ้าโค้ดถูกต้อง ให้เริ่ม Login ด้วย Google
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log(`✅ Staff logged in: ${user.displayName} with role: ${role}`);

        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);

        // ถ้ายังไม่มี user นี้ ให้สร้างใหม่พร้อม role ที่ได้มา
        if (!snapshot.exists()) {
            await createUserDocument(user, role);
        }

        return { user, error: null };

    } catch (error) {
        console.error("❌ Staff login error:", error);
        const errorMessage = (error as Error).message || "เกิดข้อผิดพลาดระหว่างการล็อกอิน";
        return { user: null, error: errorMessage };
    }
}

// ----------------------------------------------
// ฟังก์ชันล็อกอินสำหรับผู้ใช้ทั่วไป (แบบง่าย)
// ----------------------------------------------
export async function loginWithGoogle(): Promise<User | null> {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log("✅ Normal user logged in:", user.displayName);

        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);

        // ถ้าเป็น user ใหม่ ให้สร้างเอกสารด้วย role "none" เสมอ
        if (!snapshot.exists()) {
            await createUserDocument(user, "none");
        }

        return user;
    } catch (error) {
        console.error("❌ Login error:", error);
        return null;
    }
}

// ----------------------------------------------
// ฟังก์ชัน Helper (ใช้ร่วมกัน)
// ----------------------------------------------

async function createUserDocument(user: User, role: string): Promise<void> {
    const userRef = doc(db, "users", user.uid);
    const newUser = {
        uid: user.uid,
        displayName: user.displayName ?? "Anonymous",
        email: user.email ?? "",
        points: 0,
        role: role,
    };
    await setDoc(userRef, newUser);
    console.log(`✨ New user created in Firestore with role: ${role}`);
}

async function validateStaffCode(code: string): Promise<string | null> {
    if (!code) return null;
    const codeRef = doc(db, "staffCodes", code);
    const snapshot = await getDoc(codeRef);
    if (snapshot.exists()) {
        const data = snapshot.data();
        console.log(`Valid code entered. Role: ${data.role}`);
        return data.role;
    } else {
        console.warn("Invalid code entered.");
        return null;
    }
}

export async function logout(): Promise<void> {
    try {
        await signOut(auth);
        console.log("🚪 User signed out.");
    } catch (error) {
        console.error("❌ Sign-out error:", error);
    }
}

export function watchAuthState(callback: (user: User | null) => void): Unsubscribe {
    return onAuthStateChanged(auth, callback);
}
/*
const firebaseConfig = {
    apiKey: "AIzaSyDCjt8DfkKCsjc73Oaay851FYu8pG1-3TY",
    authDomain: "egoke-7dae5.firebaseapp.com",
    projectId: "egoke-7dae5",
    storageBucket: "egoke-7dae5.appspot.com",
    messagingSenderId: "910235640821",
    appId: "1:910235640821:web:cc5163a4eee3e8dffc76bc",
    measurementId: "G-10MPJ3TPEB",
}
    */
