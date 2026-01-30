import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseApp";
import { useAuth } from "../hooks/useAuth";
import BottomNav from "../components/BottomNav";
import QrScanner from "../components/QrScanner";
import { logAttendanceCheck } from "../utils/activityLogger";

type Day = "day1" | "day2" | "day3";

interface DayOption {
    id: Day;
    label: string;
    color: string;
}

const DAYS: DayOption[] = [
    { id: "day1", label: "D1", color: "from-red-500 to-pink-500" },
    { id: "day2", label: "D2", color: "from-purple-500 to-indigo-500" },
    { id: "day3", label: "D3", color: "from-blue-500 to-cyan-500" },
];

interface UserData {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    points: number;
    role: string;
    attendance?: {
        day1?: boolean;
        day2?: boolean;
        day3?: boolean;
    };
}

interface LastTransaction {
    userName: string;
    day: string;
    checked: boolean;
}

export default function RegisterScan() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    
    const [selectedDay, setSelectedDay] = useState<Day>("day1");
    const [scannedUser, setScannedUser] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [lastTransaction, setLastTransaction] = useState<LastTransaction | null>(null);
    const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');
    const [manualCode, setManualCode] = useState('');

    // ตรวจสอบสิทธิ์ - เฉพาะ Register เท่านั้น (เข้มงวด)
    useEffect(() => {
        if (!currentUser) {
            navigate("/login");
            return;
        }
        // ✅ เฉพาะ role "register" เท่านั้น
        if (currentUser.role !== "register") {
            console.warn("Access denied: Only register role can access this page");
            navigate("/");
            return;
        }
    }, [currentUser, navigate]);

    // Show loading while checking auth
    if (!currentUser || currentUser.role !== "register") {
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
        setIsLoading(true);
        setError('');
        
        try {
            await handleUserScan(scannedData);
        } catch (err) {
            console.error('Scan error:', err);
            setError("เกิดข้อผิดพลาดในการสแกน");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUserScan = async (uid: string) => {
        try {
            const userRef = doc(db, "users", uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                throw new Error("ไม่พบผู้ใช้นี้ในระบบ");
            }

            const userData = { uid: userSnap.id, ...userSnap.data() } as UserData;
            setScannedUser(userData);

        } catch (err: any) {
            console.error("Error scanning user:", err);
            setError(err.message || "ไม่พบผู้ใช้นี้ในระบบ");
        }
    };

    const handleCheckIn = async () => {
        if (!scannedUser || !currentUser) return;

        setIsLoading(true);
        setError('');

        try {
            const userRef = doc(db, "users", scannedUser.uid);
            const currentStatus = scannedUser.attendance?.[selectedDay] || false;
            const newStatus = !currentStatus;

            // อัปเดต attendance
            await updateDoc(userRef, {
                [`attendance.${selectedDay}`]: newStatus,
                updatedAt: serverTimestamp(),
            });

            // บันทึก Activity Log
            await logAttendanceCheck(
                scannedUser.uid,
                scannedUser.email,
                scannedUser.displayName,
                selectedDay.toUpperCase().replace("DAY", "D"),
                newStatus,
                currentUser.uid,
                currentUser.email || "unknown",
                scannedUser.points,
                scannedUser.points
            );

            setLastTransaction({
                userName: scannedUser.displayName,
                day: selectedDay.toUpperCase().replace("DAY", "D"),
                checked: newStatus,
            });

            setScannedUser(null);
            setManualCode('');

        } catch (err: any) {
            console.error("Error checking in:", err);
            setError(err.message || "เกิดข้อผิดพลาดในการเช็คชื่อ");
        } finally {
            setIsLoading(false);
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode.trim()) {
            handleScanSuccess(manualCode.trim());
        }
    };

    const resetScanner = () => {
        setScannedUser(null);
        setError('');
        setManualCode('');
    };

    return (
        <div className="min-h-screen bg-gray-100 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 shadow-lg">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-3xl font-bold mb-2">📋 เช็คชื่อผู้เข้าร่วมงาน</h1>
                    <p className="text-purple-100">Register: {currentUser.email}</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-6">
                {/* Day Selector */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        📅 เลือกวัน
                    </h2>
                    <div className="grid grid-cols-3 gap-4">
                        {DAYS.map((day) => (
                            <button
                                key={day.id}
                                onClick={() => setSelectedDay(day.id)}
                                disabled={!!scannedUser || isLoading}
                                className={`p-4 rounded-xl font-bold text-white text-lg transition-all duration-300 disabled:opacity-50 ${
                                    selectedDay === day.id
                                        ? `bg-gradient-to-r ${day.color} shadow-lg scale-105`
                                        : "bg-gray-400 hover:bg-gray-500"
                                }`}
                            >
                                {day.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mode Toggle */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => {
                                setScanMode('camera');
                                setManualCode('');
                            }}
                            disabled={!!scannedUser || isLoading}
                            className={`p-4 rounded-xl font-bold transition-all disabled:opacity-50 ${
                                scanMode === 'camera'
                                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                        >
                            📷 Scan QR Code
                        </button>
                        <button
                            onClick={() => setScanMode('manual')}
                            disabled={!!scannedUser || isLoading}
                            className={`p-4 rounded-xl font-bold transition-all disabled:opacity-50 ${
                                scanMode === 'manual'
                                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                        >
                            ⌨️ กรอกโค้ด
                        </button>
                    </div>
                </div>

                {/* QR Scanner */}
                {scanMode === 'camera' && !scannedUser && (
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <QrScanner
                            onScanSuccess={handleScanSuccess}
                        />
                    </div>
                )}

                {/* Manual Input */}
                {scanMode === 'manual' && !scannedUser && (
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">กรอก User ID</h3>
                        <form onSubmit={handleManualSubmit} className="space-y-4">
                            <input
                                type="text"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                placeholder="กรอก User ID หรือ Paste QR Code..."
                                className="w-full p-4 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none text-lg"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !manualCode.trim()}
                                className="w-full p-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? "กำลังค้นหา..." : "🔍 ค้นหา"}
                            </button>
                        </form>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                            <p className="font-bold">❌ {error}</p>
                            <button
                                onClick={() => setError('')}
                                className="text-red-700 hover:text-red-900"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* Last Transaction */}
                {lastTransaction && !scannedUser && (
                    <div className="bg-green-100 border-l-4 border-green-500 p-4 rounded-xl">
                        <p className="text-green-700 font-bold">
                            ✅ {lastTransaction.checked ? 'เช็คชื่อสำเร็จ' : 'ยกเลิกเช็คชื่อ'}: {lastTransaction.userName} ({lastTransaction.day})
                        </p>
                    </div>
                )}

                {/* Scanned User Card */}
                {scannedUser && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-800">ข้อมูลผู้ใช้</h3>
                            <button
                                onClick={resetScanner}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ✕
                            </button>
                        </div>
                        
                        {/* User Info */}
                        <div className="flex items-center gap-4 pb-6 border-b-2 border-gray-200">
                            {scannedUser.photoURL ? (
                                <img
                                    src={scannedUser.photoURL}
                                    alt={scannedUser.displayName}
                                    className="w-20 h-20 rounded-full border-4 border-indigo-500 shadow-lg"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-3xl text-white font-bold shadow-lg">
                                    {scannedUser.displayName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1">
                                <h4 className="text-2xl font-bold text-gray-800">{scannedUser.displayName}</h4>
                                <p className="text-gray-600">{scannedUser.email}</p>
                                <p className="text-sm text-gray-500">แต้ม: {scannedUser.points}</p>
                            </div>
                        </div>

                        {/* Attendance Status for Selected Day */}
                        <div>
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl">
                                <div>
                                    <p className="text-lg font-bold text-gray-800">
                                        {DAYS.find(d => d.id === selectedDay)?.label} - สถานะ
                                    </p>
                                </div>
                                <div className="text-4xl">
                                    {scannedUser.attendance?.[selectedDay] ? "✅" : "❌"}
                                </div>
                            </div>
                        </div>

                        {/* All Days Status */}
                        <div>
                            <p className="text-sm font-bold text-gray-600 mb-3">สถานะทุกวัน:</p>
                            <div className="grid grid-cols-3 gap-3">
                                {DAYS.map((day) => (
                                    <div
                                        key={day.id}
                                        className={`p-3 rounded-xl text-center ${
                                            scannedUser.attendance?.[day.id]
                                                ? "bg-green-100 border-2 border-green-500"
                                                : "bg-gray-100 border-2 border-gray-300"
                                        }`}
                                    >
                                        <p className="font-bold text-sm">{day.label}</p>
                                        <p className="text-2xl">{scannedUser.attendance?.[day.id] ? "✅" : "❌"}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={resetScanner}
                                disabled={isLoading}
                                className="p-4 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleCheckIn}
                                disabled={isLoading}
                                className={`p-4 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition disabled:opacity-50 ${
                                    scannedUser.attendance?.[selectedDay]
                                        ? "bg-gradient-to-r from-red-500 to-pink-500"
                                        : "bg-gradient-to-r from-green-500 to-emerald-500"
                                }`}
                            >
                                {isLoading
                                    ? "กำลังบันทึก..."
                                    : scannedUser.attendance?.[selectedDay]
                                    ? `❌ ยกเลิกเช็ค ${DAYS.find(d => d.id === selectedDay)?.label}`
                                    : `✅ เช็คชื่อ ${DAYS.find(d => d.id === selectedDay)?.label}`}
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && !scannedUser && (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                        <p className="text-gray-600 text-lg">กำลังโหลดข้อมูล...</p>
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
