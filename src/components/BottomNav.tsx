import { Link, useLocation } from "react-router-dom";
import '../index.css';
import { useAuth } from '../hooks/useAuth';

export default function BottomNav() {
    const location = useLocation();
    const current = location.pathname;
    const { currentUser } = useAuth();

    const isAdminOrStaff = currentUser?.role === 'admin' || currentUser?.role === 'staff' || currentUser?.role === 'superadmin';

    const navItems = [
        { path: "/Home", icon: "ri-ancient-pavilion-line", label: "หน้าหลัก", emoji: "⛩️" },
        { path: "/vote", icon: "ri-music-ai-line", label: "โหวต", emoji: "🗳️" },
        // Center button handled separately
        { path: "/vote-results", icon: "ri-bar-chart-line", label: "ผลโหวต", emoji: "📊" },
        { path: "/vap-ig", icon: "ri-instagram-line", label: "IG", emoji: "📸" },
        { path: "/profile", icon: "ri-user-fill", label: "โปรไฟล์", emoji: "👤" },
    ];

    // เพิ่มปุ่ม Admin สำหรับ Admin/Staff/SuperAdmin
    if (isAdminOrStaff) {
        navItems.splice(4, 0, { path: "/admin", icon: "ri-admin-line", label: "จัดการ", emoji: "🛡️" });
    }

    return (
        <footer className="fixed bottom-0 left-0 right-0 p-3 z-50">
            <nav className="mx-auto max-w-md">
                <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-white/10 px-2 py-2">
                    <div className="flex justify-around items-center relative">
                        {/* Left Items */}
                        {navItems.slice(0, 2).map((item) => (
                            <Link 
                                key={item.path}
                                to={item.path} 
                                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 ${
                                    current === item.path 
                                        ? "bg-red-500/10 text-red-500 scale-105" 
                                        : "text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/10"
                                }`}
                            >
                                <span className={`text-xl mb-0.5 ${current === item.path ? 'animate-bounce-soft' : ''}`}>
                                    {item.emoji}
                                </span>
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        ))}
                        
                        {/* Center Button - Game or QR Scan */}
                        {(currentUser === null || !currentUser.role || currentUser.role.toLowerCase() === "none") ? (
                            <Link 
                                to="/game" 
                                className={`relative -mt-6 flex items-center justify-center w-16 h-16 rounded-full shadow-xl transition-all duration-300 active:scale-90 ${
                                    current === "/game" 
                                        ? "bg-gradient-to-br from-red-500 to-red-600 text-white ring-4 ring-red-500/30" 
                                        : "bg-gradient-to-br from-red-500 to-orange-500 text-white hover:shadow-red-500/40 hover:shadow-2xl"
                                }`}
                            >
                                <span className="text-3xl">🎡</span>
                                {current === "/game" && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                                )}
                            </Link>
                        ) : isAdminOrStaff && (
                            <Link 
                                to="/qrscan" 
                                className={`relative -mt-6 flex items-center justify-center w-16 h-16 rounded-full shadow-xl transition-all duration-300 active:scale-90 ${
                                    current === "/qrscan" 
                                        ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white ring-4 ring-blue-500/30" 
                                        : "bg-gradient-to-br from-blue-500 to-purple-500 text-white hover:shadow-blue-500/40 hover:shadow-2xl"
                                }`}
                            >
                                <span className="text-3xl">📱</span>
                                {current === "/qrscan" && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                                )}
                            </Link>
                        )}
                        
                        {/* Right Items */}
                        {navItems.slice(2).map((item) => (
                            <Link 
                                key={item.path}
                                to={item.path} 
                                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 ${
                                    current === item.path 
                                        ? "bg-red-500/10 text-red-500 scale-105" 
                                        : "text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/10"
                                }`}
                            >
                                <span className={`text-xl mb-0.5 ${current === item.path ? 'animate-bounce-soft' : ''}`}>
                                    {item.emoji}
                                </span>
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </nav>
        </footer>
    );
}
