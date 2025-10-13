import { Link, useLocation } from "react-router-dom";
import '../index.css';
import { useAuth } from '../hooks/useAuth';

export default function BottomNav() {
    const location = useLocation();
    const current = location.pathname;
    const { currentUser } = useAuth();

    const isAdminOrStaff = currentUser?.role.toLowerCase() === 'admin' || currentUser?.role.toLowerCase() === 'staff';

    return (
        // MODIFIED: ครอบทุกอย่างด้วย Fragment (<>) เพื่อให้ return ได้มากกว่า 1 element
        <>

            <footer className="fixed bottom-0 left-0 right-0 p-4 z-50">
                <div className="mx-auto max-w-sm bg-white/80 dark:bg-base-200/80 backdrop-blur-md rounded-full shadow-lg border border-base-300">
                    <div className="flex justify-around items-center h-20 relative">
                        {/* Home */}
                        <Link to="/Home" className={`flex flex-col items-center justify-center transition-transform ${current === "/Home" ? "text-primary text-2xl" : "text-gray-500 hover:text-primary text-xl"}`}>
                            <i className="ri-ancient-pavilion-line"></i>
                            <span className="text-xs font-medium">Home</span>
                        </Link>

                        {/* Vote */}
                        <Link to="/vote" className={`flex flex-col items-center justify-center transition-transform ${current === "/vote" ? "text-primary text-2xl" : "text-gray-500 hover:text-primary text-xl"}`}>
                            <i className="ri-music-ai-line"></i>
                            <span className="text-xs font-medium">Vote</span>
                        </Link>
                        
                        {/* Game (ตรงกลาง) เฉพาะผู้ใช้ทั่วไป */}
                        {(currentUser === null || !currentUser.role || currentUser.role.toLowerCase() === "none") ? (
                            <Link to="/game" className={`flex flex-col items-center justify-center transition-transform ${current === "/game" ? "fan-icon text-white" : "text-gray-500 hover:text-primary"}`}>
                                <i className="ri-gamepad-line text-3xl"></i>
                            </Link>
                        ) : isAdminOrStaff && (
                            <Link to="/qrscan" className={`flex flex-col items-center justify-center transition-transform ${current === "/qrscan" ? "fan-icon text-white" : "text-gray-500 hover:text-primary"}`}>
                                <i className="ri-qr-scan-2-line text-3xl"></i>
                            </Link>
                        )}
                        
                        {/* IG */}
                        <Link to="/vap-ig" className={`flex flex-col items-center justify-center transition-transform ${current === "/vap-ig" ? "text-primary text-2xl" : "text-gray-500 hover:text-primary text-xl"}`}>
                            <i className="ri-instagram-line"></i>
                            <span className="text-xs font-medium">IG</span>
                        </Link>

                        {/* Profile */}
                        <Link to="/profile" className={`flex flex-col items-center justify-center transition-transform ${current === "/profile" ? "text-primary text-3xl" : "text-gray-500 hover:text-primary text-2xl"}`}>
                            <i className="ri-user-fill"></i>
                            <span className="text-xs font-medium">Me</span>
                        </Link>

                    </div>
                </div>
            </footer>
        </>
    )
}