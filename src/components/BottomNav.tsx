import { Link, useLocation } from "react-router-dom"
import { LuJapaneseYen } from 'react-icons/lu';

export default function BottomNav() {
    const location = useLocation()
    const current = location.pathname


    return (
        <footer className="fixed bottom-0 left-0 right-0 p-4 z-50">
            <div className="mx-auto max-w-sm bg-white/80 dark:bg-base-200/80 backdrop-blur-md rounded-full shadow-lg border border-base-300">
                <div className="flex justify-around items-center h-20 relative">
                    {/* Home */}
                    <Link to="/" className={`flex flex-col items-center justify-center transition-transform ${current === "/" ? "text-primary flex text-2xl" : "text-gray-500 dark:text-gray-400 hover:text-primary text-xl"}`} >
                        <i className="ri-ancient-pavilion-line"></i>
                        <span className="text-xs font-medium">Home</span>
                    </Link>

                    {/* Vote */}
                    <Link to="/vote" className={`flex flex-col items-center justify-center transition-transform ${current === "/vote" ? "text-primary flex text-2xl" : "text-gray-500 dark:text-gray-400 hover:text-primary text-xl"}`}>
                        <i className="ri-music-ai-line"></i>
                        <span className="text-xs font-medium">Vote</span>
                    </Link>

                    {/* Game */}
                    <Link to="/game" className={`flex flex-col items-center justify-center transition-transform ${current === "/game" ? "fan-icon text-white" : "text-gray-500 dark:text-gray-400 hover:text-primary"}`}>
                        <i className="ri-gamepad-line text-3xl"></i>
                    </Link>

                    {/* Points */}
                    <Link to="/points" className={`flex flex-col items-center justify-center transition-transform ${current === "/points" ? "text-primary text-3xl" : "text-gray-500 dark:text-gray-400 hover:text-primary text-2xl"}`}>
                        <LuJapaneseYen  />
                        <span className="text-xs font-medium">Points</span>
                    </Link>

                    {/* IG */}
                    <Link to="/vap-ig" className={`flex flex-col items-center justify-center transition-transform ${current === "/vap-ig" ? "text-primary flex text-2xl" : "text-gray-500 dark:text-gray-400 hover:text-primary text-xl"}`}>
                        <i className="ri-instagram-line"></i>
                        <span className="text-xs font-medium">IG</span>
                    </Link>
                </div>
            </div>

            <style>
                {`
            .fan-icon {
            background-color: #ea2a33;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 15px rgba(234, 42, 51, 0.7);
            transform: translateY(-8%);}
        `}
            </style>
        </footer>
    )
}
