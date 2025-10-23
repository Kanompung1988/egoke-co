
export default function PrizeModal({
    show,
    wonPrize,
    onClose,
}: {
    show: boolean
    wonPrize: { label: string; emoji: string } | null
    onClose: () => void
}) {
    if (!show || !wonPrize) return null
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-gradient-to-br from-yellow-300 via-orange-300 to-red-400 border-2 border-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-in text-center space-y-6" onClick={(e) => e.stopPropagation()}>
                <div className="text-7xl sm:text-8xl animate-bounce inline-block">{wonPrize.emoji}</div>
                <div className="space-y-2">
                    <h3 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">ยินดีด้วย! 🎉</h3>
                    <p className="text-xl sm:text-2xl font-bold text-white">คุณได้รับ</p>
                    <p className="text-3xl sm:text-4xl font-black text-white">{wonPrize.label}</p>
                </div>
                <button onClick={onClose} className="w-full py-4 rounded-xl bg-white hover:bg-gray-100 font-bold text-lg text-orange-600 shadow-lg transition-all duration-300 hover:scale-105">ปิด ✓</button>
            </div>
        </div>
    )
}