import { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import BottomNav from "../components/BottomNav";
import { LuJapaneseYen, LuSend, LuImage, LuUser, LuMessageSquare, LuShield, LuCalendar, LuActivity, LuTriangleAlert, LuCheck, LuX } from 'react-icons/lu';

import { db, watchAuthState, getUserProfile, deductPointsFromUser } from "../firebaseApp";
import { doc, onSnapshot, updateDoc, increment, getDoc, writeBatch } from "firebase/firestore";

const SUBMISSION_COST = 50;
const MAX = 22;

const rules = [
    {
        title: "ห้ามส่งวาร์ป IG ที่เจ้าของบัญชีไม่ได้ยินยอม",
        desc: "เพื่อป้องกันการละเมิดสิทธิส่วนบุคคลและการนำข้อมูลไปใช้โดยไม่ได้รับอนุญาต"
    },
    {
        title: "ห้ามวาร์ป IG ที่มีเนื้อหาไม่เหมาะสม",
        desc: "เช่น เนื้อหา 18+, ลามก, ความรุนแรง, หรือละเมิดผู้อื่น"
    },
    {
        title: "ห้ามวาร์ปปลอม / บัญชีสวมรอย / phishing",
        desc: "เพื่อป้องกันการหลอกลวงและการโดนขโมยข้อมูลส่วนตัว"
    },
    {
        title: "ห้ามสแปมวาร์ปซ้ำหรือจำนวนมากเกินไป",
        desc: "ส่งได้เฉพาะเวลาที่เหมาะสมและไม่รบกวนคนอื่น"
    },
    {
        title: "ห้ามแนบข้อความดูหมิ่น หรือคอมเมนต์เชิงลบ",
        desc: "ต้องเคารพเจ้าของ IG ทุกคน"
    },
    {
        title: "ห้ามใช้วาร์ปในทางการค้าโดยไม่ได้รับอนุญาต",
        desc: "เช่น โปรโมตสินค้าหรือบริการแฝงโดยไม่ได้รับอนุมัติจากแอดมิน"
    },
    {
        title: "ห้ามวาร์ปบัญชีส่วนตัว / ปิดไว้ (Private)",
        desc: "เว้นแต่เจ้าของบัญชีอนุญาตให้เผยแพร่ได้"
    },
    {
        title: "ห้ามวาร์ปที่มีเนื้อหาทางการเมืองหรือศาสนา",
        desc: "เพื่อหลีกเลี่ยงความขัดแย้งในคอมมูนิตี้"
    }
];

export default function Contact() {
    const [title, setTitle] = useState<string>("");
    const [subtitle, setSubtitle] = useState<string>("");
    const [imageFile, setImageFile] = useState<File | null>(null);

    const [user, setUser] = useState<User | null>(null);
    const [userPoints, setUserPoints] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    const [pageLoading, setPageLoading] = useState<boolean>(true);
    const [isWarpActive, setIsWarpActive] = useState<boolean>(false);
    const [currentCount, setCurrentCount] = useState<number>(0);

    const [loading, setLoading] = useState<boolean>(false); // Loading for submit form
    const [adminLoading, setAdminLoading] = useState<boolean>(false); // Loading for Admin buttons

    const [error, setError] = useState<string | null>(null);

    const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<"status" | "schedule" | "rules">("status");
    const [showRulesConfirmModal, setShowRulesConfirmModal] = useState<boolean>(false);

    useEffect(() => {
        const unsubscribe = watchAuthState(async (currentUser) => {
            setUserRole(null); // Reset role when user changes
            if (currentUser) {
                setUser(currentUser);
                // Fetch profile (points)
                const profile = await getUserProfile(currentUser.uid);
                if (profile) {
                    setUserPoints(profile.points);
                }
                // Fetch role separately
                try {
                    const userDocRef = doc(db, "users", currentUser.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        setUserRole(userDocSnap.data().role); // Store role
                    } else {
                        console.warn("User document not found for role check:", currentUser.uid);
                    }
                } catch (roleError) {
                    console.error("Error fetching user role:", roleError);
                }

            } else {
                setUser(null);
                setUserPoints(null);
            }
        });

        return () => unsubscribe();
    }, [db]); // Added db to dependency array

    useEffect(() => {
        const statusDocRef = doc(db, "warpStatus", "current");
        const unsubscribe = onSnapshot(statusDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setIsWarpActive(data.canSend);
                setCurrentCount(data.senderCount);
            } else {
                console.error("Warp status document does not exist!");
                setIsWarpActive(false);
            }
            setPageLoading(false); // pageLoading finishes when status data is loaded
        }, (err) => {
            console.error("Error listening to warp status:", err);
            setError("ไม่สามารถโหลดสถานะระบบได้");
            setPageLoading(false);
        });
        return () => unsubscribe();
    }, [db]);

    // --- Admin Functions ---

    const handleToggleSystem = async () => {
        if (userRole !== 'Admin' || adminLoading) return;
        setAdminLoading(true);
        setError(null);
        const statusDocRef = doc(db, "warpStatus", "current");
        try {
            await updateDoc(statusDocRef, { canSend: !isWarpActive });
            console.log("System status toggled successfully.");
        } catch (err: any) {
            console.error("Error toggling system status:", err);
            setError(`Failed to toggle system: ${err.message}`);
        } finally {
            setAdminLoading(false);
        }
    };

    const handleResetCount = async () => {
        if (userRole !== 'Admin' || adminLoading) return;
        if (!confirm("Are you sure you want to reset the sender count to 0?")) return; // Add confirmation

        setAdminLoading(true);
        setError(null);
        const statusDocRef = doc(db, "warpStatus", "current");
        try {
            const batch = writeBatch(db);
            batch.update(statusDocRef, { senderCount: 0 });
            // Optional: If resetting while disabled, enable it too
            // if (!isWarpActive) {
            //     batch.update(statusDocRef, { canSend: true });
            // }
            await batch.commit();
            console.log("Sender count reset successfully.");
        } catch (err: any) {
            console.error("Error resetting sender count:", err);
            setError(`Failed to reset count: ${err.message}`);
        } finally {
            setAdminLoading(false);
        }
    };


    const handleConfirmSubmit = async () => {
        // --- All Validations ---
        setError(null);

        if (pageLoading) { setError("กำลังโหลดสถานะระบบ กรุณารอสักครู่"); return; }
        if (!isWarpActive) { setError("ระบบยังไม่เปิดใช้งาน หรือรอบนี้เต็มแล้วครับ"); return; }
        if (currentCount >= MAX) { setError("ขออภัย รอบนี้เต็มแล้วครับ"); return; }
        if (!user) { setError("กรุณาล็อกอินก่อนส่งวาร์ปครับ"); return; }
        if (!title || !imageFile) { setError("กรุณากรอกไอจีและเลือกรูปภาพด้วยครับ"); return; }
        if (userPoints === null || userPoints < SUBMISSION_COST) { setError(`แต้มของคุณไม่พอ (ต้องใช้ ${SUBMISSION_COST} แต้ม)`); return; }
        // --- End Validations ---

        setLoading(true);
        setError(null);

        const toBase64 = (file: File): Promise<string> =>
            new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (error) => reject(error);
            });

        try {
            const base64Image = await toBase64(imageFile);
            const imageData = base64Image.replace(/^data:[^;]+;base64,/, "");

            const form = new URLSearchParams();
            form.append("title", title);
            form.append("subtitle", subtitle);
            form.append("mimeType", imageFile.type);
            form.append("imageData", imageData);

            const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwtkGGR-l8gzx4-2rXZUAFk1SGxijnuwrSSIZkhiDzi5WG1HqaX8ROzjXCXefHzbaEgpw/exec";

            const response = await fetch(SCRIPT_URL, { method: "POST", body: form });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();

            if (result.status === "success") {
                try {
                    await deductPointsFromUser(user.uid, SUBMISSION_COST);
                    setUserPoints(prevPoints => (prevPoints !== null ? prevPoints - SUBMISSION_COST : null));

                    try {
                        const statusDocRef = doc(db, "warpStatus", "current");
                        await updateDoc(statusDocRef, { senderCount: increment(1) });
                    } catch (incrementError) {
                        console.error("Upload success, Deducted points, BUT failed to increment senderCount:", incrementError);
                        setError("อัปโหลดสำเร็จและหักแต้มแล้ว แต่เกิดปัญหาในการนับจำนวน กรุณาติดต่อแอดมินด่วน!");
                        setLoading(false);
                        return;
                    }

                    setSuccessMessage(result.message ?? "อัปโหลดสำเร็จแล้วค้าบ! (หักแต้มเรียบร้อย)");
                    setShowSuccessModal(true);
                    setTitle(""); setSubtitle(""); setImageFile(null);
                    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                    if (fileInput) fileInput.value = "";

                } catch (deductError) {
                    console.error("Upload success, but failed to deduct points:", deductError);
                    setError("อัปโหลดสำเร็จ แต่เกิดปัญหาในการหักแต้ม กรุณาติดต่อแอดมิน");
                }
            } else {
                throw new Error(result.message || "เกิดข้อผิดพลาดจากฝั่งเซิร์ฟเวอร์");
            }
        } catch (err: any) {
            setError(err.message || "อัปโหลดไม่สำเร็จ");
            console.error("Upload failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setError(null); // Clear old errors before modal

        // Basic validation before showing modal
        if (!user) { setError("กรุณาล็อกอินก่อนส่งวาร์ปครับ"); return; }
        if (!title || !imageFile) { setError("กรุณากรอกไอจีและเลือกรูปภาพด้วยครับ"); return; }
        if (userPoints === null || userPoints < SUBMISSION_COST) { setError(`แต้มของคุณไม่พอ (ต้องใช้ ${SUBMISSION_COST} แต้ม)`); return; }
        if (!isWarpActive || currentCount >= MAX) { setError("ระบบยังไม่เปิดใช้งาน หรือรอบนี้เต็มแล้วครับ"); return; }

        // If basic checks pass, show confirmation modal
        setShowRulesConfirmModal(true);
    };

    const schedule = [
        { date: "29 Oct.", rounds: [{ name: "รอบ 19:XX", filled: true }, { name: "รอบ 20:XX", filled: false }] },
        { date: "30 Oct.", rounds: [{ name: "รอบ 19:XX", filled: false }, { name: "รอบ 20:XX", filled: false }] },
        { date: "31 Oct.", rounds: [{ name: "รอบ 19:XX", filled: false }, { name: "รอบ 20:XX", filled: false }] },
    ];

    return (
        <div className="min-h-screen bg-[url('/art/temple-bg.png')] bg-cover bg-center bg-fixed text-white relative overflow-hidden">
            {/* Red overlay */}
            <div className="absolute inset-0 bg-red-900/70 z-0"></div>
            
            {/* Fireworks */}
            <div className="fireworks-container">
                <div className="firework firework-1"></div>
                <div className="firework firework-2"></div>
                <div className="firework firework-3"></div>
            </div>

            <BottomNav />

            {/* Loading Overlays */}
            {loading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4 bg-white/10 p-8 rounded-2xl">
                        <div className="w-16 h-16 rounded-full border-4 border-t-red-500 border-red-200 animate-spin" />
                        <div className="text-white font-medium text-lg">กำลังส่ง...</div>
                    </div>
                </div>
            )}
            {adminLoading && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4 bg-white/10 p-8 rounded-2xl">
                        <div className="w-12 h-12 rounded-full border-4 border-t-amber-500 border-amber-200 animate-spin" />
                        <div className="text-white font-medium">Processing Admin Action...</div>
                    </div>
                </div>
            )}

            {/* Admin Buttons */}
            {userRole === 'Admin' && !pageLoading && (
                <div className="absolute top-5 right-5 flex flex-col sm:flex-row gap-2 z-40">
                    <button
                        onClick={handleToggleSystem}
                        disabled={adminLoading}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg ${isWarpActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'} disabled:opacity-50`}
                    > 
                        {isWarpActive ? '🔒 Disable' : '🔓 Enable'} 
                    </button>
                    <button
                        onClick={handleResetCount}
                        disabled={adminLoading || currentCount === 0}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-lg disabled:opacity-50"
                    > 
                        🔄 Reset Count 
                    </button>
                </div>
            )}

            <main className="relative z-10 container mx-auto max-w-screen-lg p-4 md:p-6 pt-8 pb-28">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-black mb-2 drop-shadow-lg">
                        📸 Send Warp IG
                    </h1>
                    <p className="text-red-200 text-lg">แจกวาร์ป IG กันค้าบวัยรุ่น</p>
                </div>

                {/* Points Display */}
                {user && (
                    <div className="flex justify-center mb-8">
                        <div className="bg-white/95 rounded-2xl px-6 py-3 shadow-xl border-2 border-amber-400">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center">
                                    <LuJapaneseYen className="text-white text-xl" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">คะแนนของคุณ</p>
                                    <p className="text-2xl font-black text-gray-800">{userPoints ?? "..."}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ----- Column 1: Status Card ----- */}
                    <div className="bg-white/95 p-6 rounded-2xl shadow-2xl">
                        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                            <LuActivity className="text-red-500" />
                            สถานะการส่งวาร์ป
                        </h2>
                        
                        {/* Tab Buttons */}
                        <div className="flex gap-2 mb-4">
                            <button
                                type="button"
                                onClick={() => setActiveTab("status")}
                                className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "status" ? "bg-red-500 text-white shadow-lg" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                            >
                                <LuActivity className="inline mr-1" /> สถานะ
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("schedule")}
                                className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "schedule" ? "bg-red-500 text-white shadow-lg" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                            >
                                <LuCalendar className="inline mr-1" /> ตาราง
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("rules")}
                                className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === "rules" ? "bg-red-500 text-white shadow-lg" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                            >
                                <LuShield className="inline mr-1" /> กติกา
                            </button>
                        </div>

                        {/* Tab Panels */}
                        <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl min-h-[280px]">
                            {/* Status Panel */}
                            {activeTab === "status" && (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <div className={`text-7xl md:text-8xl font-black ${currentCount >= MAX ? 'text-red-500' : 'text-red-600'}`}>
                                        {currentCount}
                                    </div>
                                    <div className="text-gray-500 font-medium">/ {MAX} คน</div>
                                    
                                    <div className="w-full mt-6 px-4">
                                        <div className="w-full h-5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                                            <div 
                                                className={`h-full transition-all duration-500 rounded-full ${currentCount >= MAX ? 'bg-red-500' : 'bg-gradient-to-r from-red-400 to-red-600'}`}
                                                style={{ width: `${Math.min(100, (currentCount / MAX) * 100)}%` }} 
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 text-center">
                                        {currentCount >= MAX ? (
                                            <div className="bg-red-100 text-red-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                                                <LuX className="text-lg" /> รอบนี้เต็มแล้ว! รอรอบถัดไปนะ
                                            </div>
                                        ) : (
                                            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                                                <LuCheck className="text-lg" /> ว่างอีก {MAX - currentCount} ที่
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* Schedule Panel */}
                            {activeTab === "schedule" && (
                                <div className="space-y-3">
                                    {schedule.map((s) => (
                                        <div key={s.date} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                            <div className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                                <LuCalendar className="text-red-500" />
                                                {s.date}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {s.rounds.map((r) => (
                                                    <div 
                                                        key={r.name} 
                                                        className={`px-4 py-2 rounded-xl text-sm font-bold ${r.filled ? "bg-red-100 text-red-700 border border-red-300" : "bg-green-100 text-green-700 border border-green-300"}`}
                                                    >
                                                        {r.filled ? '❌' : '✅'} {r.name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {/* Rules Panel */}
                            {activeTab === "rules" && (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                                    {rules.map((rule, index) => (
                                        <div key={index} className="flex gap-3 bg-white p-3 rounded-xl border border-gray-200">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 text-sm">{rule.title}</h3>
                                                <p className="text-xs text-gray-500 mt-1">{rule.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ----- Column 2: Form Card ----- */}
                    <form onSubmit={handleSubmit} className="bg-white/95 p-6 rounded-2xl shadow-2xl">
                        <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                            <LuSend className="text-red-500" />
                            ส่งวาร์ป IG
                        </h2>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                    <LuUser className="text-red-500" /> Username IG
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="@username" 
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-gray-50 text-gray-900 font-medium transition-all" 
                                    value={title} 
                                    onChange={(e) => setTitle(e.target.value)} 
                                    disabled={loading || !user} 
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                    <LuMessageSquare className="text-red-500" /> Caption
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="ใส่แคปชั่นที่ต้องการ (ไม่บังคับ)" 
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-gray-50 text-gray-900 font-medium transition-all" 
                                    value={subtitle} 
                                    onChange={(e) => setSubtitle(e.target.value)} 
                                    disabled={loading || !user} 
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                                    <LuImage className="text-red-500" /> รูปภาพ
                                </label>
                                <div className="relative">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="w-full text-sm text-gray-600 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-red-500 file:text-white hover:file:bg-red-600 file:cursor-pointer file:transition-all bg-gray-50 rounded-xl border-2 border-gray-200 border-dashed p-2 cursor-pointer" 
                                        onChange={(e) => { if (e.target.files && e.target.files[0]) { setImageFile(e.target.files[0]); } }} 
                                        disabled={loading || !user} 
                                    />
                                </div>
                                {imageFile && (
                                    <div className="mt-2 text-sm text-green-600 font-medium flex items-center gap-2">
                                        <LuCheck /> {imageFile.name}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={loading || !user} 
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                        >
                            <LuSend className="text-xl" />
                            ส่งวาร์ป! (ใช้ {SUBMISSION_COST} แต้ม)
                        </button>
                        
                        {!user && (
                            <div className="mt-4 bg-amber-100 text-amber-700 p-4 rounded-xl text-center font-medium flex items-center justify-center gap-2">
                                <LuTriangleAlert /> กรุณาล็อกอินเพื่อใช้งาน
                            </div>
                        )}
                        {error && (
                            <div className="mt-4 bg-red-100 text-red-700 p-4 rounded-xl text-center font-medium flex items-center justify-center gap-2">
                                <LuTriangleAlert /> {error}
                            </div>
                        )}
                    </form>
                </div>
            </main>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="max-w-md w-full bg-white rounded-2xl overflow-hidden shadow-2xl">
                        <div className="bg-green-500 p-4">
                            <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center">
                                <LuCheck className="text-4xl text-green-500" />
                            </div>
                        </div>
                        <div className="p-6 text-center">
                            <h3 className="text-2xl font-black text-gray-800 mb-2">สำเร็จ! 🎉</h3>
                            <p className="text-gray-600 mb-6">{successMessage ?? "ทีมงานจะตรวจสอบและลงวาร์ปให้เร็วๆ นี้"}</p>
                            <button 
                                onClick={() => setShowSuccessModal(false)} 
                                className="px-8 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold transition-all"
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Rules Confirm Modal */}
            {showRulesConfirmModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl">
                        <div className="bg-red-500 p-4">
                            <div className="flex items-center justify-center gap-3 text-white">
                                <LuShield className="text-3xl" />
                                <h3 className="text-xl font-bold">โปรดอ่านกติกาก่อนส่ง</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="max-h-60 overflow-y-auto space-y-3 mb-6 pr-2">
                                {rules.map((rule, index) => (
                                    <div key={index} className="flex gap-3 bg-gray-50 p-3 rounded-xl">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-800">{rule.title}</h4>
                                            <p className="text-xs text-gray-500">{rule.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowRulesConfirmModal(false)} 
                                    className="flex-1 px-5 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition-all"
                                >
                                    ยกเลิก
                                </button>
                                <button 
                                    onClick={() => { setShowRulesConfirmModal(false); handleConfirmSubmit(); }} 
                                    className="flex-1 px-5 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all"
                                >
                                    ยอมรับและส่ง
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
