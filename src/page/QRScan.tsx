import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, addPointsToUser } from '../firebaseApp';
import BottomNav from '../components/BottomNav';
import QrScanner from '../components/QrScanner';

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
    const [lastTransaction, setLastTransaction] = useState<LastTransaction | null>(null);

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
                setError("ไม่พบผู้ใช้งานในระบบ");
                setIsScanning(true);
            }
        } catch (err) {
            setError("เกิดข้อผิดพลาดในการดึงข้อมูล");
            setIsScanning(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddPoints = async () => {
        if (!scannedUser || pointsToAdd <= 0) {
            setError("กรุณากรอกจำนวนแต้มที่ถูกต้อง");
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await addPointsToUser(scannedUser.uid, pointsToAdd);
            setLastTransaction({
                userName: scannedUser.displayName,
                pointsAdded: pointsToAdd,
            });
            setScannedUser(null);
        } catch (err) {
            setError("ไม่สามารถเพิ่มแต้มได้ กรุณาตรวจสอบสิทธิ์");
        } finally {
            setIsLoading(false);
        }
    };

    const resetScanner = () => {
        setScannedUser(null);
        setError('');
        setPointsToAdd(0);
        setLastTransaction(null);
        setIsScanning(true);
    };

    return (
        <div className="min-h-screen relative overflow-hidden pb-24">
            {/* Background */}
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/art/temple-bg.png')" }}
            />
            <div className="absolute inset-0 bg-red-900/70" />
            
            {/* Fireworks */}
            <div className="fireworks-container">
                <div className="firework firework-1"></div>
                <div className="firework firework-2"></div>
                <div className="firework firework-3"></div>
            </div>

            {/* Content */}
            <main className="relative z-10 container mx-auto max-w-lg px-4 pt-8">
                {/* Header */}
                <div className="text-center mb-6 animate-fade-in">
                    <span className="text-5xl">📱</span>
                    <h1 className="text-3xl font-bold text-white mt-3 drop-shadow-lg">สแกน QR Code</h1>
                    <p className="text-red-200 text-sm mt-2">สแกนเพื่อเพิ่มแต้มให้ผู้เข้าร่วมงาน</p>
                </div>

                {/* Success State */}
                {lastTransaction && (
                    <div className="bg-white/95 rounded-3xl p-8 shadow-2xl text-center animate-fade-in">
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <span className="text-4xl text-white">✓</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">สำเร็จ! 🎉</h2>
                        <p className="text-gray-600 mb-4">
                            เพิ่มแต้มให้ <span className="font-bold text-green-600">{lastTransaction.userName}</span>
                        </p>
                        <div className="bg-green-100 text-green-700 font-bold text-3xl rounded-2xl px-6 py-4 border-2 border-green-300 mb-6">
                            + {lastTransaction.pointsAdded} แต้ม
                        </div>
                        <button 
                            onClick={resetScanner} 
                            className="w-full bg-red-500 hover:bg-red-600 text-white rounded-2xl py-4 font-bold shadow-lg transition-all active:scale-95"
                        >
                            📱 สแกนต่อ
                        </button>
                    </div>
                )}

                {/* User Found - Add Points Form */}
                {scannedUser && (
                    <div className="bg-white/95 rounded-3xl p-6 shadow-2xl animate-fade-in">
                        <div className="flex flex-col items-center mb-6">
                            <img
                                src={`https://ui-avatars.com/api/?name=${scannedUser.displayName}&background=random&size=128`}
                                alt="Profile"
                                className="w-24 h-24 rounded-full border-4 border-red-300 shadow-xl mb-4"
                            />
                            <h2 className="text-2xl font-bold text-gray-800">{scannedUser.displayName}</h2>
                            <p className="text-gray-500 text-sm">{scannedUser.email}</p>
                            <div className="mt-3 bg-amber-100 border-2 border-amber-300 rounded-xl px-4 py-2">
                                <span className="text-amber-700 font-bold">💰 แต้มปัจจุบัน: {scannedUser.points}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-gray-700 text-sm font-bold mb-2 block">จำนวนแต้มที่ต้องการเพิ่ม</label>
                                <input
                                    type="number"
                                    value={pointsToAdd || ''}
                                    onChange={(e) => setPointsToAdd(parseInt(e.target.value, 10) || 0)}
                                    placeholder="เช่น 10, 20, 50..."
                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                />
                            </div>
                            
                            {/* Quick Add Buttons */}
                            <div className="flex gap-2">
                                {[10, 20, 50, 100].map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => setPointsToAdd(val)}
                                        className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                                            pointsToAdd === val 
                                                ? 'bg-red-500 text-white' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        +{val}
                                    </button>
                                ))}
                            </div>

                            <button 
                                onClick={handleAddPoints} 
                                disabled={isLoading || pointsToAdd <= 0}
                                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-2xl py-4 font-bold shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="loading loading-spinner loading-sm" />
                                        กำลังเพิ่ม...
                                    </span>
                                ) : (
                                    `✓ ยืนยันเพิ่ม ${pointsToAdd || 0} แต้ม`
                                )}
                            </button>
                            <button 
                                onClick={resetScanner} 
                                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl py-3 transition-all font-medium"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                )}

                {/* Scanning State */}
                {isScanning && (
                    <div className="bg-white/95 rounded-3xl p-6 shadow-2xl animate-fade-in">
                        <p className="text-center mb-4 text-gray-600 font-medium">
                            📷 เล็งกล้องไปที่ QR Code ของผู้เข้าร่วม
                        </p>
                        <div className="overflow-hidden rounded-2xl border-4 border-red-300">
                            <QrScanner onScanSuccess={handleScanSuccess} />
                        </div>
                        <div className="mt-4 text-center">
                            <p className="text-gray-500 text-sm">
                                สแกน QR Code จากหน้า Profile ของผู้ใช้
                            </p>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mt-4 bg-red-100 border-2 border-red-300 rounded-xl p-4 text-center animate-fade-in">
                        <p className="text-red-700 font-medium">⚠️ {error}</p>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && !scannedUser && !lastTransaction && (
                    <div className="text-center py-10 animate-fade-in">
                        <span className="loading loading-spinner loading-lg text-white" />
                        <p className="text-red-200 mt-4">กำลังโหลด...</p>
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
}
