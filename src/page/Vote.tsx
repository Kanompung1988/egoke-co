import { useState, useEffect } from 'react';
import { useVoteSettings, useCandidates, useUserVoteStatus, submitVote, useVoteStats } from '../hooks/useVote';
import { useAuth } from '../hooks/useAuth';
import VoteStats from '../components/VoteStats';
import BottomNav from "../components/BottomNav";
import type { Candidate } from '../hooks/useVote';

const CATEGORIES = [
    { id: 'band', name: 'Band', emoji: '🎸', description: 'วงดนตรี' },
    { id: 'solo', name: 'Solo', emoji: '🎤', description: 'นักร้องเดี่ยว' },
    { id: 'cover', name: 'Cover', emoji: '💃', description: 'Cover Dance' },
];

export default function Vote() {
    const { currentUser } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState<string>('band');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [votingInProgress, setVotingInProgress] = useState(false);
    const [showVoteSuccess, setShowVoteSuccess] = useState(false);
    const [votedCandidate, setVotedCandidate] = useState<Candidate | null>(null);
    const [notificationEnabled, setNotificationEnabled] = useState(false);

    const { categories: voteSettings, loading: settingsLoading } = useVoteSettings();
    const { candidates, loading: candidatesLoading } = useCandidates(selectedCategory);
    const categorySettings = voteSettings[selectedCategory];
    const sessionId = categorySettings?.sessionId || 'default';
    const { hasVoted, votedCandidateId } = useUserVoteStatus(selectedCategory, sessionId);
    const { totalVotes } = useVoteStats(selectedCategory);

    const isStaff = currentUser?.role === 'staff';

    // ✅ ฟังก์ชันส่งคะแนนไป Google Sheet (รับ ID และ คะแนนล่าสุด)
    const syncVoteToSheet = async (sheetId: string | number, score: number) => {
        // อย่าลืมตรวจสอบ URL นี้ให้ตรงกับที่ Deploy ล่าสุด
        const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbydIA-iqoEoLhvzW4VCw1UvLYQLrjwXVyMg8EMCVo8fHWWiwy-bJvnBdqPEQyoG9Bmj/exec";

        try {
            // ส่งแบบ no-cors (Fire and forget)
            await fetch(`${SCRIPT_URL}?id=${sheetId}&score=${score}`, {
                method: "POST",
                mode: "no-cors",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            });
            console.log(`📤 Synced to Sheet: ID=${sheetId}, Score=${score}`);
        } catch (error) {
            console.error("Failed to sync sheet:", error);
        }
    };

    // Request notification permission
    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            alert('เบราว์เซอร์ของคุณไม่รองรับการแจ้งเตือน');
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setNotificationEnabled(true);
                new Notification('🔔 เปิดการแจ้งเตือนแล้ว!', {
                    body: 'คุณจะได้รับการแจ้งเตือนเมื่อเปิดให้โหวต',
                    icon: '/logo.jpg',
                });

                // Store in localStorage
                localStorage.setItem('voteNotificationEnabled', 'true');
            }
        } catch (error) {
            console.error('Failed to request notification:', error);
        }
    };

    // Check notification permission on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setNotificationEnabled(
                Notification.permission === 'granted' &&
                localStorage.getItem('voteNotificationEnabled') === 'true'
            );
        }
    }, []);

    // Auto-select first open category
    useEffect(() => {
        if (!settingsLoading && Object.keys(voteSettings).length > 0) {
            const openCategory = Object.entries(voteSettings).find(([_, settings]) => settings.isOpen);
            if (openCategory && openCategory[0] !== selectedCategory) {
                console.log('🎯 Auto-selecting open category:', openCategory[0]);
                setSelectedCategory(openCategory[0]);
            }
        }
    }, [voteSettings, settingsLoading]);

    // Monitor vote status changes and send notifications
    useEffect(() => {
        if (!settingsLoading && categorySettings && notificationEnabled) {
            const wasOpen = localStorage.getItem(`voteOpen_${selectedCategory}`);
            const isNowOpen = categorySettings.isOpen;

            if (wasOpen === 'false' && isNowOpen && !hasVoted) {
                // Vote just opened!
                new Notification('🎉 เปิดให้โหวตแล้ว!', {
                    body: `หมวด ${CATEGORIES.find(c => c.id === selectedCategory)?.name} เปิดให้โหวตแล้ว`,
                    icon: '/logo.jpg',
                    tag: `vote-${selectedCategory}`,
                    requireInteraction: true
                });
            }

            localStorage.setItem(`voteOpen_${selectedCategory}`, isNowOpen.toString());
        }
    }, [categorySettings?.isOpen, selectedCategory, settingsLoading, notificationEnabled, hasVoted]);

    // Find voted candidate for display
    useEffect(() => {
        if (hasVoted && votedCandidateId) {
            const voted = candidates.find(c => c.id === votedCandidateId);
            if (voted) {
                setVotedCandidate(voted);
            }
        }
    }, [hasVoted, votedCandidateId, candidates]);

    const handleVoteClick = (candidate: Candidate) => {
        if (!hasVoted && categorySettings?.isOpen) {
            setSelectedCandidate(candidate);
            setShowConfirmModal(true);
        }
    };

    const handleConfirmVote = async () => {
        if (!selectedCandidate || !currentUser) return;

        setVotingInProgress(true);
        try {
            const result = await submitVote(selectedCategory, sessionId, selectedCandidate);

            if (result.success) {
                setShowConfirmModal(false);
                setVotedCandidate(selectedCandidate);
                setShowVoteSuccess(true);
            } else {
                alert(result.error || 'เกิดข้อผิดพลาดในการโหวต');
            }
        } catch (error) {
            console.error('Failed to submit vote:', error);
            alert('เกิดข้อผิดพลาดในการโหวต กรุณาลองใหม่อีกครั้ง');
        } finally {
            setVotingInProgress(false);
            setSelectedCandidate(null);
        }
    };

    const isOpen = categorySettings?.isOpen || false;
    const isLoading = settingsLoading || candidatesLoading;

    // Show success page after voting
    if (showVoteSuccess && votedCandidate) {
        return (
            <div className="min-h-screen relative overflow-hidden pb-24">
                {/* Background with animated gradient */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/art/temple-bg.png')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-red-900/70 via-amber-900/60 to-red-900/70 animate-pulse"
                    style={{ animationDuration: '3s' }}
                />

                {/* Floating particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-float"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`,
                                animationDuration: `${3 + Math.random() * 4}s`
                            }}
                        >
                            <span className="text-2xl opacity-30">
                                {['🎉', '✨', '⭐', '🎊', '💫'][Math.floor(Math.random() * 5)]}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Fireworks */}
                <div className="fireworks-container">
                    <div className="firework firework-1"></div>
                    <div className="firework firework-2"></div>
                    <div className="firework firework-3"></div>
                </div>

                <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                    <div className="max-w-lg w-full">
                        {/* Success Animation */}
                        <div className="text-center mb-8 animate-fade-in-down">
                            <div className="relative inline-block mb-4">
                                <div className="text-9xl animate-bounce-soft">🎉</div>
                                <div className="absolute -top-4 -right-4 text-6xl animate-spin-slow">✨</div>
                                <div className="absolute -bottom-4 -left-4 text-6xl animate-spin-slow" style={{ animationDelay: '0.5s' }}>⭐</div>
                            </div>
                            <h1 className="text-5xl font-bold text-white drop-shadow-2xl mb-3 animate-fade-in">
                                โหวตสำเร็จ!
                            </h1>
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <div className="h-1 w-12 bg-amber-400 rounded-full"></div>
                                <span className="text-amber-400 text-2xl">✦</span>
                                <div className="h-1 w-12 bg-amber-400 rounded-full"></div>
                            </div>
                            <p className="text-white/90 text-xl">ขอบคุณที่ร่วมโหวต</p>
                        </div>

                        {/* Voted Candidate Card - Enhanced */}
                        <div className="bg-gradient-to-br from-white via-white to-amber-50/50 backdrop-blur-xl rounded-3xl p-8 shadow-2xl mb-6 border-2 border-amber-400/30 animate-fade-in"
                            style={{ animationDelay: '0.2s' }}>
                            <div className="flex items-center justify-center gap-2 mb-6">
                                <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-amber-400 to-amber-400"></div>
                                <p className="text-amber-600 font-bold text-sm tracking-wider">คุณได้โหวตให้</p>
                                <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent via-amber-400 to-amber-400"></div>
                            </div>

                            <div className="relative mb-6">
                                <div className="w-48 h-48 mx-auto rounded-3xl overflow-hidden shadow-2xl ring-4 ring-amber-400 ring-offset-4 ring-offset-white/50 transform hover:scale-105 transition-transform duration-300">
                                    {votedCandidate.imageUrl ? (
                                        <img
                                            src={votedCandidate.imageUrl}
                                            alt={votedCandidate.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = '/art/logo.png';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-red-300 via-amber-300 to-yellow-300 flex items-center justify-center text-8xl">
                                            {votedCandidate.category === 'band' && ''}
                                            {votedCandidate.category === 'solo' && ''}
                                            {votedCandidate.category === 'cover' && ''}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -top-3 -right-3 bg-gradient-to-br from-amber-400 to-amber-600 text-white p-4 rounded-2xl shadow-2xl animate-pulse">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>

                            <div className="text-center mb-6">
                                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-3">
                                    {votedCandidate.name}
                                </h2>
                                <p className="text-gray-600 text-base leading-relaxed px-4">
                                    {votedCandidate.description}
                                </p>
                            </div>

                            <div className="bg-gradient-to-r from-red-500 via-amber-500 to-red-500 rounded-2xl p-1 shadow-xl">
                                <div className="bg-white rounded-xl p-4">
                                    <div className="flex items-center justify-center gap-3">
                                        <span className="text-5xl font-bold bg-gradient-to-r from-red-600 to-amber-600 bg-clip-text text-transparent">
                                            {votedCandidate.voteCount + 1}
                                        </span>
                                        <div className="text-left">
                                            <div className="text-sm text-gray-500">คะแนนโหวต</div>
                                            <div className="text-xs text-amber-600 font-bold">รวมทั้งหมด</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                            <button
                                onClick={() => setShowVoteSuccess(false)}
                                className="w-full bg-gradient-to-r from-red-600 via-red-700 to-amber-600 hover:from-red-700 hover:via-red-800 hover:to-amber-700 text-white py-4 rounded-2xl font-bold shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span>ดูผลโหวตทั้งหมด</span>
                            </button>

                            {isStaff && (
                                <button
                                    onClick={() => {
                                        setShowVoteSuccess(false);
                                        window.location.href = '/admin';
                                    }}
                                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <span>🛡️</span>
                                    <span>ไปยัง Admin Dashboard</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <BottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden pb-24">
            {/* Background */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/art/temple-bg.png')" }}
            />
            <div className="absolute inset-0 bg-red-900/40" />

            {/* Fireworks */}
            <div className="fireworks-container">
                <div className="firework firework-1"></div>
                <div className="firework firework-2"></div>
                <div className="firework firework-3"></div>
            </div>

            <div className="relative z-10 container mx-auto max-w-6xl px-4 pt-6">
                {/* Header */}
                <div className="text-center mb-6 animate-fade-in">
                    <img
                        src="/logo.jpg"
                        alt="Logo"
                        className="w-16 h-16 mx-auto mb-3 rounded-xl shadow-xl border-2 border-white/30"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/art/logo.png'; }}
                    />
                    <h1 className="text-3xl font-bold text-white drop-shadow-lg mb-2">🗳️ ระบบโหวต</h1>
                    <p className="text-white/80">เลือกผู้สมัครที่คุณชื่นชอบ</p>
                </div>

                <div className="max-w-7xl mx-auto p-6">
                    {/* Category Tabs - Only for Staff */}
                    {isStaff && (
                        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl mb-4 animate-fade-in">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-purple-600">🛡️</span>
                                <span className="text-sm font-bold text-purple-600">Admin View</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {CATEGORIES.map((cat) => {
                                    const settings = voteSettings[cat.id];
                                    const isSelected = selectedCategory === cat.id;
                                    const isCategoryOpen = settings?.isOpen || false;

                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`relative p-3 rounded-xl font-bold transition-all duration-300 ${isSelected
                                                ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-xl scale-105'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            <div className="text-2xl mb-1">{cat.emoji}</div>
                                            <div className="text-xs">{cat.name}</div>

                                            {/* Status Badge */}
                                            <div className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-xs font-bold shadow-lg ${isCategoryOpen
                                                ? 'bg-green-500 text-white animate-pulse'
                                                : 'bg-gray-400 text-white'
                                                }`}>
                                                {isCategoryOpen ? 'LIVE' : 'ปิด'}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Status Info - Beautiful Coming Soon Modal */}
                    {!isOpen && !hasVoted && (
                        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl mb-4 animate-fade-in overflow-hidden border-2 border-red-100">
                            {/* Header with gradient */}
                            <div className="bg-gradient-to-br from-red-50 via-amber-50 to-red-50 px-6 py-8 text-center border-b border-red-100">
                                <div className="relative inline-block mb-4">
                                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-red-100 to-amber-100 rounded-3xl flex items-center justify-center shadow-xl">
                                        <span className="text-5xl">🎊</span>
                                    </div>
                                </div>
                                <h3 className="text-3xl font-bold bg-gradient-to-r from-red-700 to-amber-700 bg-clip-text text-transparent mb-2">
                                    เร็วๆ นี้!
                                </h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    ระบบโหวตกำลังจะเปิดในภายหลัง นี้<br />
                                    ติดตามกรอคาร์ไลล์ให้มาหลัก
                                </p>
                            </div>

                            {/* Categories Preview */}
                            <div className="px-6 py-6 space-y-3">
                                {CATEGORIES.map((cat) => {
                                    const settings = voteSettings[cat.id];
                                    const isCategoryOpen = settings?.isOpen || false;

                                    return (
                                        <div key={cat.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                                            <div className="text-4xl">{cat.emoji}</div>
                                            <div className="flex-1">
                                                <div className="font-bold text-gray-800">{cat.name}</div>
                                                <div className="text-sm text-gray-500">{cat.description}</div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${isCategoryOpen
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {isCategoryOpen ? '✓ เปิด' : 'เร็วๆ นี้'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Notification Button */}
                            <div className="px-6 pb-6">
                                <button
                                    onClick={requestNotificationPermission}
                                    disabled={notificationEnabled}
                                    className={`w-full py-4 rounded-2xl font-bold shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${notificationEnabled
                                        ? 'bg-green-500 text-white cursor-default'
                                        : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
                                        }`}
                                >
                                    {notificationEnabled ? (
                                        <>
                                            <span className="text-2xl">✓</span>
                                            <span>เปิดการแจ้งเตือนแล้ว</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-2xl">🔔</span>
                                            <span>แจ้งเตือนเมื่อเปิดให้โหวต</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-t border-green-100">
                                <div className="flex items-center justify-center gap-2 text-green-700">
                                    <span className="text-xl">✓</span>
                                    <div className="text-sm">
                                        <div className="font-bold">คุณพร้อมโหวตแล้ว!</div>
                                        <div className="text-xs text-green-600">ติดตามเพิ่มเติม - ระบบพร้อมใช้งาน</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Already Voted - Beautiful Modal */}
                    {!isOpen && hasVoted && (
                        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl mb-4 animate-fade-in overflow-hidden border-2 border-amber-100">
                            {/* Header */}
                            <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50 px-6 py-8 text-center border-b border-amber-100">
                                <div className="relative inline-block mb-4">
                                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-100 to-yellow-100 rounded-3xl flex items-center justify-center shadow-xl">
                                        <span className="text-5xl">🎉</span>
                                    </div>
                                </div>
                                <h3 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-yellow-700 bg-clip-text text-transparent mb-2">
                                    ขอบคุณที่โหวต!
                                </h3>
                                <p className="text-gray-600 text-sm">
                                    คุณได้ทำการโหวตเรียบร้อยแล้ว
                                </p>
                            </div>

                            {/* Categories Status */}
                            <div className="px-6 py-6 space-y-3">
                                {CATEGORIES.map((cat) => {
                                    const settings = voteSettings[cat.id];
                                    const isCategoryOpen = settings?.isOpen || false;

                                    return (
                                        <div key={cat.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
                                            <div className="text-4xl">{cat.emoji}</div>
                                            <div className="flex-1">
                                                <div className="font-bold text-gray-800">{cat.name}</div>
                                                <div className="text-sm text-gray-500">{cat.description}</div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${isCategoryOpen
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {isCategoryOpen ? '✓ เปิด' : 'ปิด'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Button */}
                            <div className="px-6 pb-6">
                                <button
                                    onClick={() => setShowVoteSuccess(true)}
                                    className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white py-4 rounded-2xl font-bold shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <span className="text-2xl">📊</span>
                                    <span>ดูผลโหวตของคุณ</span>
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-t border-green-100">
                                <div className="flex items-center justify-center gap-2 text-green-700">
                                    <span className="text-xl">✓</span>
                                    <div className="text-sm">
                                        <div className="font-bold">คุณโหวตแล้ว!</div>
                                        <div className="text-xs text-green-600">ขอบคุณมากครับ - ระบบทำงานใช้งาน</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-12 text-center shadow-xl animate-fade-in">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
                            <p className="mt-4 text-gray-600">กำลังโหลด...</p>
                        </div>
                    )}

                    {/* Content - Candidates Only for Users */}
                    {!isLoading && isOpen && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                            {candidates.map((candidate) => (
                                <div key={candidate.id} className="bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                                    {/* Image */}
                                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
                                        {candidate.imageUrl ? (
                                            <img
                                                src={candidate.imageUrl}
                                                alt={candidate.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '/art/logo.png';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-6xl">
                                                {candidate.category === 'band' && ''}
                                                {candidate.category === 'solo' && ''}
                                                {candidate.category === 'cover' && ''}
                                            </div>
                                        )}

                                        {/* Voted Badge */}
                                        {votedCandidateId === candidate.id && (
                                            <div className="absolute top-3 right-3 bg-amber-400 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
                                                ✓ คุณโหวตให้
                                            </div>
                                        )}

                                        {/* Vote Count Badge - Only for Staff */}
                                        {isStaff && (
                                            <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                                                {candidate.voteCount} โหวต
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <h3 className="font-bold text-lg text-gray-800 mb-1 line-clamp-2">
                                            {candidate.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                            {candidate.description}
                                        </p>

                                        {/* Vote Button */}
                                        {!hasVoted ? (
                                            <button
                                                onClick={() => handleVoteClick(candidate)}
                                                className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
                                            >
                                                🗳️ โหวตให้
                                            </button>
                                        ) : (
                                            <div className={`w-full py-3 rounded-xl font-bold text-center ${votedCandidateId === candidate.id
                                                ? 'bg-amber-400 text-white'
                                                : 'bg-gray-300 text-gray-500'
                                                }`}>
                                                {votedCandidateId === candidate.id ? '✓ โหวตแล้ว' : 'คุณโหวตคนอื่นแล้ว'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {candidates.length === 0 && (
                                <div className="col-span-full bg-white/95 backdrop-blur-sm rounded-2xl p-12 text-center shadow-xl">
                                    <div className="text-6xl mb-4">📋</div>
                                    <div className="text-gray-500 text-lg">ยังไม่มีผู้สมัครในหมวดนี้</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stats for Staff Only */}
                    {isStaff && !isLoading && isOpen && (
                        <div className="mt-6 animate-fade-in">
                            <VoteStats candidates={candidates} totalVotes={totalVotes} />
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && selectedCandidate && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full shadow-2xl animate-fade-in-down">
                        <div className="text-center mb-6">
                            <div className="text-6xl mb-3">🗳️</div>
                            <h3 className="text-2xl font-bold text-gray-800">
                                ยืนยันการโหวต
                            </h3>
                        </div>

                        <div className="bg-gradient-to-br from-red-50 to-amber-50 rounded-xl p-6 mb-6 border border-red-200">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-red-200 to-amber-200 flex-shrink-0 shadow-lg">
                                    {selectedCandidate.imageUrl ? (
                                        <img
                                            src={selectedCandidate.imageUrl}
                                            alt={selectedCandidate.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-5xl">
                                            {selectedCandidate.category === 'band' && ''}
                                            {selectedCandidate.category === 'solo' && ''}
                                            {selectedCandidate.category === 'cover' && ''}
                                        </div>
                                    )}
                                </div>
                                <div className="text-center">
                                    <div className="font-bold text-xl text-gray-800 mb-1">{selectedCandidate.name}</div>
                                    <div className="text-sm text-gray-600">{selectedCandidate.description}</div>
                                </div>
                            </div>
                        </div>

                        <p className="text-gray-600 text-center mb-6">
                            คุณแน่ใจหรือไม่ที่จะโหวตให้ผู้สมัครคนนี้?<br />
                            <span className="font-bold text-red-600">คุณจะไม่สามารถเปลี่ยนแปลงได้</span>
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    setSelectedCandidate(null);
                                }}
                                disabled={votingInProgress}
                                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-all disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleConfirmVote}
                                disabled={votingInProgress}
                                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-bold transition-all shadow-lg disabled:opacity-50"
                            >
                                {votingInProgress ? '⏳ กำลังโหวต...' : '✓ ยืนยันโหวต'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Vote Weight Notice - Bottom Panel */}
            <div className="max-w-7xl mx-auto px-6 pb-6">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-xl border border-gray-200">
                    <div className="text-center mb-3">
                        <h3 className="font-bold text-lg text-gray-800">📋 เกี่ยวกับคะแนนการโหวต</h3>
                    </div>
                    <div className="space-y-2 text-sm text-gray-700">
                        <p className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold mt-0.5">•</span>
                            <span>คะแนนโหวตจากเว็บไซต์นี้คิดเป็น <span className="font-bold text-blue-600">30%</span> ของคะแนนรวมทั้งหมด สำหรับการตัดสินผู้ชนะในแต่ละหมวด (Band, Solo, Cover Dance)</span>
                        </p>
                        <p className="flex items-start gap-2">
                            <span className="text-purple-600 font-bold mt-0.5">•</span>
                            <span>คะแนนส่วนที่เหลือ <span className="font-bold text-purple-600">70%</span> จะคิดจากรางวัลและการตัดสินภายในงาน EGOKE</span>
                        </p>
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}