import { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import BottomNav from "../components/BottomNav";
import { LuJapaneseYen } from 'react-icons/lu';

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
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white relative"> {/* Added relative */}
            <BottomNav />

            {/* Loading Overlays */}
            {loading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-full border-4 border-t-blue-500 border-gray-200 animate-spin" />
                        <div className="text-white font-medium">กำลังส่ง...</div>
                    </div>
                </div>
            )}
            {adminLoading && ( // Added Admin Loading Overlay
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full border-4 border-t-orange-500 border-gray-200 animate-spin" />
                        <div className="text-white font-medium text-sm">Processing Admin Action...</div>
                    </div>
                </div>
            )}

            {/* Admin Buttons - Moved Here */}
            {userRole === 'Admin' && !pageLoading && (
                <div className="absolute top-5 right-5 flex flex-col sm:flex-row gap-2 z-40"> {/* Used z-40 */}
                    <button
                        onClick={handleToggleSystem}
                        disabled={adminLoading}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors shadow-sm ${isWarpActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    > {isWarpActive ? 'Disable System' : 'Enable System'} </button>
                    <button
                        onClick={handleResetCount}
                        disabled={adminLoading || currentCount === 0}
                        className="px-3 py-1 rounded-md text-xs font-medium bg-yellow-500 hover:bg-yellow-600 text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    > Reset Count (to 0) </button>
                </div>
            )}

            <main className="container mx-auto max-w-screen-lg p-4 md:p-6 pt-10 pb-24">
                <h1 className="text-3xl font-bold text-center mb-6">Send Warp</h1>

                {/* Points Display */}
                {user && (
                    <div className="flex items-center justify-center mb-8">
                        <div className="border-2 border-yellow-400 dark:border-yellow-500 rounded-full px-5 py-2 transition-transform duration-200 ease-in-out hover:scale-105">
                            <div className="flex items-center justify-center gap-2">
                                <LuJapaneseYen className="text-yellow-400 dark:text-yellow-500 text-2xl" />
                                <span className="text-xl font-bold text-gray-800 dark:text-white">{userPoints ?? "..."}</span>
                                <span className="text-lg text-gray-600 dark:text-gray-300">Points</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-start md:gap-6">
                    {/* ----- Column 1: Status Card ----- */}
                    <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-lg w-full md:flex-1 mb-6 md:mb-0">
                        <h1 className="text-xl md:text-2xl font-bold mb-4 text-center md:text-left">
                            สถานะการส่งวาร์ป
                        </h1>
                        <div className="w-full">
                            {/* Tab Buttons */}
                            <div className="flex justify-center md:justify-start gap-2 mb-4">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("status")}
                                    className={`px-5 py-2 rounded-full text-sm md:text-base font-semibold transition-all duration-200 ease-in-out ${activeTab === "status" ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"}`}
                                > สถานะ </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("schedule")}
                                    className={`px-5 py-2 rounded-full text-sm md:text-base font-semibold transition-all duration-200 ease-in-out ${activeTab === "schedule" ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"}`}
                                > ตาราง </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("rules")}
                                    className={`px-5 py-2 rounded-full text-sm md:text-base font-semibold transition-all duration-200 ease-in-out ${activeTab === "rules" ? "bg-blue-600 text-white shadow-md" : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"}`}
                                > กติกา </button>
                            </div>

                            {/* Tab Panels */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 p-4 rounded-lg min-h-[300px]"> {/* Removed relative */}

                                {/* Status Panel Content */}
                                {activeTab === "status" && (
                                    <div className="flex flex-col items-center justify-center"> {/* Removed pt-8 */}
                                        <div className="text-6xl sm:text-7xl md:text-8xl font-extrabold text-blue-600 leading-none" aria-live="polite"> {currentCount} </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">/ {MAX} คน</div>
                                        <div className="w-full mt-4 px-2">
                                            <div className="w-full h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(100, (currentCount / MAX) * 100)}%` }} />
                                            </div>
                                        </div>
                                        <div className="mt-3 text-center">
                                            {currentCount >= MAX ? (
                                                <p className="text-red-500 text-sm">❌ รอบนี้เต็มแล้ว! รอรอบถัดไปได้เลย</p>
                                            ) : (
                                                <p className="text-green-600 text-sm">✅ ยังสามารถส่งได้อีก {MAX - currentCount} คน</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {/* Schedule Panel */}
                                {activeTab === "schedule" && (
                                    <div className="space-y-3">
                                        {schedule.map((s) => (
                                            <div key={s.date} className="border rounded-lg p-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                                                <div className="font-semibold mb-2">{s.date}</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {s.rounds.map((r) => (
                                                        <div key={r.name} className={`px-3 py-1 rounded-full text-sm ${r.filled ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}> {r.name} </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Rules Panel */}
                                {activeTab === "rules" && (
                                    <div className="space-y-4">
                                        {rules.map((rule, index) => (
                                            <div key={index} className="flex gap-4">
                                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-medium"> {index + 1} </div>
                                                <div>
                                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{rule.title}</h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">{rule.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ----- Column 2: Form Card ----- */}
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-lg w-full md:max-w-sm">
                        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 tracking-wide text-center"> แจกวาร์ปกันค้าบวัยรุ่น </h1>
                        <div className="space-y-4 mb-4 md:mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"> IG </label>
                                <input type="text" placeholder="แปะชื่อไอจี" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading || !user} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"> Caption </label>
                                <input type="text" placeholder="ใส่แคปชั่นที่ต้องการ" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} disabled={loading || !user} />
                            </div>
                        </div>
                        <div className="mb-4 md:mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"> เลือกรูปภาพ </label>
                            <input type="file" accept="image/*" className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-white dark:hover:file:bg-blue-800 block w-full text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 p-2" onChange={(e) => { if (e.target.files && e.target.files[0]) { setImageFile(e.target.files[0]); } }} disabled={loading || !user} />
                        </div>
                        <button type="submit" disabled={loading || !user} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors duration-300 ease-in-out shadow-md disabled:opacity-50 disabled:cursor-not-allowed"> {`ส่งวาปเลย!! (ใช้ ${SUBMISSION_COST} แต้ม)`} </button>
                        {!user && <p className="text-yellow-500 mt-4 text-center">กรุณาล็อกอินเพื่อใช้งาน</p>}
                        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
                    </form>
                </div>
            </main>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
                        <div className="p-6 text-center">
                            <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-green-100 mb-4"> <i className="ri-check-fill text-3xl text-green-500 "></i> </div>
                            <h3 className="text-xl font-extrabold mb-2 text-gray-900 dark:text-white">ส่งวาร์ปสำเร็จ</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{successMessage ?? "ทีมงานจะตรวจสอบและลงวาร์ปให้เร็ว ๆ นี้"}</p>
                            <button onClick={() => setShowSuccessModal(false)} className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"> Close </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Rules Confirm Modal */}
            {showRulesConfirmModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4"> <i className="ri-error-warning-line text-2xl text-yellow-500"></i> <h3 className="text-xl font-bold text-gray-900 dark:text-white">โปรดอ่านกติกาก่อนส่ง</h3> </div>
                            <div className="max-h-60 overflow-y-auto space-y-4 mb-6 pr-2 border-t border-b border-gray-200 dark:border-gray-700 py-4">
                                {rules.map((rule, index) => (
                                    <div key={index} className="flex gap-3">
                                        <div className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-medium"> {index + 1} </div>
                                        <div>
                                            <h4 className="font-medium text-sm text-gray-800 dark:text-gray-100">{rule.title}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{rule.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setShowRulesConfirmModal(false)} className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 font-semibold transition-colors text-sm"> ยกเลิก </button>
                                <button onClick={() => { setShowRulesConfirmModal(false); handleConfirmSubmit(); }} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors text-sm"> ยอมรับและส่ง </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}