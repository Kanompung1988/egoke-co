import React from "react"
import type { User } from "firebase/auth"

export default function UserSummary({ user, points }: { user: User | null; points: number | null }) {
    return (
        <div className="mb-4 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-white/20 to-white/10 border-2 border-white/30 overflow-hidden shadow-lg">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <img src="/Logo_eg'oke.jpg" alt="avatar" className="w-full h-full object-cover" />
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div className="flex-1">
                    <div className="text-xs text-gray-300 mb-1">👤 ผู้เล่น</div>
                    <div className="text-lg md:text-xl font-bold text-white truncate">{user?.displayName ?? 'Guest'}</div>
                </div>
            </div>

            <div className="flex items-center justify-between bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg p-3 shadow-lg">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">💰</span>
                    <div>
                        <div className="text-xs text-orange-900 font-medium">คะแนนของคุณ</div>
                        <div className="text-2xl font-extrabold text-orange-900">{points ?? 0}</div>
                    </div>
                </div>
                <div className="text-xs text-orange-800 bg-white/30 px-2 py-1 rounded-md">แต้ม</div>
            </div>
        </div>
    )
}