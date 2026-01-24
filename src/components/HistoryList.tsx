
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
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span>📜</span>
                <span>ประวัติการหมุน</span>
            </h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scroll-smooth">
                {history.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="text-5xl mb-3 opacity-50">🎁</div>
                        <p className="font-semibold text-gray-600">ยังไม่มีประวัติการหมุน</p>
                        <p className="text-xs text-gray-400 mt-1">หมุนวงล้อเพื่อรับรางวัลกันเลย!</p>
                    </div>
                ) : (
                    history.map((result) => (
                        <div
                            key={result.id ?? result.timestamp}
                            className="bg-gray-50 border border-gray-100 rounded-xl p-3 hover:bg-red-50 hover:border-red-200 transition-all duration-300 cursor-pointer"
                            onClick={() => onSelect(result)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">{result.emoji}</div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-800">{result.prize}</p>
                                    <p className="text-xs text-gray-500">{new Date(result.timestamp).toLocaleTimeString("th-TH")}</p>
                                </div>
                                {result.ticketId && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-300 font-bold">✓ มีตั๋ว</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}