import { useState, useEffect } from "react";
import BottomNav from "../components/BottomNav";

export default function WarpStatus() {
    const MAX = 22; // จำกัดจำนวนผู้ส่งต่อรอบ
    const [currentCount, setCurrentCount] = useState(14); // mock data: คนที่ส่งแล้ว

    // mock schedule (3 วัน x 2 รอบ)
    const schedule = [
        {
            date: "23 ต.ค.",
            rounds: [
                { name: "รอบ 19:23", filled: false },
                { name: "รอบ 20:39", filled: false },
            ],
        },
        {
            date: "24 ต.ค.",
            rounds: [
                { name: "รอบเช้า (09:00)", filled: false },
                { name: "รอบเย็น (18:00)", filled: false },
            ],
        },
        {
            date: "25 ต.ค.",
            rounds: [
                { name: "รอบเช้า (09:00)", filled: false },
                { name: "รอบเย็น (18:00)", filled: false },
            ],
        },
    ];

    // optional: จำลองการอัปเดตแบบเรียลไทม์
    /* useEffect(() => {
        const timer = setInterval(() => {
            setCurrentCount((prev) => (prev < MAX ? prev + 1 : MAX));
        }, 3000);
        return () => clearInterval(timer);
    }, []); */

    return (
        <main className="min-h-screen flex flex-col items-center justify-start p-6 bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
            <BottomNav />

            <div className="card bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg p-6 w-full max-w-md text-center mt-8">
                <h1 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
                    📅 สถานะการส่งวาร์ป
                </h1>

                {/* Progress bar */}
                <div className="mb-6">
                    <div className="flex justify-between text-sm font-medium mb-1">
                        <span>จำนวนผู้ส่ง</span>
                        <span>
                            {currentCount}/{MAX} คน
                        </span>
                    </div>
                    <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${(currentCount / MAX) * 100}%` }}
                        ></div>
                    </div>

                    {currentCount >= MAX ? (
                        <p className="text-red-500 text-sm mt-2">
                            ❌ รอบนี้เต็มแล้ว! รอรอบถัดไปได้เลย
                        </p>
                    ) : (
                        <p className="text-green-600 text-sm mt-2">
                            ✅ ยังสามารถส่งได้อีก {MAX - currentCount} คน
                        </p>
                    )}
                </div>

                {/* ตารางรอบ */}
                <div className="space-y-4">
                    {schedule.map((day) => (
                        <div
                            key={day.date}
                            className="bg-white/60 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700"
                        >
                            <h2 className="text-lg font-semibold mb-2">{day.date}</h2>
                            <div className="space-y-2">
                                {day.rounds.map((round) => (
                                    <div
                                        key={round.name}
                                        className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm font-medium ${round.filled
                                            ? "bg-gray-200 dark:bg-gray-700 text-gray-500"
                                            : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                                            }`}
                                    >
                                        <span>{round.name}</span>
                                        <span>{round.filled ? "เต็มแล้ว ⛔" : "ยังว่าง ✅"}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ปุ่มกลับ */}
                <button
                    onClick={() => (window.location.href = "/qrscan")}
                    className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition duration-300"
                >
                    กลับไปหน้าส่งวาร์ป
                </button>
            </div>
        </main>
    );
}
