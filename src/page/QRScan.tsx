import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, addPointsToUser } from '../firebaseApp';
import { useAuth } from '../hooks/useAuth';
import BottomNav from '../components/BottomNav';
import QrScanner from '../components/QrScanner';
import { logAdminAdjustPoints, logPrizeClaim } from '../utils/activityLogger';

interface LastTransaction {
    userName: string;
    pointsAdded: number;
    isDeduction?: boolean;
    prizeName?: string;
}

interface ScannedUser {
    uid: string;
    displayName: string;
    email: string;
    points: number;
}

interface ScannedTicket {
    ticketId: string;
    userId: string;
    userName: string;
    prize: string;
    emoji: string;
    claimed: boolean;
    timestamp: number;
}

export default function QRScan() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [scannedUser, setScannedUser] = useState<ScannedUser | null>(null);
    const [scannedTicket, setScannedTicket] = useState<ScannedTicket | null>(null);
    const [pointsToAdd, setPointsToAdd] = useState<number>(0);
    const [pointsReason, setPointsReason] = useState<string>(''); // เพิ่ม: เหตุผลในการเพิ่มแต้ม
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isScanning, setIsScanning] = useState<boolean>(true);
    const [lastTransaction, setLastTransaction] = useState<LastTransaction | null>(null);
    const [mode, setMode] = useState<'add' | 'claim'>('add'); // เพิ่ม mode เลือก
    const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera'); // เพิ่ม: สลับระหว่างกล้องและกรอกโค้ด
    const [manualCode, setManualCode] = useState<string>(''); // เพิ่ม: เก็บโค้ดที่กรอก

    // Check if user has permission (Staff, Admin, or SuperAdmin)
    useEffect(() => {
        if (currentUser && !['staff', 'admin', 'superadmin'].includes(currentUser.role || '')) {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ - ต้องเป็น Staff, Admin หรือ SuperAdmin เท่านั้น');
            navigate('/');
        }
    }, [currentUser, navigate]);

    // Show loading while checking auth
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600">กำลังตรวจสอบสิทธิ์...</p>
                </div>
            </div>
        );
    }

    const handleScanSuccess = async (scannedData: string) => {
        setIsScanning(false);
        setIsLoading(true);
        setError('');
        
        try {
            if (mode === 'claim') {
                // โหมดเคลมรางวัล - ค้นหา ticketId
                let ticketId = scannedData;
                
                // ถ้า scan URL ให้ extract ticketId
                if (scannedData.includes('/redeem/')) {
                    ticketId = scannedData.split('/redeem/')[1];
                }
                
                await handleTicketScan(ticketId);
            } else {
                // โหมดเพิ่มแต้ม - ค้นหา userId
                await handleUserScan(scannedData);
            }
        } catch (err) {
            console.error('Scan error:', err);
            setError("เกิดข้อผิดพลาดในการสแกน");
            setIsScanning(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUserScan = async (uid: string) => {
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
            setError("เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้");
            setIsScanning(true);
        }
    };

    const handleTicketScan = async (ticketId: string) => {
        try {
            // ค้นหา ticket จาก history subcollection ของทุกคน
            const usersRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersRef);
            
            let ticketFound = false;
            
            for (const userDoc of usersSnapshot.docs) {
                const historyRef = collection(db, 'users', userDoc.id, 'history');
                const historyQuery = query(historyRef, where('ticketId', '==', ticketId));
                const historySnapshot = await getDocs(historyQuery);
                
                if (!historySnapshot.empty) {
                    const ticketDoc = historySnapshot.docs[0];
                    const ticketData = ticketDoc.data();
                    const userData = userDoc.data();
                    
                    setScannedTicket({
                        ticketId: ticketId,
                        userId: userDoc.id,
                        userName: userData.displayName || 'ไม่ระบุชื่อ',
                        prize: ticketData.prize || 'ไม่ระบุรางวัล',
                        emoji: ticketData.emoji || '🎁',
                        claimed: ticketData.claimed || false,
                        timestamp: ticketData.timestamp || Date.now()
                    });
                    
                    ticketFound = true;
                    break;
                }
            }
            
            if (!ticketFound) {
                setError("❌ ไม่พบตั๋วรางวัลในระบบ");
                setIsScanning(true);
            }
        } catch (err) {
            console.error('Ticket scan error:', err);
            setError("เกิดข้อผิดพลาดในการค้นหาตั๋ว");
            setIsScanning(true);
        }
    };

    const handleAddPoints = async () => {
        if (!scannedUser || pointsToAdd <= 0) {
            setError("กรุณากรอกจำนวนแต้มที่ถูกต้อง");
            return;
        }
        
        if (!pointsReason.trim()) {
            setError("กรุณากรอกเหตุผลในการเพิ่มแต้ม");
            return;
        }
        
        setIsLoading(true);
        setError('');
        
        try {
            // ดึงข้อมูล user เพื่อเก็บ points เดิม
            const userRef = doc(db, 'users', scannedUser.uid);
            const userSnap = await getDoc(userRef);
            const userData = userSnap.data();
            const pointsBefore = userData?.points || 0;
            const pointsAfter = pointsBefore + pointsToAdd;
            
            // เพิ่มแต้ม
            await addPointsToUser(scannedUser.uid, pointsToAdd);
            
            // บันทึก activity log พร้อมเหตุผล
            await logAdminAdjustPoints(
                scannedUser.uid,
                scannedUser.email,
                scannedUser.displayName,
                pointsBefore,
                pointsAfter,
                currentUser?.uid || '',
                currentUser?.email || '',
                pointsReason // ส่งเหตุผลเข้าไป
            );
            
            setLastTransaction({
                userName: scannedUser.displayName,
                pointsAdded: pointsToAdd,
                isDeduction: false,
            });
            setScannedUser(null);
            setPointsReason(''); // Clear reason
            setPointsToAdd(0);
        } catch (err) {
            setError("ไม่สามารถเพิ่มแต้มได้ กรุณาตรวจสอบสิทธิ์");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClaimPrize = async () => {
        if (!scannedTicket) {
            setError("ไม่พบข้อมูลตั๋ว");
            return;
        }

        if (scannedTicket.claimed) {
            setError("❌ ตั๋วนี้ถูกเคลมไปแล้ว!");
            return;
        }
        
        setIsLoading(true);
        setError('');
        
        try {
            let claimedUserId = '';
            let claimedUserEmail = '';
            let claimedUserName = '';
            let userPoints = 0;

            // อัพเดทสถานะว่า claimed แล้ว
            const usersRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersRef);
            
            for (const userDoc of usersSnapshot.docs) {
                const historyRef = collection(db, 'users', userDoc.id, 'history');
                const historyQuery = query(historyRef, where('ticketId', '==', scannedTicket.ticketId));
                const historySnapshot = await getDocs(historyQuery);
                
                if (!historySnapshot.empty) {
                    const ticketDocRef = historySnapshot.docs[0].ref;
                    await updateDoc(ticketDocRef, {
                        claimed: true,
                        claimedAt: Date.now(),
                        claimedBy: currentUser?.uid
                    });

                    // Get user data for logging
                    const userData = userDoc.data();
                    claimedUserId = userDoc.id;
                    claimedUserEmail = userData.email || '';
                    claimedUserName = userData.displayName || scannedTicket.userName;
                    userPoints = userData.points || 0;

                    // Log prize claim activity with staff/admin info
                    await logPrizeClaim(
                        claimedUserId,
                        claimedUserEmail,
                        claimedUserName,
                        scannedTicket.ticketId || '',
                        scannedTicket.prize,
                        userPoints, // pointsBefore
                        userPoints, // pointsAfter (no change)
                        currentUser?.uid,
                        currentUser?.email || ''
                    );
                    
                    break;
                }
            }
            
            setLastTransaction({
                userName: scannedTicket.userName,
                pointsAdded: 0,
                isDeduction: true,
                prizeName: scannedTicket.prize
            });
            setScannedTicket(null);
        } catch (err) {
            console.error('Claim error:', err);
            setError("ไม่สามารถเคลมรางวัลได้");
        } finally {
            setIsLoading(false);
        }
    };

    const resetScanner = () => {
        setScannedUser(null);
        setScannedTicket(null);
        setError('');
        setPointsToAdd(0);
        setLastTransaction(null);
        setIsScanning(true);
        setManualCode(''); // เคลียร์โค้ดที่กรอก
    };

    const handleManualSubmit = () => {
        if (manualCode.trim()) {
            handleScanSuccess(manualCode.trim());
            setManualCode('');
        } else {
            setError('กรุณากรอกโค้ด');
        }
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
                    <p className="text-red-200 text-sm mt-2">
                        {mode === 'add' ? 'สแกนเพื่อเพิ่มแต้มให้ผู้เข้าร่วมงาน' : 'สแกนตั๋วรางวัลเพื่อเคลม'}
                    </p>
                </div>

                {/* Mode Toggle */}
                {!scannedUser && !scannedTicket && !lastTransaction && (
                    <div className="bg-white/95 rounded-2xl p-4 mb-4 shadow-xl animate-fade-in">
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setMode('add');
                                    setScanMode('camera'); // เพิ่มแต้มใช้กล้องอย่างเดียว
                                    setError('');
                                }}
                                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                                    mode === 'add'
                                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                ➕ เพิ่มแต้ม
                            </button>
                            <button
                                onClick={() => {
                                    setMode('claim');
                                    setError('');
                                }}
                                className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                                    mode === 'claim'
                                        ? 'bg-gradient-to-r from-orange-600 to-red-700 text-white shadow-lg'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                🎁 เคลมรางวัล
                            </button>
                        </div>
                    </div>
                )}

                {/* Success State */}
                {lastTransaction && (
                    <div className="bg-white/95 rounded-3xl p-8 shadow-2xl text-center animate-fade-in">
                        <div className={`w-20 h-20 ${lastTransaction.isDeduction ? 'bg-orange-500' : 'bg-green-500'} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                            <span className="text-4xl text-white">{lastTransaction.isDeduction ? '🎁' : '✓'}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            {lastTransaction.isDeduction ? 'เคลมสำเร็จ! 🎉' : 'เพิ่มแต้มสำเร็จ! 🎉'}
                        </h2>
                        <p className="text-gray-600 mb-4">
                            {lastTransaction.isDeduction 
                                ? <><span className="font-bold text-purple-600">{lastTransaction.userName}</span> เคลมรางวัล</>
                                : <>เพิ่มแต้มให้ <span className="font-bold text-green-600">{lastTransaction.userName}</span></>
                            }
                        </p>
                        {lastTransaction.isDeduction ? (
                            <div className="bg-purple-100 text-purple-700 border-purple-300 font-bold text-xl rounded-2xl px-6 py-4 border-2 mb-6">
                                🎁 {lastTransaction.prizeName}
                            </div>
                        ) : (
                            <div className="bg-green-100 text-green-700 border-green-300 font-bold text-3xl rounded-2xl px-6 py-4 border-2 mb-6">
                                + {lastTransaction.pointsAdded} แต้ม
                            </div>
                        )}
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
                                <label className="text-gray-700 text-sm font-bold mb-2 block">
                                    {mode === 'add' ? 'จำนวนแต้มที่ต้องการเพิ่ม' : 'จำนวนแต้มที่ต้องการหัก'}
                                </label>
                                <input
                                    type="number"
                                    value={pointsToAdd || ''}
                                    onChange={(e) => setPointsToAdd(parseInt(e.target.value, 10) || 0)}
                                    placeholder="เช่น 10, 20, 50..."
                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                />
                            </div>
                            
                            {/* เพิ่ม: ช่องกรอกเหตุผล */}
                            <div>
                                <label className="text-gray-700 text-sm font-bold mb-2 block">
                                    เหตุผลในการเพิ่มแต้ม <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={pointsReason}
                                    onChange={(e) => setPointsReason(e.target.value)}
                                    placeholder="เช่น ซื้อของ, เล่นเกม, เข้าร่วมกิจกรรม..."
                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    maxLength={100}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    จะถูกบันทึกใน Activity Log
                                </p>
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
                                disabled={isLoading || pointsToAdd <= 0 || !pointsReason.trim()}
                                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-2xl py-4 font-bold shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="loading loading-spinner loading-sm" />
                                        กำลังเพิ่ม...
                                    </span>
                                ) : (
                                    `✓ เพิ่ม ${pointsToAdd} แต้ม`
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

                {/* Ticket Found - Claim Prize */}
                {scannedTicket && (
                    <div className="bg-white/95 rounded-3xl p-6 shadow-2xl animate-fade-in">
                        <div className="flex flex-col items-center mb-6">
                            <div className="text-6xl mb-4 animate-bounce">{scannedTicket.emoji}</div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-1">{scannedTicket.prize}</h2>
                            <p className="text-gray-500 text-sm mb-2">เจ้าของตั๋ว: {scannedTicket.userName}</p>
                            
                            {/* Ticket Status */}
                            {scannedTicket.claimed ? (
                                <div className="mt-3 bg-red-100 border-2 border-red-300 rounded-xl px-4 py-2">
                                    <span className="text-red-700 font-bold">❌ ตั๋วนี้ถูกเคลมไปแล้ว</span>
                                </div>
                            ) : (
                                <div className="mt-3 bg-green-100 border-2 border-green-300 rounded-xl px-4 py-2">
                                    <span className="text-green-700 font-bold">✅ พร้อมเคลมรางวัล</span>
                                </div>
                            )}
                        </div>

                        <div className="bg-purple-50 rounded-xl p-4 border-2 border-dashed border-purple-300 mb-4">
                            <div className="text-xs text-gray-600 mb-1 text-center font-semibold">รหัสตั๋ว</div>
                            <div className="text-center font-mono text-sm font-bold text-purple-700 break-all">
                                {scannedTicket.ticketId}
                            </div>
                            <div className="text-xs text-gray-500 mt-2 text-center">
                                {new Date(scannedTicket.timestamp).toLocaleString('th-TH')}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {!scannedTicket.claimed && (
                                <button 
                                    onClick={handleClaimPrize} 
                                    disabled={isLoading}
                                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:bg-gray-400 text-white rounded-2xl py-4 font-bold shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="loading loading-spinner loading-sm" />
                                            กำลังเคลม...
                                        </span>
                                    ) : (
                                        '🎁 ยืนยันเคลมรางวัล'
                                    )}
                                </button>
                            )}
                            <button 
                                onClick={resetScanner} 
                                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl py-3 transition-all font-medium"
                            >
                                {scannedTicket.claimed ? 'สแกนต่อ' : 'ยกเลิก'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Scanning State */}
                {isScanning && (
                    <div className="bg-white/95 rounded-3xl p-6 shadow-2xl animate-fade-in">
                        {/* Toggle Scan Mode - เฉพาะ "เคลมรางวัล" เท่านั้น */}
                        {mode === 'claim' && (
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => setScanMode('camera')}
                                    className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                                        scanMode === 'camera'
                                            ? 'bg-red-500 text-white shadow-lg'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    📷 สแกนกล้อง
                                </button>
                                <button
                                    onClick={() => setScanMode('manual')}
                                    className={`flex-1 py-2 rounded-xl font-bold transition-all ${
                                        scanMode === 'manual'
                                            ? 'bg-red-500 text-white shadow-lg'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    ⌨️ กรอกรหัส
                                </button>
                            </div>
                        )}

                        {/* Camera Mode หรือ เพิ่มแต้มเท่านั้น */}
                        {(scanMode === 'camera' || mode === 'add') ? (
                            <>
                                <p className="text-center mb-4 text-gray-600 font-medium">
                                    {mode === 'add' 
                                        ? '📷 เล็งกล้องไปที่ QR Code ของผู้เข้าร่วม'
                                        : '📷 เล็งกล้องไปที่ QR Code บนตั๋วรางวัล'
                                    }
                                </p>
                                <div className="overflow-hidden rounded-2xl border-4 border-red-300 bg-black">
                                    <QrScanner onScanSuccess={handleScanSuccess} />
                                </div>
                                <div className="mt-4 text-center">
                                    <p className="text-gray-500 text-sm">
                                        {mode === 'add'
                                            ? '💡 สแกน QR Code จากหน้า Profile ของผู้ใช้'
                                            : '💡 สแกน QR Code จากตั๋วรางวัล'
                                        }
                                    </p>
                                </div>
                            </>
                        ) : (
                            /* Manual Code Input - เฉพาะเคลมรางวัล */
                            <>
                                <p className="text-center mb-4 text-gray-600 font-medium">
                                    ⌨️ กรอกรหัสตั๋วด้วยตัวเอง
                                </p>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-gray-700 text-sm font-bold mb-2 block">
                                            รหัสตั๋ว (Ticket Code)
                                        </label>
                                        <input
                                            type="text"
                                            value={manualCode}
                                            onChange={(e) => setManualCode(e.target.value)}
                                            placeholder="ticket-xxxxxxxx"
                                            className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-sm"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleManualSubmit();
                                                }
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleManualSubmit}
                                        disabled={!manualCode.trim()}
                                        className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-2xl py-4 font-bold shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed"
                                    >
                                        🔍 ค้นหาตั๋ว
                                    </button>
                                    <div className="mt-2 text-center">
                                        <p className="text-gray-500 text-xs">
                                            💡 รหัสอยู่ในกรอบสีม่วงใต้ QR Code ของตั๋ว
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
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
