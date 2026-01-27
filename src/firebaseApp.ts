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
    updateDoc,
    increment,
    collection,
    query,
    where,
    getDocs,
    type Firestore
} from "firebase/firestore";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL,
    type FirebaseStorage 
} from "firebase/storage";

// ✅ ตั้งค่า Firebase จาก Environment Variables
/*
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};
*/

const firebaseConfig = {
    apiKey: "AIzaSyDCjt8DfkKCsjc73Oaay851FYu8pG1-3TY",
    authDomain: "egoke-7dae5.firebaseapp.com",
    projectId: "egoke-7dae5",
    storageBucket: "egoke-7dae5.appspot.com",
    messagingSenderId: "910235640821",
    appId: "1:910235640821:web:cc5163a4eee3e8dffc76bc",
    measurementId: "G-10MPJ3TPEB",
};

// Validate Firebase config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('❌ Firebase configuration is missing. Please check your .env file.');
}

// เริ่มต้น Firebase App
const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
const provider = new GoogleAuthProvider();

// ✅ SuperAdmin Email - จาก Environment Variables
const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || "thanaponchanal@gmail.com";

// ----------------------------------------------
// ฟังก์ชันล็อกอินด้วย Google (แบบ Popup)
// ----------------------------------------------
export async function loginWithGoogle(): Promise<User | null> {
    try {
        console.log('🔓 Opening Google popup...');
        
        // ใช้ popup
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log("✅ Google auth success:", user.email);

        // สร้างหรืออัพเดท user document
        await createOrUpdateUserDocument(user);

        return user;
    } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        console.error("❌ Login error:", err.code, err.message);
        
        if (err.code === 'auth/popup-closed-by-user') {
            console.log('User closed the popup');
        } else if (err.code === 'auth/popup-blocked') {
            console.error('⚠️ Popup was blocked! Please allow popups.');
            alert('กรุณาอนุญาต popup ใน browser ของคุณ');
        } else if (err.code === 'auth/unauthorized-domain') {
            console.error('⚠️ Domain not authorized in Firebase Console!');
        }
        return null;
    }
}

// ----------------------------------------------
// สร้างหรืออัพเดท User Document ใน Firestore
// ----------------------------------------------
async function createOrUpdateUserDocument(user: User): Promise<void> {
    const userRef = doc(db, "users", user.uid);
    const snapshot = await getDoc(userRef);
    
    // กำหนด role ตาม email
    let role = "user"; // default role
    
    if (user.email === SUPER_ADMIN_EMAIL) {
        role = "superadmin";
    }
    
    if (!snapshot.exists()) {
        // สร้าง user ใหม่
        const newUser = {
            uid: user.uid,
            displayName: user.displayName ?? "Anonymous",
            email: user.email ?? "",
            photoURL: user.photoURL ?? "",
            points: role === "superadmin" ? 999999999 : 0,
            tickets: role === "superadmin" ? 999999 : 0,
            role: role,
            createdAt: new Date(),
        };
        await setDoc(userRef, newUser);
        console.log(`✨ New user created with role: ${role}`);
    } else {
        // ถ้าเป็น superadmin ให้อัพเดท role เสมอ
        if (user.email === SUPER_ADMIN_EMAIL) {
            await updateDoc(userRef, {
                role: "superadmin",
                points: 999999999,
                tickets: 999999,
            });
            console.log("👑 SuperAdmin updated");
        }
        console.log('� Existing user logged in');
    }
}

// ----------------------------------------------
// ฟังก์ชันสำหรับ SuperAdmin: เปลี่ยน role ของ user (รับทั้ง email และ uid)
// ----------------------------------------------
export async function setUserRole(
    identifier: string, // อาจเป็น email หรือ uid
    newRole: "user" | "staff" | "register" | "admin"
): Promise<{ success: boolean; error: string | null }> {
    try {
        let userId: string | null = null;
        let userEmail: string | null = null;
        
        // ถ้า identifier มี @ แสดงว่าเป็น email
        if (identifier.includes('@')) {
            // หา user จาก email
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", identifier));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                return { success: false, error: "ไม่พบผู้ใช้นี้ในระบบ" };
            }
            
            const userDoc = querySnapshot.docs[0];
            userId = userDoc.id;
            userEmail = userDoc.data().email;
        } else {
            // ถ้าเป็น uid ให้ดึงข้อมูลโดยตรง
            userId = identifier;
            const userDoc = await getDoc(doc(db, "users", userId));
            
            if (!userDoc.exists()) {
                return { success: false, error: "ไม่พบผู้ใช้นี้ในระบบ" };
            }
            
            userEmail = userDoc.data().email;
        }
        
        // ห้ามเปลี่ยน role ของ superadmin
        if (userEmail === SUPER_ADMIN_EMAIL) {
            return { success: false, error: "ไม่สามารถเปลี่ยน role ของ SuperAdmin ได้" };
        }
        
        await updateDoc(doc(db, "users", userId), {
            role: newRole,
            updatedAt: new Date(),
        });
        
        console.log(`✅ Updated user ${userEmail} (${userId}) to role: ${newRole}`);
        return { success: true, error: null };
    } catch (error) {
        console.error("❌ Error setting user role:", error);
        return { success: false, error: "เกิดข้อผิดพลาดในการอัพเดท role" };
    }
}

// ----------------------------------------------
// ดึงรายชื่อ users ทั้งหมด (สำหรับ SuperAdmin)
// ----------------------------------------------
export async function getAllUsers(): Promise<Array<{
    uid: string;
    email: string;
    displayName: string;
    role: string;
    points: number;
    attendance?: {
        day1?: boolean;
        day2?: boolean;
        day3?: boolean;
    };
}>> {
    try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                uid: doc.id,
                email: data.email || "",
                displayName: data.displayName || "",
                role: data.role || "user",
                points: data.points || 0,
                attendance: data.attendance || {},
            };
        });
    } catch (error) {
        console.error("❌ Error getting users:", error);
        return [];
    }
}

// ----------------------------------------------
// Logout
// ----------------------------------------------
export async function logout(): Promise<void> {
    try {
        await signOut(auth);
        console.log("🚪 User signed out.");
    } catch (error) {
        console.error("❌ Sign-out error:", error);
    }
}

// ----------------------------------------------
// Watch Auth State
// ----------------------------------------------
export function watchAuthState(callback: (user: User | null) => void): Unsubscribe {
    return onAuthStateChanged(auth, callback);
}

// ----------------------------------------------
// Points Management
// ----------------------------------------------
export async function addPointsToUser(uid: string, pointsToAdd: number) {
    if (!uid || !pointsToAdd || pointsToAdd <= 0) {
        throw new Error("Invalid user ID or points value.");
    }
    const userRef = doc(db, "users", uid);
    try {
        await updateDoc(userRef, {
            points: increment(pointsToAdd)
        });
        console.log(`✅ Added ${pointsToAdd} points to user ${uid}`);
        const updatedDoc = await getDoc(userRef);
        return updatedDoc.data();
    } catch (error) {
        console.error("❌ Error adding points:", error);
        throw error;
    }
}

export async function deductPointsFromUser(uid: string, pointsToDeduct: number) {
    if (!uid || !pointsToDeduct || pointsToDeduct <= 0) {
        throw new Error("Invalid user ID or points value.");
    }
    const userRef = doc(db, "users", uid);
    try {
        await updateDoc(userRef, {
            points: increment(-pointsToDeduct)
        });
        console.log(`✅ Deducted ${pointsToDeduct} points from user ${uid}`);
        const updatedDoc = await getDoc(userRef);
        return updatedDoc.data();
    } catch (error) {
        console.error("❌ Error deducting points:", error);
        throw error;
    }
}

// ----------------------------------------------
// Get User Profile
// ----------------------------------------------
export async function getUserProfile(uid: string) {
    if (!uid) return null;
    const userRef = doc(db, "users", uid);
    const docSnap = await getDoc(userRef);
    return docSnap.exists() ? docSnap.data() : null;
}

// ----------------------------------------------
// Check if user is SuperAdmin
// ----------------------------------------------
export function isSuperAdmin(email: string | null): boolean {
    return email === SUPER_ADMIN_EMAIL;
}

// ----------------------------------------------
// Check user role with hierarchical permissions
// SuperAdmin > Admin > Staff > User
// ----------------------------------------------
export function hasAdminAccess(role: string | null | undefined): boolean {
    return role === 'superadmin' || role === 'admin';
}

export function hasStaffAccess(role: string | null | undefined): boolean {
    return role === 'superadmin' || role === 'admin' || role === 'staff';
}

export function isRole(role: string | null | undefined, targetRole: string): boolean {
    if (!role) return false;
    
    const hierarchy: Record<string, number> = {
        'superadmin': 4,
        'admin': 3,
        'staff': 2,
        'user': 1
    };
    
    const userLevel = hierarchy[role] || 0;
    const targetLevel = hierarchy[targetRole] || 0;
    
    return userLevel >= targetLevel;
}

/**
 * Upload image to Firebase Storage
 * @param file - Image file to upload
 * @param path - Storage path (e.g., 'candidates/band/image.jpg')
 * @returns Promise<string> - Download URL
 */
export async function uploadImage(file: File, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
}

// ----------------------------------------------
// ฟังก์ชันอัปโหลดรูปไปยัง Firebase Storage
// ----------------------------------------------
export async function uploadCandidateImage(
    file: File,
    category: string,
    candidateName: string
): Promise<string> {
    try {
        const timestamp = Date.now();
        const sanitizedName = candidateName.replace(/[^a-zA-Z0-9ก-๙]/g, '_');
        const fileName = `${category}/${sanitizedName}_${timestamp}.${file.name.split('.').pop()}`;
        
        const storageRef = ref(storage, `candidates/${fileName}`);
        
        console.log('⬆️ กำลังอัปโหลดรูป:', fileName);
        
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        console.log('✅ อัปโหลดสำเร็จ:', downloadURL);
        
        return downloadURL;
    } catch (error) {
        console.error('❌ อัปโหลดรูปล้มเหลว:', error);
        throw new Error('ไม่สามารถอัปโหลดรูปภาพได้');
    }
}
