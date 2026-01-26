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
        let unsubscribeFromFirestore: (() => void) | undefined;

        const unsubscribeFromAuth = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
            console.log('🔐 Auth state changed:', user?.email || 'No user');
            
            // ถ้ามีการเปลี่ยน user (login/logout) ให้ยกเลิกการฟังข้อมูลเก่าก่อน
            if (unsubscribeFromFirestore) {
                unsubscribeFromFirestore();
                unsubscribeFromFirestore = undefined;
            }

            if (user) {
                console.log('👤 User logged in, fetching Firestore data...');
                // เมื่อมี user ล็อกอิน, ให้เริ่ม "คอยฟัง" การเปลี่ยนแปลงที่เอกสารของ user คนนั้น
                const userDocRef = doc(db, 'users', user.uid);
                
                unsubscribeFromFirestore = onSnapshot(
                    userDocRef, 
                    (docSnap) => {
                        if (docSnap.exists()) {
                            // ทันทีที่เอกสารถูกสร้างหรืออัปเดต, เราจะได้ข้อมูลใหม่ที่นี่
                            const userData = docSnap.data();
                            console.log('✅ Firestore data loaded:', { 
                                role: userData.role, 
                                points: userData.points 
                            });
                            setCurrentUser({
                                uid: user.uid,
                                email: user.email,
                                displayName: user.displayName,
                                photoURL: user.photoURL,
                                role: userData.role || 'user',
                                points: userData.points || 0,
                            });
                            setLoading(false);
                        } else {
                            console.log('⚠️  User document does not exist yet, waiting...');
                            // กรณีที่ user ล็อกอินแล้ว แต่เอกสารยังไม่ถูกสร้าง (จะเกิดขึ้นแค่แวบเดียว)
                            // ตั้ง role เป็น 'user' ชั่วคราว
                            setCurrentUser({
                                uid: user.uid,
                                email: user.email,
                                displayName: user.displayName,
                                photoURL: user.photoURL,
                                role: 'user',
                                points: 0,
                            });
                            setLoading(false);
                        }
                    },
                    (error) => {
                        console.error('❌ Error listening to user document:', error);
                        // ถ้าเกิด error ให้ตั้งค่าเริ่มต้น
                        setCurrentUser({
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
                            role: 'user',
                            points: 0,
                        });
                        setLoading(false);
                    }
                );
            } else {
                console.log('👋 User logged out');
                // ถ้า user logout
                setCurrentUser(null);
                setLoading(false);
            }
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

    console.log('AuthContext state:', { currentUser: currentUser?.uid, loading });

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}