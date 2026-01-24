import type { User } from "firebase/auth"

export default function UserSummary({ user, points }: { user: User | null; points: number | null }) {
    return (
        <div className="bg-white rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 border-2 border-gray-200 overflow-hidden shadow-md">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <img src="/Logo_eg'oke.jpg" alt="avatar" className="w-full h-full object-cover" />
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">👤 ผู้เล่น</div>
                    <div className="text-lg md:text-xl font-bold text-gray-800 truncate">{user?.displayName ?? 'Guest'}</div>
                </div>
            </div>

            <div className="flex items-center justify-between bg-gradient-to-r from-amber-400 to-yellow-500 rounded-xl p-3 shadow-lg">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">💰</span>
                    <div>
                        <div className="text-xs text-amber-900 font-medium">คะแนนของคุณ</div>
                        <div className="text-2xl font-extrabold text-amber-900">{points ?? 0}</div>
                    </div>
                </div>
                <div className="text-sm text-amber-800 bg-white/50 px-3 py-1 rounded-lg font-bold">แต้ม</div>
            </div>
        </div>
    )
}