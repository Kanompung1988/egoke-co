import QRCode from "react-qr-code";
import { useAuth } from "../hooks/useAuth";
import BottomNav from "../components/BottomNav";
import { LuJapaneseYen } from 'react-icons/lu';
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
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
            {/* ใช้ max-w-screen-lg เพื่อไม่ให้เนื้อหายืดเกินไปบนจอใหญ่ และ mx-auto เพื่อจัดกลาง */}
            <main className="container mx-auto max-w-screen-lg p-4 md:p-6 pt-10">
                <h1 className="text-3xl font-bold text-center mb-4">Your Profile</h1>

                {currentUser ? (
                    <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-lg flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">

                        {/* ส่วนที่ 1: รูปโปรไฟล์ (ซ้ายมือบนจอใหญ่) */}
                        <div className="flex-shrink-0">
                            <img
                                src={currentUser.photoURL || 'https://via.placeholder.com/150'}
                                alt="Profile"
                                // จอมือถือขนาด 128px, จอใหญ่ขนาด 192px
                                className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-primary"
                            />
                        </div>

                        {/* ส่วนที่ 2: ข้อมูลทั้งหมด (ขวามือบนจอใหญ่) */}
                        <div className="flex flex-col items-center md:items-start w-full gap-4">
                            {/* ชื่อและอีเมล */}
                            <div className="text-center md:text-left">
                                <h2 className="text-2xl md:text-3xl font-semibold">{currentUser.displayName}</h2>
                                <p className="text-gray-500 dark:text-gray-400">{currentUser.email}</p>
                            </div>

                            {/* จำนวนแต้ม */}
                            <div className="border-2 border-yellow-400 dark:border-yellow-500 rounded-full px-6 py-2">
                                <div className="flex items-center justify-center gap-2">
                                    <LuJapaneseYen className="text-yellow-500 text-2xl" />
                                    <span className="text-xl font-bold">{currentUser.points}</span>
                                    <span className="text-lg text-gray-600 dark:text-gray-300">Points</span>
                                </div>
                            </div>

                            {/* QR Code */}
                            <div className="bg-white p-4 rounded-lg">
                                <QRCode value={currentUser.uid} size={160} />
                            </div>

                            {/* ปุ่ม Logout */}
                            <button
                                onClick={handleLogout}
                                // จอมือถือปุ่มจะยาวเต็ม, จอใหญ่จะสั้นลง
                                className="btn btn-ghost mt-4 text-red-500 dark:text-red-400 border border-red-500 dark:border-red-400 hover:bg-red-500 hover:text-white transition-colors duration-300 rounded-xl px-6 py-2 items-center justify-center gap-2"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <p>Loading user data...</p>
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
}