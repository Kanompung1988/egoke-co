import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithGoogle, loginAsStaff, watchAuthState, db } from "../firebaseApp";
import { doc, getDoc } from "firebase/firestore";

export default function Login() {
    const navigate = useNavigate();
    const [showStaffForm, setShowStaffForm] = useState(false);
    const [staffCode, setStaffCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const unsubscribe = watchAuthState(async (user) => {
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    navigate("/Home");
                }
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleGoogleLogin = async () => {
        console.log('🔵 Starting Google login...');
        console.log('Current domain:', window.location.hostname);
        setIsLoading(true);
        try {
            const user = await loginWithGoogle();
            console.log('Login result:', user ? '✅ Success' : '❌ Failed');
            if (user) {
                console.log('🚀 Navigating to /Home');
                // รอให้ AuthContext อัปเดต state ก่อน navigate
                setTimeout(() => {
                    navigate("/Home", { state: { justLoggedIn: true }, replace: true });
                }, 500);
            } else {
                console.error('❌ Login returned null - check Console for details');
                window.alert('เข้าสู่ระบบไม่สำเร็จ\n\nกรุณา:\n1. เปิด Console (F12)\n2. ดู error message\n3. เช็คว่า domain ถูก authorize ใน Firebase');
            }
        } catch (error) {
            console.error('❌ Login error in component:', error);
            window.alert('เกิดข้อผิดพลาด:\n' + (error as Error).message + '\n\nเปิด Console (F12) เพื่อดูรายละเอียด');
        }
        setIsLoading(false);
    };

    const handleStaffLogin = async () => {
        if (staffCode.trim() === "") {
            window.alert("กรุณากรอก Staff Code");
            return;
        }
        setIsLoading(true);
        const { user, error } = await loginAsStaff(staffCode.trim());
        if (user) {
            navigate("/Home", { state: { justLoggedIn: true } });
        } else if (error) {
            window.alert(error);
        }
        setIsLoading(false);
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
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

            {/* Logo and Title */}
            <div className={`relative z-10 mb-5 text-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
                <img 
                    src="/logo.jpg" 
                    alt="EG'OKE Logo" 
                    className="w-28 h-28 mx-auto mb-3 rounded-2xl shadow-2xl border-3 border-white/30"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = '/art/logo.png';
                    }}
                />
                <h1 className="text-4xl font-bold text-white drop-shadow-lg tracking-wider">
                    EG'OKE
                </h1>
                <p className="text-white/80 text-base mt-1">Japanese Festival 2025</p>
            </div>

            {/* Login Card */}
            <section className={`relative z-10 bg-white/95 p-6 rounded-2xl shadow-2xl max-w-sm w-[90%] text-center transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

                {showStaffForm ? (
                    // Staff Login Form
                    <div className="space-y-4 animate-fade-in">
                        <div className="text-center mb-4">
                            <svg className="w-12 h-12 mx-auto text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                <path d="M16 11l2 2 4-4"/>
                            </svg>
                            <h2 className="text-lg font-bold text-gray-800 mt-2">Staff Login</h2>
                        </div>
                        <input
                            type="text"
                            placeholder="Enter Staff Code"
                            value={staffCode}
                            onChange={(e) => setStaffCode(e.target.value)}
                            className="w-full bg-gray-50 text-gray-800 placeholder:text-gray-400 border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all"
                        />
                        <button
                            onClick={handleStaffLogin}
                            disabled={isLoading}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="loading loading-spinner loading-sm" />
                                    Signing in...
                                </span>
                            ) : (
                                "Login as Staff"
                            )}
                        </button>
                        <button
                            onClick={() => setShowStaffForm(false)}
                            className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                        >
                            ← กลับหน้าหลัก
                        </button>
                    </div>
                ) : (
                    // Main Login Options
                    <div className="space-y-4 animate-fade-in">
                        <div className="text-center mb-3">
                            <svg className="w-12 h-12 mx-auto text-red-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                            </svg>
                            <h2 className="text-lg font-bold text-gray-800 mt-2">ยินดีต้อนรับ</h2>
                            <p className="text-gray-500 text-sm">เข้าสู่ระบบเพื่อเริ่มต้น</p>
                        </div>
                        
                        <button 
                            onClick={handleGoogleLogin} 
                            disabled={isLoading} 
                            className="w-full bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 rounded-xl py-3 flex items-center justify-center gap-3 shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <span className="loading loading-spinner loading-sm" />
                            ) : (
                                <svg aria-label="Google logo" width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                                    <g>
                                        <path d="m0 0H512V512H0" fill="#fff"></path>
                                        <path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"></path>
                                        <path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"></path>
                                        <path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"></path>
                                        <path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"></path>
                                    </g>
                                </svg>
                            )}
                            {isLoading ? "Signing in..." : "Continue with Google"}
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-3 bg-white text-gray-400">หรือ</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowStaffForm(true)}
                            className="w-full bg-gray-800 hover:bg-gray-900 text-white rounded-xl py-3 font-medium shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                <path d="M16 11l2 2 4-4"/>
                            </svg>
                            Staff Login
                        </button>
                    </div>
                )}
            </section>
        </main>
    );
}
