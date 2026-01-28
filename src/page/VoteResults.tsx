import { useState, useEffect } from 'react';
import { useVoteSettings, useCandidates, useVoteStats } from '../hooks/useVote';
import { useAuth } from '../hooks/useAuth';
import BottomNav from "../components/BottomNav";
import AnimatedNumber from '../components/AnimatedNumber';

const CATEGORIES = [
    { id: 'band', name: 'Band', emoji: '🎸', description: 'วงดนตรี' },
    { id: 'solo', name: 'Solo', emoji: '🎤', description: 'นักร้องเดี่ยว' },
    { id: 'cover', name: 'Cover', emoji: '💃', description: 'Cover Dance' },
];

export default function VoteResults() {
    const { currentUser } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState<string>('band');
    const { categories: voteSettings, loading: settingsLoading } = useVoteSettings();
    const { candidates, loading: candidatesLoading } = useCandidates(selectedCategory);
    const { totalVotes } = useVoteStats(selectedCategory);

    const categorySettings = voteSettings[selectedCategory];
    const isOpen = categorySettings?.isOpen || false;
    const isStaff = ['staff', 'admin', 'superadmin'].includes(currentUser?.role || '');

    // ✅ User ธรรมดาเห็นผลได้เฉพาะตอนปิดโหวตแล้ว
    // ✅ Staff/Admin เห็น real-time ได้ตลอด
    const canViewResults = isStaff || !isOpen;

    // Auto-select first closed category with results
    useEffect(() => {
        if (!settingsLoading && Object.keys(voteSettings).length > 0) {
            const closedWithVotes = Object.entries(voteSettings).find(([_, settings]) => {
                return !settings.isOpen; // ปิดแล้ว
            });
            if (closedWithVotes) {
                setSelectedCategory(closedWithVotes[0]);
            }
        }
    }, [voteSettings, settingsLoading]);

    // Sort candidates by vote count
    const sortedCandidates = [...candidates].sort((a, b) => b.voteCount - a.voteCount);
    const winner = sortedCandidates[0];
    const maxVotes = winner?.voteCount || 1;

    if (settingsLoading || candidatesLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4"></div>
                    <p className="text-white text-lg">กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    // ✅ User ธรรมดาไม่สามารถดูผลโหวตขณะเปิดอยู่
    if (!canViewResults) {
        return (
            <div className="min-h-screen relative overflow-hidden pb-24">
                {/* Background */}
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/art/temple-bg.png')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-red-900/40" />

                <div className="relative z-10 container mx-auto max-w-6xl px-4 pt-6">
                    {/* Header */}
                    <div className="text-center mb-6 animate-fade-in">
                        <img 
                            src="/logo.jpg" 
                            alt="Logo" 
                            className="w-16 h-16 mx-auto mb-3 rounded-xl shadow-xl border-2 border-white/30"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/art/logo.png'; }}
                        />
                        <h1 className="text-3xl font-bold text-white drop-shadow-lg mb-2">ผลการโหวต</h1>
                    </div>

                    {/* Voting Still Open Notice */}
                    <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-2xl mx-auto text-center animate-fade-in">
                        <div className="text-8xl mb-6">⏳</div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">การโหวตยังเปิดอยู่</h2>
                        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                            ผลการโหวตจะประกาศหลังจากปิดการโหวตแล้วเท่านั้น
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-lg p-4 mb-6">
                            <p className="text-sm text-blue-800 text-left">
                                <span className="font-bold">📌 หมายเหตุ:</span> เพื่อความเป็นธรรม 
                                ผลการโหวตจะแสดงเมื่อปิดการโหวตแล้วเท่านั้น กรุณารอติดตาม!
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-amber-600">
                            <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                            <span className="font-semibold">กำลังเปิดรับโหวต...</span>
                        </div>
                    </div>
                </div>

                <BottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden pb-24">
            {/* Background with overlay */}
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/art/temple-bg.png')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-red-900/50 via-amber-900/40 to-red-800/50 backdrop-blur-[1px]" />
            
            {/* Animated particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-2 h-2 bg-amber-400/30 rounded-full animate-float" style={{ animationDelay: '0s' }}></div>
                <div className="absolute top-40 right-20 w-3 h-3 bg-red-400/20 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
                <div className="absolute bottom-40 left-1/4 w-2 h-2 bg-yellow-400/30 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-60 right-1/3 w-2 h-2 bg-amber-300/20 rounded-full animate-float" style={{ animationDelay: '1.5s' }}></div>
            </div>

            <div className="relative z-10 container mx-auto max-w-6xl px-4 pt-6 pb-6">
                {/* Header with elegant design */}
                <div className="text-center mb-8 animate-fade-in">
                    <div className="inline-flex items-center justify-center gap-4 mb-4">
                        <img 
                            src="/logo.jpg" 
                            alt="Logo" 
                            className="w-20 h-20 rounded-2xl shadow-2xl border-4 border-amber-400/80 ring-4 ring-white/20"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/art/logo.png'; }}
                        />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent drop-shadow-2xl mb-3">
                        ผลการโหวต
                    </h1>
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/30 shadow-lg">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                        <p className="text-white font-medium">ดูผลคะแนนแบบ Real-time</p>
                    </div>
                </div>

                {/* Vote Weight Notice - Elegant Card */}
                <div className="mb-8 animate-fade-in">
                    <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/50">
                        <div className="text-center mb-5">
                            <div className="inline-flex items-center gap-3 mb-2">
                                <span className="text-3xl">📋</span>
                                <h3 className="font-bold text-2xl bg-gradient-to-r from-red-600 to-amber-600 bg-clip-text text-transparent">
                                    ประกาศสำคัญ
                                </h3>
                                <span className="text-3xl">📋</span>
                            </div>
                        </div>
                        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-amber-500 rounded-xl p-5 mb-5 shadow-inner">
                            <p className="text-center font-bold text-amber-900 text-lg">
                                ⚠️ ผลการโหวตที่แสดงนี้ยังไม่ใช่ผลสุดท้าย
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-5 border border-blue-200 shadow-md">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                        <span className="text-2xl font-bold text-white">30%</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-700 leading-relaxed">
                                            คะแนนจากเว็บไซต์นี้คิดเป็นเพียง <span className="font-bold text-blue-700 text-lg">30%</span> ของคะแนนรวมทั้งหมด
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-200 shadow-md">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                        <span className="text-2xl font-bold text-white">70%</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-gray-700 leading-relaxed">
                                            คะแนนส่วนที่เหลือ <span className="font-bold text-purple-700 text-lg">70%</span> จะคิดจากรางวัลและการตัดสินภายในงาน EGOKE
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Category Tabs - Modern Design */}
                <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl rounded-3xl p-5 shadow-2xl mb-8 animate-fade-in border border-white/50">
                    <div className="grid grid-cols-3 gap-4">
                        {CATEGORIES.map((cat) => {
                            const settings = voteSettings[cat.id];
                            const isSelected = selectedCategory === cat.id;
                            const isCategoryOpen = settings?.isOpen || false;

                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`relative p-5 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 ${
                                        isSelected
                                            ? 'bg-gradient-to-br from-red-500 via-red-600 to-amber-600 text-white shadow-2xl scale-105 ring-4 ring-white/50'
                                            : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 shadow-lg'
                                    }`}
                                >
                                    <div className="text-4xl mb-2 drop-shadow-lg">{cat.emoji}</div>
                                    <div className={`text-base font-bold ${isSelected ? 'text-white drop-shadow-md' : ''}`}>
                                        {cat.name}
                                    </div>
                                    
                                    {/* Status Badge */}
                                    {isStaff && (
                                        <div className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold shadow-2xl border-2 ${
                                            isCategoryOpen
                                                ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white border-green-300 animate-pulse'
                                                : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-300'
                                        }`}>
                                            {isCategoryOpen ? '● LIVE' : '● ปิด'}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Status Notice - แสดงเฉพาะ Staff/Admin */}
                {isOpen && isStaff && (
                    <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white rounded-3xl p-5 mb-8 shadow-2xl animate-fade-in text-center border border-green-400">
                        <div className="flex items-center justify-center gap-3 mb-2">
                            <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-lg"></div>
                            <div className="font-bold text-xl drop-shadow-md">กำลังเปิดรับโหวต (LIVE)</div>
                        </div>
                        <div className="text-sm text-green-50 font-medium">
                            🔓 คุณสามารถดูผลโหวต Real-time ได้ในฐานะ {currentUser?.role?.toUpperCase()}
                        </div>
                    </div>
                )}

                {/* Stats Summary - Elegant Cards */}
                <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl mb-8 animate-fade-in border border-white/50">
                    <div className="grid grid-cols-3 gap-6 text-center">
                        <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-5 border border-red-200 shadow-lg">
                            <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-2">
                                <AnimatedNumber value={sortedCandidates.length} />
                            </div>
                            <div className="text-sm font-semibold text-gray-600">ผู้สมัคร</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-200 shadow-lg">
                            <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                                {isStaff || !isOpen ? (
                                    <AnimatedNumber value={totalVotes} />
                                ) : (
                                    <span>---</span>
                                )}
                            </div>
                            <div className="text-sm font-semibold text-gray-600">
                                {isStaff || !isOpen ? 'โหวตทั้งหมด' : 'ยังนับไม่ได้'}
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 border border-amber-200 shadow-lg">
                            <div className="text-5xl mb-2 drop-shadow-md">{isOpen ? '🟢' : '🔴'}</div>
                            <div className="text-sm font-semibold text-gray-600">{isOpen ? 'เปิดอยู่' : 'ปิดแล้ว'}</div>
                        </div>
                    </div>
                </div>

                {/* Podium Display - Top 3 with sparkles */}
                {sortedCandidates.length >= 3 && (
                    <div className="mb-8 animate-fade-in">
                        <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 bg-clip-text text-transparent mb-2">
                                    🏆 Top 3 🏆
                                </h2>
                                <p className="text-gray-600 font-medium">ผู้สมัครที่ได้รับความนิยมสูงสุด</p>
                            </div>
                            
                            <div className="flex items-end justify-center gap-6 max-w-4xl mx-auto">
                                {/* 2nd Place - Silver */}
                                <div className="flex-1 max-w-[160px] animate-fade-in" style={{ animationDelay: '0.2s' }}>
                                    <div className="relative">
                                        {/* Sparkle effects */}
                                        <div className="absolute -top-2 -left-2 text-2xl animate-pulse" style={{ animationDelay: '0.5s' }}>✨</div>
                                        <div className="bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 rounded-t-3xl p-5 text-center border-4 border-gray-400 shadow-2xl">
                                            <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden bg-white mb-3 shadow-xl ring-4 ring-gray-300/50">
                                                {sortedCandidates[1].imageUrl ? (
                                                    <img src={sortedCandidates[1].imageUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-4xl">🥈</div>
                                                )}
                                            </div>
                                            <div className="font-bold text-white text-base mb-2 line-clamp-2 drop-shadow-md">{sortedCandidates[1].name}</div>
                                            <div className="text-3xl font-bold text-white drop-shadow-lg">
                                                <AnimatedNumber value={sortedCandidates[1].voteCount} />
                                            </div>
                                            <div className="text-xs text-white/80 mt-1">โหวต</div>
                                        </div>
                                        <div className="bg-gradient-to-b from-gray-400 to-gray-500 h-28 rounded-b-2xl flex items-center justify-center shadow-xl">
                                            <div className="text-6xl drop-shadow-2xl">🥈</div>
                                        </div>
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                                            2nd
                                        </div>
                                    </div>
                                </div>

                                {/* 1st Place - Gold */}
                                <div className="flex-1 max-w-[190px] animate-fade-in -mt-4" style={{ animationDelay: '0.1s' }}>
                                    <div className="relative">
                                        {/* Crown and sparkles */}
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-5xl animate-bounce-soft">👑</div>
                                        <div className="absolute -top-1 -right-1 text-2xl animate-pulse" style={{ animationDelay: '0.3s' }}>✨</div>
                                        <div className="absolute -top-1 -left-1 text-2xl animate-pulse" style={{ animationDelay: '0.7s' }}>✨</div>
                                        <div className="bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 rounded-t-3xl p-6 text-center border-4 border-yellow-500 shadow-2xl ring-4 ring-amber-300/50">
                                            <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden bg-white mb-3 border-4 border-yellow-400 shadow-2xl ring-4 ring-yellow-300/30">
                                                {sortedCandidates[0].imageUrl ? (
                                                    <img src={sortedCandidates[0].imageUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-5xl">🏆</div>
                                                )}
                                            </div>
                                            <div className="font-bold text-amber-900 text-lg mb-2 line-clamp-2 drop-shadow-md">{sortedCandidates[0].name}</div>
                                            <div className="text-4xl font-bold bg-gradient-to-r from-amber-900 to-yellow-900 bg-clip-text text-transparent drop-shadow-lg">
                                                <AnimatedNumber value={sortedCandidates[0].voteCount} />
                                            </div>
                                            <div className="text-sm text-amber-900/80 mt-1 font-semibold">โหวต</div>
                                        </div>
                                        <div className="bg-gradient-to-b from-yellow-400 to-amber-500 h-36 rounded-b-2xl flex items-center justify-center shadow-2xl">
                                            <div className="text-7xl drop-shadow-2xl">🥇</div>
                                        </div>
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-5 py-1.5 rounded-full text-base font-bold shadow-2xl ring-2 ring-white">
                                            🏆 WINNER
                                        </div>
                                    </div>
                                </div>

                                {/* 3rd Place - Bronze */}
                                <div className="flex-1 max-w-[160px] animate-fade-in" style={{ animationDelay: '0.3s' }}>
                                    <div className="relative">
                                        {/* Sparkle effect */}
                                        <div className="absolute -top-2 -right-2 text-2xl animate-pulse" style={{ animationDelay: '0.9s' }}>✨</div>
                                        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 rounded-t-3xl p-5 text-center border-4 border-amber-700 shadow-2xl">
                                            <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden bg-white mb-3 shadow-xl ring-4 ring-amber-500/50">
                                                {sortedCandidates[2].imageUrl ? (
                                                    <img src={sortedCandidates[2].imageUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-4xl">🥉</div>
                                                )}
                                            </div>
                                            <div className="font-bold text-white text-base mb-2 line-clamp-2 drop-shadow-md">{sortedCandidates[2].name}</div>
                                            <div className="text-3xl font-bold text-white drop-shadow-lg">
                                                <AnimatedNumber value={sortedCandidates[2].voteCount} />
                                            </div>
                                            <div className="text-xs text-white/80 mt-1">โหวต</div>
                                        </div>
                                        <div className="bg-gradient-to-b from-amber-600 to-orange-700 h-24 rounded-b-2xl flex items-center justify-center shadow-xl">
                                            <div className="text-6xl drop-shadow-2xl">🥉</div>
                                        </div>
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-700 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                                            3rd
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Winner Card (if closed) */}
                {!isOpen && winner && (
                    <div className="bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 rounded-3xl p-8 shadow-2xl mb-6 animate-fade-in border-4 border-amber-600">
                        <div className="text-center mb-4">
                            <div className="text-6xl mb-3 animate-bounce-soft">🏆</div>
                            <h2 className="text-3xl font-bold text-white drop-shadow-lg mb-2">ผู้ชนะ</h2>
                        </div>
                        
                        <div className="bg-white rounded-2xl p-6 shadow-xl">
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-200 to-yellow-200 flex-shrink-0 shadow-lg">
                                    {winner.imageUrl ? (
                                        <img 
                                            src={winner.imageUrl} 
                                            alt={winner.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-5xl">
                                            {winner.category === 'band' && '�'}
                                            {winner.category === 'solo' && '�'}
                                            {winner.category === 'cover' && '�'}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{winner.name}</h3>
                                    <p className="text-gray-600 mb-3">{winner.description}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-4xl font-bold text-red-600">{winner.voteCount}</span>
                                        <span className="text-gray-500">โหวต</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results List */}
                <div className="space-y-4 animate-fade-in">
                    {sortedCandidates.map((candidate, index) => {
                        const percentage = totalVotes > 0 ? (candidate.voteCount / totalVotes * 100) : 0;
                        const barWidth = candidate.voteCount > 0 ? (candidate.voteCount / maxVotes * 100) : 0;
                        const isWinner = index === 0 && !isOpen;

                        return (
                            <div 
                                key={candidate.id}
                                className={`bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl transition-all duration-300 hover:scale-102 ${
                                    isWinner ? 'ring-4 ring-amber-400' : ''
                                }`}
                            >
                                <div className="p-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        {/* Rank Badge */}
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0 ${
                                            index === 0 ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg' :
                                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700' :
                                            index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                                            'bg-gray-200 text-gray-600'
                                        }`}>
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                        </div>

                                        {/* Avatar */}
                                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-red-200 to-amber-200 flex-shrink-0 shadow-lg">
                                            {candidate.imageUrl ? (
                                                <img 
                                                    src={candidate.imageUrl} 
                                                    alt={candidate.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-3xl">
                                                    {candidate.category === 'band' && '�'}
                                                    {candidate.category === 'solo' && '�'}
                                                    {candidate.category === 'cover' && '�'}
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-lg text-gray-800 truncate">{candidate.name}</h3>
                                            <p className="text-sm text-gray-600 truncate">{candidate.description}</p>
                                        </div>

                                        {/* Votes */}
                                        <div className="text-right">
                                            <div className="text-3xl font-bold text-red-600">
                                                <AnimatedNumber value={candidate.voteCount} />
                                            </div>
                                            <div className="text-sm text-gray-500">{percentage.toFixed(1)}%</div>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out ${
                                                index === 0 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' :
                                                index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                                                index === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
                                                'bg-gradient-to-r from-red-500 to-red-600'
                                            }`}
                                            style={{ width: `${barWidth}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {sortedCandidates.length === 0 && (
                        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-12 text-center shadow-xl">
                            <div className="text-6xl mb-4">📋</div>
                            <div className="text-gray-500 text-lg">ยังไม่มีผู้สมัครในหมวดนี้</div>
                        </div>
                    )}
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
