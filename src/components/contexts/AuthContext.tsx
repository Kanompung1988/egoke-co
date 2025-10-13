// src/contexts/AuthContext.tsx

import { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
// MODIFIED: Import onSnapshot เพิ่มเข้ามา
import { doc, onSnapshot } from 'firebase/firestore'; 
import { auth, db } from '../../firebaseApp';

export interface AppUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: string;
    points: number;
}

interface AuthContextType {
    currentUser: AppUser | null;
    loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({ currentUser: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    // MODIFIED: ปรับแก้ useEffect ทั้งหมดให้ใช้ onSnapshot
    useEffect(() => {
        let unsubscribeFromFirestore: () => void;

        const unsubscribeFromAuth = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
            // ถ้ามีการเปลี่ยน user (login/logout) ให้ยกเลิกการฟังข้อมูลเก่าก่อน
            if (unsubscribeFromFirestore) {
                unsubscribeFromFirestore();
            }

            if (user) {
                // เมื่อมี user ล็อกอิน, ให้เริ่ม "คอยฟัง" การเปลี่ยนแปลงที่เอกสารของ user คนนั้น
                const userDocRef = doc(db, 'users', user.uid);
                
                unsubscribeFromFirestore = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        // ทันทีที่เอกสารถูกสร้างหรืออัปเดต, เราจะได้ข้อมูลใหม่ที่นี่
                        const userData = docSnap.data();
                        setCurrentUser({
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
                            role: userData.role || 'none',
                            points: userData.points || 0,
                        });
                    } else {
                        // กรณีที่ user ล็อกอินแล้ว แต่เอกสารยังไม่ถูกสร้าง (จะเกิดขึ้นแค่แวบเดียว)
                        // ไม่ต้องทำอะไร รอให้ login function สร้างเอกสาร แล้ว onSnapshot จะทำงานอีกครั้งเอง
                    }
                });
            } else {
                // ถ้า user logout
                setCurrentUser(null);
            }
            setLoading(false);
        });

        // Cleanup function: เมื่อ component หายไป ให้ยกเลิกการฟังทั้งหมด
        return () => {
            unsubscribeFromAuth();
            if (unsubscribeFromFirestore) {
                unsubscribeFromFirestore();
            }
        };
    }, []);

    const value = {
        currentUser,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}