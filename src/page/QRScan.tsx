import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, addPointsToUser } from '../firebaseApp';
import BottomNav from '../components/BottomNav';
import QrScanner from '../components/QrScanner';

// --- (NEW) สร้าง Type สำหรับเก็บข้อมูลการทำรายการล่าสุด ---
interface LastTransaction {
    userName: string;
    pointsAdded: number;
}

interface ScannedUser {
    uid: string;
    displayName: string;
    email: string;
    points: number;
}

export default function QRScan() {
    const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
    const [pointsToAdd, setPointsToAdd] = useState<number>(0);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isScanning, setIsScanning] = useState<boolean>(true);
    // --- (NEW) State สำหรับเก็บข้อมูลเมื่อเพิ่มแต้มสำเร็จ ---
    const [lastTransaction, setLastTransaction] = useState<LastTransaction | null>(null);

    // ฟังก์ชันเมื่อสแกน QR Code สำเร็จ (เหมือนเดิม)
    const handleScanSuccess = async (uid: string) => {
        setIsScanning(false);
        setIsLoading(true);
        setError('');
        try {
            const userRef = doc(db, "users", uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const userData = userSnap.data();
                setScannedUser({
                    uid: uid,
                    displayName: userData.displayName,
                    email: userData.email,
                    points: userData.points
                });
            } else {
                setError("User not found in database.");
                setIsScanning(true); // กลับไปสแกนใหม่ถ้าไม่เจอ user
            }
        } catch (err) {
            setError("Failed to fetch user data.");
            setIsScanning(true);
        } finally {
            setIsLoading(false);
        }
    };
    
    // ฟังก์ชันสำหรับกดยืนยันการเพิ่มแต้ม (ปรับปรุงใหม่)
    const handleAddPoints = async () => {
        if (!scannedUser || pointsToAdd <= 0) {
            setError("Please enter a valid number of points.");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await addPointsToUser(scannedUser.uid, pointsToAdd);
            // --- (MODIFIED) เมื่อสำเร็จ ให้เก็บข้อมูลไว้ใน State ใหม่ ---
            setLastTransaction({
                userName: scannedUser.displayName,
                pointsAdded: pointsToAdd,
            });
            setScannedUser(null); // ซ่อนฟอร์มเพิ่มแต้ม
        } catch (err) {
            setError("Failed to add points. Check permissions.");
        } finally {
            setIsLoading(false);
        }
    };

    // ฟังก์ชันสำหรับสแกนใหม่/ปิดหน้าต่าง Success
    const resetScanner = () => {
        setScannedUser(null);
        setError('');
        setPointsToAdd(0);
        setLastTransaction(null); // ซ่อนหน้าต่าง Success
        setIsScanning(true);
    };

    // --- (MODIFIED) ปรับปรุง UI ทั้งหมด ---
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
            <main className="container mx-auto max-w-lg p-6 pt-10">
                <h1 className="text-3xl font-bold text-center mb-4">Point Scanner</h1>

                {/* --- UI State 1: หน้าต่างยืนยันเมื่อเพิ่มแต้มสำเร็จ --- */}
                {lastTransaction && (
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg flex flex-col items-center text-center gap-4">
                        <i className="ri-checkbox-circle-line text-green-500 text-7xl"></i>
                        <h2 className="text-2xl font-bold">Success!</h2>
                        <p className="text-lg">
                            เพิ่มคะแนนให้ <span className="font-bold text-primary">{lastTransaction.userName}</span>
                        </p>
                        <div className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 font-bold text-3xl rounded-full px-6 py-2">
                            + {lastTransaction.pointsAdded} Points
                        </div>
                        <button onClick={resetScanner} className="btn btn-primary w-full mt-6">
                            Scan Next
                        </button>
                    </div>
                )}
                
                {/* --- UI State 2: ฟอร์มกรอกคะแนนหลังสแกนเจอ --- */}
                {scannedUser && (
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg flex flex-col items-center gap-4">
                        <img 
                            src={`https://ui-avatars.com/api/?name=${scannedUser.displayName}&background=random`} 
                            alt="Profile"
                            className="w-24 h-24 rounded-full border-4 border-primary"
                        />
                        <div className="text-center">
                            <h2 className="text-2xl font-semibold">{scannedUser.displayName}</h2>
                            <p className="text-gray-500 dark:text-gray-400">Current Points: {scannedUser.points}</p>
                        </div>

                        <div className="w-full mt-4 space-y-4">
                            <input
                                type="number"
                                value={pointsToAdd || ''}
                                onChange={(e) => setPointsToAdd(parseInt(e.target.value, 10))}
                                placeholder="Points to add"
                                className="input input-bordered w-full bg-gray-100 dark:bg-gray-700"
                            />
                            <button onClick={handleAddPoints} disabled={isLoading} className="btn btn-primary w-full">
                                {isLoading ? 'Adding...' : `Confirm Add ${pointsToAdd || 0} Points`}
                            </button>
                            <button onClick={resetScanner} className="btn btn-ghost w-full">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
                
                {/* --- UI State 3: หน้าสแกนเริ่มต้น --- */}
                {isScanning && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                         <p className="text-center mb-4 text-gray-500 dark:text-gray-400">
                            Point the camera at a user's QR code
                        </p>
                        <div className="overflow-hidden rounded-xl">
                            <QrScanner onScanSuccess={handleScanSuccess} />
                        </div>
                    </div>
                )}

                {/* แสดง Error Message (ถ้ามี) */}
                {error && <p className="text-center text-red-500 mt-4">{error}</p>}
            </main>
            
            <BottomNav />
        </div>
    );
}