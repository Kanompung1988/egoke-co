import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

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

export default function TicketModal({
    show,
    selectedTicket,
    onClose,
}: {
    show: boolean
    selectedTicket: HistoryItem | null
    onClose: () => void
}) {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

    useEffect(() => {
        if (show && selectedTicket?.ticketId) {
            generateQRCode(selectedTicket.ticketId);
        }
    }, [show, selectedTicket]);

    const generateQRCode = async (ticketId: string) => {
        try {
            const redemptionUrl = `${window.location.origin}/redeem/${ticketId}`;
            const url = await QRCode.toDataURL(redemptionUrl, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#7c3aed', // Purple
                    light: '#ffffff'
                }
            });
            setQrCodeUrl(url);
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    };

    if (!show || !selectedTicket) return null
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
            <div className="bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white text-2xl transition-colors">
                    <i className="ri-close-line"></i>
                </button>
                
                <div className="text-center mb-4">
                    <div className="inline-block px-4 py-1.5 bg-white/90 rounded-full shadow-lg mb-2">
                        <h2 className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 flex items-center gap-2 justify-center">
                            <i className="ri-ticket-line"></i> ตั๋วรางวัล
                        </h2>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-xl border-3 border-white/50 mb-4">
                    <div className="text-5xl mb-3 text-center animate-bounce">{selectedTicket.emoji ?? '🎁'}</div>
                    <div className="text-center mb-3">
                        <p className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-1">{selectedTicket.prize}</p>
                        <div className="text-xs sm:text-sm text-gray-600 flex items-center justify-center gap-1">
                            <i className="ri-time-line"></i>
                            {new Date(selectedTicket.timestamp).toLocaleString('th-TH')}
                        </div>
                    </div>

                    {/* Claimed Status */}
                    {selectedTicket.claimed ? (
                        <div className="bg-red-100 border-2 border-red-300 rounded-lg p-3 mb-3">
                            <div className="flex items-center justify-center gap-2 text-red-700 font-bold">
                                <i className="ri-close-circle-fill text-xl"></i>
                                <span>ตั๋วนี้ถูกใช้ไปแล้ว</span>
                            </div>
                            {selectedTicket.claimedAt && (
                                <div className="text-xs text-red-600 text-center mt-1">
                                    เคลมเมื่อ: {new Date(selectedTicket.claimedAt).toLocaleString('th-TH')}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-green-100 border-2 border-green-300 rounded-lg p-3 mb-3">
                            <div className="flex items-center justify-center gap-2 text-green-700 font-bold">
                                <i className="ri-checkbox-circle-fill text-xl"></i>
                                <span>พร้อมใช้งาน</span>
                            </div>
                        </div>
                    )}

                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border-2 border-dashed border-purple-300 mb-3">
                        <div className="text-xs text-gray-600 mb-1 text-center font-semibold">รหัสตั๋ว</div>
                        <div className="text-center font-mono text-xs sm:text-sm font-bold text-purple-700 break-all">{selectedTicket.ticketId}</div>
                    </div>

                    {/* QR Code - แสดงเฉพาะยังไม่ได้เคลม */}
                    {!selectedTicket.claimed && (
                        <div className="mt-3 bg-white rounded-lg p-4 flex items-center justify-center border-2 border-purple-200">
                            {qrCodeUrl ? (
                                <img 
                                    src={qrCodeUrl} 
                                    alt="Prize QR Code" 
                                    className="w-48 h-48 rounded-lg shadow-md"
                                />
                            ) : (
                                <div className="text-center">
                                    <div className="animate-spin text-4xl mb-2">⏳</div>
                                    <div className="text-xs text-gray-500">กำลังสร้าง QR Code...</div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {selectedTicket.claimed && (
                        <div className="mt-3 bg-gray-100 rounded-lg p-8 flex items-center justify-center border-2 border-gray-300">
                            <div className="text-center">
                                <i className="ri-lock-fill text-6xl text-gray-400 mb-2"></i>
                                <p className="text-gray-500 text-sm font-medium">QR Code ถูกล็อค</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30 mb-3">
                    <p className="text-xs sm:text-sm text-white font-medium text-center flex items-center justify-center gap-2">
                        <i className="ri-information-line"></i>
                        {selectedTicket.claimed 
                            ? 'ตั๋วนี้ถูกใช้ไปแล้ว ไม่สามารถใช้ซ้ำได้'
                            : 'แสดง QR Code นี้ให้ทีมงานเพื่อรับของรางวัล'
                        }
                    </p>
                </div>

                <button
                    onClick={onClose}
                    className="w-full bg-white hover:bg-gray-100 text-purple-600 py-3 rounded-xl font-bold transition-all shadow-lg"
                >
                    <i className="ri-check-line mr-2"></i>
                    เข้าใจแล้ว
                </button>
            </div>
        </div>
    )
}