
type HistoryItem = {
    id?: string
    prize: string
    emoji?: string
    timestamp: number
    ticketId?: string
}

export default function TicketModal({
    show,
    selectedTicket,
    onClose,
}: {
    show: boolean
    selectedTicket: HistoryItem | null
    onClose: () => void
}) {
    if (!show || !selectedTicket) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
            <div className="bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white text-lg sm:text-xl transition-colors">×</button>
                <div className="text-center mb-4">
                    <div className="inline-block px-4 py-1.5 bg-white/90 rounded-full shadow-lg mb-2">
                        <h2 className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 flex items-center gap-2 justify-center"><span>🎫</span> ตั๋วรางวัล</h2>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-xl border-3 border-white/50 mb-4">
                    <div className="text-5xl mb-3 text-center">{selectedTicket.emoji ?? '🎁'}</div>
                    <div className="text-center mb-3">
                        <p className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-1">{selectedTicket.prize}</p>
                        <div className="text-xs sm:text-sm text-gray-600">{new Date(selectedTicket.timestamp).toLocaleString('th-TH')}</div>
                    </div>
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border-2 border-dashed border-purple-300">
                        <div className="text-xs text-gray-600 mb-1 text-center font-semibold">รหัสตั๋ว</div>
                        <div className="text-center font-mono text-sm sm:text-lg font-bold text-purple-700 break-all">{selectedTicket.ticketId}</div>
                    </div>

                    <div className="mt-3 bg-gray-100 rounded-lg p-4 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-3xl mb-1">📱</div>
                            <div className="text-xs text-gray-500">QR Code</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                    <p className="text-xs sm:text-sm text-white font-medium text-center">💡 แสดงตั๋วนี้ให้ทีมงานเพื่อรับของรางวัล</p>
                </div>
            </div>
        </div>
    )
}