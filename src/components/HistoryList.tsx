
type HistoryItem = {
    id?: string
    prize: string
    emoji?: string
    timestamp: number
    ticketId?: string
}

export default function HistoryList({
    history,
    onSelect,
}: {
    history: HistoryItem[]
    onSelect: (item: HistoryItem) => void
}) {
    return (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>📜</span>
                <span>ประวัติการหมุน</span>
            </h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scroll-smooth">
                {history.length === 0 ? (
                    <div className="text-center text-gray-300 py-8 bg-white/5 rounded-xl border border-white/10">
                        <div className="text-5xl mb-3 opacity-50">🎁</div>
                        <p className="font-semibold">ยังไม่มีประวัติการหมุน</p>
                        <p className="text-xs text-gray-400 mt-1">หมุนวงล้อเพื่อรับรางวัลกันเลย!</p>
                    </div>
                ) : (
                    history.map((result) => (
                        <div
                            key={result.id ?? result.timestamp}
                            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer"
                            onClick={() => onSelect(result)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">{result.emoji}</div>
                                <div className="flex-1">
                                    <p className="font-bold text-white">{result.prize}</p>
                                    <p className="text-xs text-gray-400">{new Date(result.timestamp).toLocaleTimeString("th-TH")}</p>
                                </div>
                                {result.ticketId && (
                                    <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full border border-green-400/30 font-bold">✓ มีตั๋ว</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}