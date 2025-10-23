import React from "react"

export default function PointsCard({ points }: { points: number | null }) {
    return (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-xl flex items-center gap-4">
            <span className="text-3xl">💰</span>
            <div>
                <p className="text-xs text-gray-300">คะแนนของคุณ</p>
                <p className="text-2xl font-black text-white">{points ?? 0}</p>
            </div>
        </div>
    )
}