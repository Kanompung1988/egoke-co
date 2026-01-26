import { useState, useEffect } from 'react';
import { useVoteSettings, useCandidates, useUserVoteStatus, submitVote, useVoteStats } from '../hooks/useVote';
import { useAuth } from '../hooks/useAuth';
import VoteCard from '../components/VoteCard';
import VoteStats from '../components/VoteStats';
import BottomNav from "../components/BottomNav";
import type { Candidate } from '../hooks/useVote';

const CATEGORIES = [
    { id: 'karaoke', name: 'Karaoke Contest', emoji: '🎤', description: 'ร้องเพลงให้ดีที่สุด' },
    { id: 'food', name: 'Best Food', emoji: '🍜', description: 'อาหารอร่อยที่สุด' },
    { id: 'cosplay', name: 'Cosplay Contest', emoji: '👘', description: 'คอสเพลย์สวยที่สุด' },
];

export default function Vote() {
    const { currentUser } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState<string>('karaoke');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [votingInProgress, setVotingInProgress] = useState(false);
    const [showVoteSuccess, setShowVoteSuccess] = useState(false);
    const [votedCandidate, setVotedCandidate] = useState<Candidate | null>(null);

    const { categories: voteSettings, loading: settingsLoading } = useVoteSettings();
    const { candidates, loading: candidatesLoading } = useCandidates(selectedCategory);
    const categorySettings = voteSettings[selectedCategory];
    const sessionId = categorySettings?.sessionId || 'default';
    const { hasVoted, votedCandidateId } = useUserVoteStatus(selectedCategory, sessionId);
    const { totalVotes } = useVoteStats(selectedCategory);

    const isStaff = currentUser?.role === 'staff';

    // Auto-select first open category
    useEffect(() => {
        if (!settingsLoading && Object.keys(voteSettings).length > 0) {
            const openCategory = Object.entries(voteSettings).find(([_, settings]) => settings.isOpen);
            if (openCategory) {
                setSelectedCategory(openCategory[0]);
            }
        }
    }, [voteSettings, settingsLoading]);

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
            await submitVote(selectedCategory, sessionId, selectedCandidate);
            
            setShowConfirmModal(false);
            setVotedCandidate(selectedCandidate);
            setShowVoteSuccess(true);
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
                {/* Background */}
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/art/temple-bg.png')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-red-900/60 to-amber-900/60" />
                
                {/* Confetti Animation */}
                <div className="fireworks-container">
                    <div className="firework firework-1"></div>
                    <div className="firework firework-2"></div>
                    <div className="firework firework-3"></div>
                </div>

                <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center animate-fade-in-down">
                        {/* Success Icon */}
                        <div className="mb-6 animate-bounce-soft">
                            <div className="text-9xl mb-4">🎉</div>
                            <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">
                                โหวตสำเร็จ!
                            </h1>
                            <p className="text-white/90 text-lg">ขอบคุณที่ร่วมโหวต</p>
                        </div>

                        {/* Voted Candidate Card */}
                        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl mb-6">
                            <p className="text-gray-600 mb-4">คุณได้โหวตให้</p>
                            
                            <div className="relative mb-4">
                                <div className="w-40 h-40 mx-auto rounded-2xl overflow-hidden shadow-xl ring-4 ring-amber-400">
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
                                        <div className="w-full h-full bg-gradient-to-br from-red-200 to-amber-200 flex items-center justify-center text-6xl">
                                            {votedCandidate.category === 'karaoke' && '🎤'}
                                            {votedCandidate.category === 'food' && '🍜'}
                                            {votedCandidate.category === 'cosplay' && '👘'}
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -top-2 -right-2 bg-amber-400 text-white p-3 rounded-full shadow-lg animate-pulse">
                                    ✓
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                {votedCandidate.name}
                            </h2>
                            <p className="text-gray-600 mb-4">
                                {votedCandidate.description}
                            </p>

                            <div className="bg-gradient-to-r from-red-50 to-amber-50 rounded-xl p-4 border border-red-200">
                                <div className="flex items-center justify-center gap-2 text-red-700">
                                    <span className="text-3xl font-bold">{votedCandidate.voteCount + 1}</span>
                                    <span className="text-sm">โหวต</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowVoteSuccess(false)}
                            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95"
                        >
                            ดูผลโหวตทั้งหมด
                        </button>
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
                                        className={`relative p-3 rounded-xl font-bold transition-all duration-300 ${
                                            isSelected
                                                ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-xl scale-105'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        <div className="text-2xl mb-1">{cat.emoji}</div>
                                        <div className="text-xs">{cat.name}</div>
                                        
                                        {/* Status Badge */}
                                        <div className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-xs font-bold shadow-lg ${
                                            isCategoryOpen
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

                {/* Status Info - Simplified for Users */}
                {!isOpen && (
                    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 text-center shadow-xl mb-4 animate-fade-in">
                        <div className="text-6xl mb-4">⏳</div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">ยังไม่เปิดรับโหวต</h3>
                        <p className="text-gray-600">
                            รอการเปิดรับโหวตจากผู้ดูแลระบบ
                        </p>
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
                                            {candidate.category === 'karaoke' && '🎤'}
                                            {candidate.category === 'food' && '🍜'}
                                            {candidate.category === 'cosplay' && '👘'}
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
                                        <div className={`w-full py-3 rounded-xl font-bold text-center ${
                                            votedCandidateId === candidate.id
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
                                            {selectedCandidate.category === 'karaoke' && '🎤'}
                                            {selectedCandidate.category === 'food' && '🍜'}
                                            {selectedCandidate.category === 'cosplay' && '👘'}
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
                            คุณแน่ใจหรือไม่ที่จะโหวตให้ผู้สมัครคนนี้?<br/>
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

            <BottomNav />
        </div>
    );
}

