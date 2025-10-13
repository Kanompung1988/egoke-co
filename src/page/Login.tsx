import { useState, useEffect } from "react"; // Import useState
import { useNavigate } from "react-router-dom";
import { loginWithGoogle, loginAsStaff, watchAuthState, db } from "../firebaseApp";
import { doc, getDoc } from "firebase/firestore";

export default function Login() {
    const navigate = useNavigate();
    const [showStaffForm, setShowStaffForm] = useState(false);
    const [staffCode, setStaffCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
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
        setIsLoading(true);
        const user = await loginWithGoogle();
        if (user) {
            navigate("/Home");
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
            navigate("/Home");
        } else if (error) {
            window.alert(error);
        }
        setIsLoading(false);
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-[url('/Artwork.png')] bg-cover bg-center p-6">
            <section className="card bg-white/80 dark:bg-gray-900/80 p-8 rounded-2xl shadow-lg border border-gray-200 max-w-sm w-full text-center backdrop-blur-md">
                <h1 className="text-3xl font-bold text-[#1e3a5c] mb-6 tracking-wide">EGOKE</h1>

                {/* --- MODIFIED: ใช้ Conditional Rendering --- */}
                {showStaffForm ? (
                    // --- ฟอร์มสำหรับ Staff ---
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Staff Code"
                            value={staffCode}
                            onChange={(e) => setStaffCode(e.target.value)}
                            className="input input-bordered w-full placeholder:text-white text-white"
                        />
                        <button onClick={handleStaffLogin} disabled={isLoading} className="btn bg-blue-600 text-white w-full">
                            {isLoading ? "Loading..." : "Login as Staff"}
                        </button>
                        <button onClick={() => setShowStaffForm(false)} className="text-sm text-gray-500 hover:underline">
                            Back
                        </button>
                    </div>
                ) : (
                    // --- ปุ่มล็อกอินสำหรับคนทั่วไป ---
                    <div className="space-y-6">
                        <button onClick={handleGoogleLogin} disabled={isLoading} className="btn bg-white text-black border border-[#e5e5e5] w-full rounded-xl py-3 flex items-center justify-center gap-2">
                             <svg aria-label="Google logo" width="16" height="16" xmlns="http://www.w.org/2000/svg" viewBox="0 0 512 512"><g><path d="m0 0H512V512H0" fill="#fff"></path><path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"></path><path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"></path><path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"></path><path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"></path></g></svg>
                            {isLoading ? "Loading..." : "Login with Google"}
                        </button>
                        <button onClick={() => setShowStaffForm(true)} className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
                            Staff Login
                        </button>
                    </div>
                )}
            </section>
        </main>
    );
}