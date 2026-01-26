import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithGoogle, watchAuthState, db } from "../firebaseApp";
import { doc, getDoc } from "firebase/firestore";

export default function Login() {
    const navigate = useNavigate();
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
        setIsLoading(true);
        try {
            const user = await loginWithGoogle();
            if (user) {
                console.log('✅ Login successful, navigating to home...');
                navigate("/Home", { state: { justLoggedIn: true }, replace: true });
            } else {
                console.log('❌ Login returned null');
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
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
            <section className={`relative z-10 bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl max-w-sm w-[90%] text-center transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="space-y-5 animate-fade-in">
                    <div className="text-center mb-4">
                        <div className="text-6xl mb-3 animate-float">⛩️</div>
                        <h2 className="text-xl font-bold text-gray-800 mb-1">ยินดีต้อนรับ</h2>
                        <p className="text-gray-500 text-sm">เข้าสู่ระบบเพื่อเริ่มต้น</p>
                    </div>
                    
                    <button 
                        onClick={handleGoogleLogin} 
                        disabled={isLoading} 
                        className="w-full bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 rounded-xl py-3.5 flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 font-medium"
                    >
                        {isLoading ? (
                            <>
                                <span className="loading loading-spinner loading-sm" />
                                <span>กำลังเข้าสู่ระบบ...</span>
                            </>
                        ) : (
                            <>
                                <svg aria-label="Google logo" width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                                    <g>
                                        <path d="m0 0H512V512H0" fill="#fff"></path>
                                        <path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"></path>
                                        <path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"></path>
                                        <path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"></path>
                                        <path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"></path>
                                    </g>
                                </svg>
                                <span>Continue with Google</span>
                            </>
                        )}
                    </button>

                    <p className="text-xs text-gray-400 mt-4">
                        ระบบจะจำบัญชีของคุณไว้โดยอัตโนมัติ
                    </p>
                </div>
            </section>
        </main>
    );
}
