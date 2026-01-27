import { useState } from 'react';
import { purchaseVoteRights } from '../hooks/useVote';

interface PurchaseVoteRightsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userEmail: string;
    userName: string;
    category: 'band' | 'solo' | 'cover';
    currentPoints: number;
    currentRights: number;
    onSuccess: () => void;
}

const POINTS_PER_RIGHT = 15;

const categoryNames = {
    band: 'วงดนตรี',
    solo: 'โซโล่',
    cover: 'คฟเวอร์'
};

export default function PurchaseVoteRightsModal({
    isOpen,
    onClose,
    userId,
    userEmail,
    userName,
    category,
    currentPoints,
    currentRights,
    onSuccess
}: PurchaseVoteRightsModalProps) {
    const [rightsAmount, setRightsAmount] = useState(1);
    const [isPurchasing, setIsPurchasing] = useState(false);

    const totalCost = rightsAmount * POINTS_PER_RIGHT;
    const canAfford = currentPoints >= totalCost;

    const handlePurchase = async () => {
        if (!canAfford || isPurchasing) return;

        setIsPurchasing(true);

        const result = await purchaseVoteRights(
            userId,
            userEmail,
            userName,
            category,
            rightsAmount
        );

        setIsPurchasing(false);

        if (result.success) {
            alert(`✅ ${result.message}`);
            setRightsAmount(1);
            onSuccess();
            onClose();
        } else {
            alert(`❌ ${result.message}`);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="relative bg-gradient-to-br from-white to-amber-50/30 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
                    {/* Header - Red to Gold Gradient */}
                    <div className="sticky top-0 bg-gradient-to-r from-red-600 via-red-700 to-amber-600 px-6 py-4 rounded-t-3xl sm:rounded-t-3xl shadow-xl">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center ring-2 ring-white/30">
                                    <span className="text-3xl">🎫</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-white drop-shadow-lg">ซื้อสิทธิ์โหวต</h3>
                                    <p className="text-white/90 text-sm font-medium">{categoryNames[category]}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white transition-all active:scale-95"
                                disabled={isPurchasing}
                            >
                                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-5">
                        {/* Current Status - Red & Gold Theme */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gradient-to-br from-red-100 via-red-50 to-pink-50 rounded-2xl p-4 border-2 border-red-300 shadow-md">
                                <div className="text-red-700 text-sm font-bold mb-1">สิทธิ์ปัจจุบัน</div>
                                <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">{currentRights}</div>
                                <div className="text-red-600 text-xs font-medium">ครั้ง</div>
                            </div>
                            <div className="bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-50 rounded-2xl p-4 border-2 border-amber-300 shadow-md">
                                <div className="text-amber-700 text-sm font-bold mb-1">แต้มของคุณ</div>
                                <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{currentPoints}</div>
                                <div className="text-amber-600 text-xs font-medium">แต้ม</div>
                            </div>
                        </div>

                        {/* Amount Selector */}
                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-3">
                                เลือกจำนวนสิทธิ์ที่ต้องการซื้อ
                            </label>
                            <div className="flex items-center gap-3">
                                <button
                                    className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl font-bold text-2xl shadow-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                                    onClick={() => setRightsAmount(Math.max(1, rightsAmount - 1))}
                                    disabled={rightsAmount <= 1 || isPurchasing}
                                >
                                    −
                                </button>
                                <div className="flex-1 bg-gradient-to-br from-red-50 via-amber-50 to-orange-50 rounded-2xl p-4 border-2 border-amber-300 shadow-md">
                                    <div className="text-6xl font-bold text-center bg-gradient-to-r from-red-600 via-red-700 to-amber-600 bg-clip-text text-transparent">
                                        {rightsAmount}
                                    </div>
                                    <div className="text-center text-gray-700 text-sm font-bold mt-1">สิทธิ์</div>
                                </div>
                                <button
                                    className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl font-bold text-2xl shadow-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                                    onClick={() => setRightsAmount(rightsAmount + 1)}
                                    disabled={isPurchasing}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Quick Select Buttons */}
                        <div className="grid grid-cols-4 gap-2">
                            {[1, 3, 5, 10].map(amount => (
                                <button
                                    key={amount}
                                    onClick={() => setRightsAmount(amount)}
                                    className={`py-2 px-3 rounded-xl font-bold text-sm transition-all shadow-md ${
                                        rightsAmount === amount
                                            ? 'bg-gradient-to-r from-red-600 via-red-700 to-amber-600 text-white shadow-lg scale-105'
                                            : 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200'
                                    }`}
                                    disabled={isPurchasing}
                                >
                                    {amount}
                                </button>
                            ))}
                        </div>

                        {/* Price Summary - Red to Gold Gradient */}
                        <div className="bg-gradient-to-r from-red-600 via-red-700 to-amber-600 rounded-2xl p-5 text-white shadow-xl">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-white/90 font-medium">ราคาต่อสิทธิ์:</span>
                                <span className="font-bold text-lg">{POINTS_PER_RIGHT} แต้ม</span>
                            </div>
                            <div className="h-px bg-white/30 my-3"></div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-lg">ยอดรวม:</span>
                                <div className="text-right">
                                    <div className="text-3xl font-bold drop-shadow-lg">{totalCost}</div>
                                    <div className="text-white/90 text-sm font-medium">แต้ม</div>
                                </div>
                            </div>
                        </div>

                        {/* Warning */}
                        {!canAfford && (
                            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3 animate-shake">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                    <div className="text-red-800 font-bold">แต้มไม่เพียงพอ!</div>
                                    <div className="text-red-700 text-sm">ต้องการอีก {totalCost - currentPoints} แต้ม</div>
                                </div>
                            </div>
                        )}

                        {/* After Purchase Info */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-4">
                            <div className="text-green-800 font-bold mb-3 flex items-center gap-2">
                                <span className="text-xl">✨</span>
                                <span>หลังจากซื้อ:</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">สิทธิ์ใหม่:</span>
                                    <span className="font-bold text-green-600 text-lg">{currentRights + rightsAmount} ครั้ง</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">แต้มคงเหลือ:</span>
                                    <span className="font-bold text-amber-600 text-lg">{Math.max(0, currentPoints - totalCost)} แต้ม</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons - Red to Gold Theme */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                className="py-4 bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-2xl font-bold text-lg shadow-md transition-all active:scale-95 disabled:opacity-50 border-2 border-gray-300"
                                onClick={onClose}
                                disabled={isPurchasing}
                            >
                                ยกเลิก
                            </button>
                            <button
                                className={`py-4 bg-gradient-to-r from-red-600 via-red-700 to-amber-600 hover:from-red-700 hover:via-red-800 hover:to-amber-700 text-white rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    isPurchasing ? 'animate-pulse' : ''
                                }`}
                                onClick={handlePurchase}
                                disabled={!canAfford || isPurchasing}
                            >
                                {isPurchasing ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>กำลังซื้อ...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        <span>✨</span>
                                        <span>ซื้อ {rightsAmount} สิทธิ์</span>
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
