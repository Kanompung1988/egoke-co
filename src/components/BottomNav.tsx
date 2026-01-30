import { Link, useLocation } from "react-router-dom";
import '../index.css';
import { useAuth } from '../hooks/useAuth';

export default function BottomNav() {
    const location = useLocation();
    const current = location.pathname;
    const { currentUser } = useAuth();

    const isStaff = currentUser?.role === 'staff';
    const isRegister = currentUser?.role === 'register';
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

    // Left side items (ก่อน center button)
    const leftItems = [
        { path: "/Home", icon: "ri-ancient-pavilion-line", label: "หน้าหลัก" },
        { path: "/vote", icon: "ri-music-2-line", label: "โหวต" },
    ];

    // Right side items (หลัง center button)
    const rightItems = [
        { path: "/vap-ig", icon: "ri-instagram-line", label: "IG" },
        { path: "/profile", icon: "ri-user-line", label: "โปรไฟล์" },
    ];

    // เพิ่มปุ่มตาม Role
    if (isAdmin) {
        // Admin/SuperAdmin เห็นปุ่ม "สแกน QR" ข้างโหวต และ "จัดการ" ฝั่งขวา
        leftItems.push({ path: "/qrscan", icon: "ri-qr-scan-2-line", label: "สแกน QR" });
        rightItems.unshift({ path: "/admin", icon: "ri-settings-3-line", label: "จัดการ" });
    } else if (isStaff) {
        // Staff เห็นปุ่ม "สแกน QR" ข้างโหวต
        leftItems.push({ path: "/qrscan", icon: "ri-qr-scan-2-line", label: "สแกน QR" });
    } else if (isRegister) {
        // Register เห็นปุ่ม "สแกน QR" (RegisterScan) ข้างโหวต + "เช็คชื่อ" ฝั่งขวา
        leftItems.push({ path: "/register-scan", icon: "ri-qr-scan-2-line", label: "สแกน" });
        rightItems.unshift({ path: "/register", icon: "ri-file-list-3-line", label: "เช็คชื่อ" });
    }

    return (
        <footer className="fixed bottom-0 left-0 right-0 p-3 z-50">
            <nav className="mx-auto max-w-md">
                <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-white/10 px-2 py-2">
                    <div className="flex justify-around items-center relative">
                        {/* Left Items - หน้าหลัก, โหวต, (QR/Register) */}
                        {leftItems.map((item) => (
                            <Link 
                                key={item.path}
                                to={item.path} 
                                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 ${
                                    current === item.path 
                                        ? "bg-red-500/10 text-red-500 scale-105" 
                                        : "text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/10"
                                }`}
                            >
                                <i className={`${item.icon} text-2xl mb-0.5`}></i>
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        ))}
                        
                        {/* Center Button - Vote Results (ผลโหวต) */}
                        <Link 
                            to="/vote-results" 
                            className={`relative -mt-6 flex items-center justify-center w-16 h-16 rounded-full shadow-xl transition-all duration-300 active:scale-90 ${
                                current === "/vote-results" 
                                    ? "bg-gradient-to-br from-red-500 to-red-600 text-white ring-4 ring-red-500/30" 
                                    : "bg-gradient-to-br from-red-500 to-orange-500 text-white hover:shadow-red-500/40 hover:shadow-2xl"
                            }`}
                        >
                            <i className="ri-bar-chart-fill text-3xl"></i>
                            {current === "/vote-results" && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                            )}
                        </Link>
                        
                        {/* Right Items - (จัดการ), IG, โปรไฟล์ */}
                        {rightItems.map((item) => (
                            <Link 
                                key={item.path}
                                to={item.path} 
                                className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 ${
                                    current === item.path 
                                        ? "bg-red-500/10 text-red-500 scale-105" 
                                        : "text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/10"
                                }`}
                            >
                                <i className={`${item.icon} text-2xl mb-0.5`}></i>
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </nav>
        </footer>
    );
}
