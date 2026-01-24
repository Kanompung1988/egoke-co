import QRCode from "react-qr-code";
import { useAuth } from "../hooks/useAuth";
import BottomNav from "../components/BottomNav";
import { useNavigate } from "react-router-dom";
import { logout } from "../firebaseApp";

export default function Me() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen relative overflow-hidden pb-24">
            {/* Background - Red Theme */}
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/art/temple-bg.png')" }}
            />
            <div className="absolute inset-0 bg-red-900/50" />
            
            {/* Fireworks */}
            <div className="fireworks-container">
                <div className="firework firework-1"></div>
                <div className="firework firework-2"></div>
            </div>

            {/* Content */}
            <main className="relative z-10 container mx-auto max-w-lg px-4 pt-6">
                {/* Header */}
                <div className="text-center mb-4 animate-fade-in">
                    <img 
                        src="/logo.jpg" 
                        alt="Logo" 
                        className="w-16 h-16 mx-auto mb-2 rounded-xl shadow-xl border-2 border-white/30"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/art/logo.png'; }}
                    />
                    <h1 className="text-2xl font-bold text-white drop-shadow-lg">โปรไฟล์ของคุณ</h1>
                    <p className="text-white/70 text-sm">ข้อมูลบัญชีและ QR Code</p>
                </div>

                {currentUser ? (
                    <div className="animate-fade-in">
                        {/* Profile Card */}
                        <div className="bg-white/95 rounded-2xl p-5 shadow-xl mb-4">
                            {/* Avatar & Info */}
                            <div className="flex items-center gap-4 mb-4">
                                <img
                                    src={currentUser.photoURL || 'https://via.placeholder.com/150'}
                                    alt="Profile"
                                    className="w-16 h-16 rounded-full border-3 border-red-500 shadow-lg"
                                />
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">{currentUser.displayName}</h2>
                                    <p className="text-gray-500 text-sm">{currentUser.email}</p>
                                </div>
                            </div>

                            {/* Points */}
                            <div className="flex gap-3 mb-4">
                                <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center border border-amber-200">
                                    <span className="text-2xl">💰</span>
                                    <div className="text-xl font-bold text-amber-600">{currentUser.points || 0}</div>
                                    <div className="text-xs text-amber-700">แต้มสะสม</div>
                                </div>
                                <div className="flex-1 bg-purple-50 rounded-xl p-3 text-center border border-purple-200">
                                    <span className="text-2xl">🎫</span>
                                    <div className="text-xl font-bold text-purple-600">-</div>
                                    <div className="text-xs text-purple-700">ตั๋วที่ได้รับ</div>
                                </div>
                            </div>

                            {/* QR Code */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <p className="text-center text-gray-600 text-sm font-medium mb-2">QR Code ของคุณ</p>
                                <p className="text-center text-gray-400 text-xs mb-3">ใช้สำหรับรับแต้มจาก Staff</p>
                                <div className="flex justify-center bg-white p-3 rounded-lg">
                                    <QRCode 
                                        value={currentUser.uid} 
                                        size={140}
                                        bgColor="#ffffff"
                                        fgColor="#1e1e1e"
                                    />
                                </div>
                                <p className="text-center text-gray-400 text-xs mt-2 font-mono">
                                    ID: {currentUser.uid.slice(0, 12)}...
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2">
                            <button
                                onClick={() => navigate('/game')}
                                className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-bold shadow-lg transition-all active:scale-95"
                            >
                                🎡 ไปหมุนวงล้อ
                            </button>
                            
                            <button
                                onClick={handleLogout}
                                className="w-full bg-white/90 hover:bg-white text-red-500 border border-red-200 rounded-xl py-3 font-medium transition-all active:scale-95"
                            >
                                🚪 ออกจากระบบ
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="animate-pulse">
                            <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-4"></div>
                            <div className="h-5 bg-white/20 rounded w-40 mx-auto mb-2"></div>
                            <div className="h-4 bg-white/20 rounded w-28 mx-auto"></div>
                        </div>
                        <p className="text-white/60 mt-4 text-sm">กำลังโหลดข้อมูล...</p>
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
}
