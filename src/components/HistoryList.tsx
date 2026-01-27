
type HistoryItem = {
    id?: string
    prize: string
    emoji?: string
    timestamp: number
    ticketId?: string
    claimed?: boolean
    claimedAt?: number
    claimedBy?: string
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
                            className={`border rounded-xl p-3 transition-all duration-300 cursor-pointer ${
                                result.claimed 
                                    ? 'bg-gray-100 border-gray-300 opacity-70'
                                    : 'bg-gray-50 border-gray-100 hover:bg-red-50 hover:border-red-200'
                            }`}
                            onClick={() => onSelect(result)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">{result.emoji}</div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-800">{result.prize}</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(result.timestamp).toLocaleString("th-TH")}
                                    </p>
                                    {result.claimed && result.claimedAt && (
                                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                            <i className="ri-check-line"></i>
                                            ใช้แล้ว: {new Date(result.claimedAt).toLocaleString("th-TH")}
                                        </p>
                                    )}
                                </div>
                                {result.ticketId && (
                                    result.claimed ? (
                                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full border border-red-300 font-bold flex items-center gap-1">
                                            <i className="ri-lock-fill"></i> ใช้แล้ว
                                        </span>
                                    ) : (
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full border border-green-300 font-bold flex items-center gap-1">
                                            <i className="ri-checkbox-circle-fill"></i> พร้อมใช้
                                        </span>
                                    )
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}