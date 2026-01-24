import BottomNav from "../components/BottomNav";
import { useAuth } from "../hooks/useAuth";

export default function Vote() {
    const { currentUser } = useAuth();

    return (
        <div className="min-h-screen relative overflow-hidden pb-24">
            {/* Background - Red Theme */}
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/art/temple-bg.png')" }}
            />
            <div className="absolute inset-0 bg-red-900/40" />
            
            {/* Fireworks */}
            <div className="fireworks-container">
                <div className="firework firework-1"></div>
                <div className="firework firework-2"></div>
                <div className="firework firework-3"></div>
            </div>

            {/* Content */}
            <main className="relative z-10 container mx-auto max-w-lg px-4 pt-6">
                {/* Header */}
                <div className="text-center mb-6 animate-fade-in">
                    <img 
                        src="/logo.jpg" 
                        alt="Logo" 
                        className="w-16 h-16 mx-auto mb-2 rounded-xl shadow-xl border-2 border-white/30"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/art/logo.png'; }}
                    />
                    <h1 className="text-2xl font-bold text-white drop-shadow-lg">โหวต</h1>
                    <p className="text-white/70 text-sm">เลือกศิลปินที่คุณชื่นชอบ</p>
                </div>

                {/* Coming Soon Card */}
                <div className="bg-white/95 rounded-2xl p-6 shadow-xl text-center animate-fade-in">
                    {/* Icon */}
                    <div className="mb-4">
                        <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-4xl">🎌</span>
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-bold text-gray-800 mb-2">เร็วๆ นี้!</h2>
                    <p className="text-gray-600 text-sm mb-5">
                        ระบบโหวตกำลังจะเปิดให้บริการเร็วๆ นี้<br/>
                        ติดตามข่าวสารได้ที่หน้าหลัก
                    </p>

                    {/* Feature Preview */}
                    <div className="space-y-2 mb-5 text-left">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-xl">🎤</span>
                            <div>
                                <p className="text-gray-800 font-medium text-sm">โหวตนักร้องคาราโอเกะ</p>
                                <p className="text-gray-500 text-xs">เลือกคนที่ร้องเพลงเก่งที่สุด</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-xl">🎭</span>
                            <div>
                                <p className="text-gray-800 font-medium text-sm">โหวต Cosplay</p>
                                <p className="text-gray-500 text-xs">คอสเพลย์ที่คุณชื่นชอบ</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-xl">🏆</span>
                            <div>
                                <p className="text-gray-800 font-medium text-sm">ดูผลโหวต</p>
                                <p className="text-gray-500 text-xs">ติดตามผลแบบ Real-time</p>
                            </div>
                        </div>
                    </div>

                    {/* User Status */}
                    {currentUser && (
                        <div className="bg-green-50 rounded-xl p-3 border border-green-100 mb-4">
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-green-600">✓</span>
                                <p className="text-green-700 font-medium text-sm">คุณพร้อมโหวตแล้ว!</p>
                            </div>
                            <p className="text-green-600 text-xs mt-1">
                                ล็อกอินเรียบร้อย - รอระบบเปิดใช้งาน
                            </p>
                        </div>
                    )}

                    {/* Notify Button */}
                    <button 
                        className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-bold shadow-lg transition-all active:scale-95"
                        onClick={() => alert('จะแจ้งเตือนเมื่อเปิดใช้งาน!')}
                    >
                        🔔 แจ้งเตือนเมื่อเปิดใช้งาน
                    </button>
                </div>

                {/* Info */}
                <div className="mt-4 text-center">
                    <p className="text-white/60 text-xs">
                        ⏳ คาดว่าจะเปิดให้บริการในวันงาน
                    </p>
                </div>
            </main>

            <BottomNav />
        </div>
    );
}
