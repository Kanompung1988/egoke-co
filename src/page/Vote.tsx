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
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

    const { categories: voteSettings, loading: settingsLoading } = useVoteSettings();
    const { candidates, loading: candidatesLoading } = useCandidates(selectedCategory);
    const categorySettings = voteSettings[selectedCategory];
    const sessionId = categorySettings?.sessionId || 'default';
    const { hasVoted, votedCandidateId } = useUserVoteStatus(selectedCategory, sessionId);
    const { totalVotes } = useVoteStats(selectedCategory);

    // Auto-select first open category
    useEffect(() => {
        if (!settingsLoading && Object.keys(voteSettings).length > 0) {
            const openCategory = Object.entries(voteSettings).find(([_, settings]) => settings.isOpen);
            if (openCategory) {
                setSelectedCategory(openCategory[0]);
            }
        }
    }, [voteSettings, settingsLoading]);

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
            setShowSuccessAnimation(true);
            
            setTimeout(() => {
                setShowSuccessAnimation(false);
                setSelectedCandidate(null);
            }, 3000);
        } catch (error) {
            console.error('Failed to submit vote:', error);
            alert('เกิดข้อผิดพลาดในการโหวต กรุณาลองใหม่อีกครั้ง');
        } finally {
            setVotingInProgress(false);
        }
    };

    const isOpen = categorySettings?.isOpen || false;
    const isLoading = settingsLoading || candidatesLoading;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 shadow-lg">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                    🗳️ ระบบโหวต
                </h1>
                <p className="text-red-100">เลือกหมวดหมู่และโหวตให้ผู้สมัครที่คุณชื่นชอบ</p>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                {/* Category Tabs */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {CATEGORIES.map((cat) => {
                        const settings = voteSettings[cat.id];
                        const isSelected = selectedCategory === cat.id;
                        const isCategoryOpen = settings?.isOpen || false;

                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`relative p-4 rounded-xl font-bold transition-all duration-300 ${
                                    isSelected
                                        ? 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-xl scale-105'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
                                }`}
                            >
                                <div className="text-3xl mb-1">{cat.emoji}</div>
                                <div className="text-sm mb-1">{cat.name}</div>
                                
                                {/* Status Badge */}
                                <div className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold shadow-lg ${
                                    isCategoryOpen
                                        ? 'bg-green-500 text-white animate-pulse'
                                        : 'bg-gray-400 text-white'
                                }`}>
                                    {isCategoryOpen ? '🔴 LIVE' : '⏸️ ปิด'}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Status Info */}
                <div className={`p-4 rounded-xl mb-6 ${
                    isOpen
                        ? 'bg-green-50 border-2 border-green-300'
                        : 'bg-yellow-50 border-2 border-yellow-300'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="text-3xl">
                                {isOpen ? '✅' : '⏳'}
                            </div>
                            <div>
                                <div className="font-bold text-gray-800">
                                    {isOpen ? 'เปิดรับโหวตอยู่!' : 'ยังไม่เปิดรับโหวต'}
                                </div>
                                <div className="text-sm text-gray-600">
                                    {isOpen
                                        ? hasVoted
                                            ? 'คุณโหวตในหมวดนี้แล้ว'
                                            : 'คลิกที่ผู้สมัครเพื่อโหวต'
                                        : 'รอการเปิดรับโหวตจากผู้ดูแลระบบ'
                                    }
                                </div>
                            </div>
                        </div>
                        {hasVoted && (
                            <div className="bg-amber-400 text-white px-4 py-2 rounded-full font-bold shadow-lg">
                                ✓ โหวตแล้ว
                            </div>
                        )}
                    </div>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
                        <p className="mt-4 text-gray-600">กำลังโหลด...</p>
                    </div>
                )}

                {/* Content Grid */}
                {!isLoading && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Candidates Grid */}
                        <div className="lg:col-span-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {candidates.map((candidate) => (
                                    <VoteCard
                                        key={candidate.id}
                                        candidate={candidate}
                                        onVote={handleVoteClick}
                                        hasVoted={hasVoted}
                                        isVotedCandidate={votedCandidateId === candidate.id}
                                        isOpen={isOpen}
                                        totalVotes={totalVotes}
                                    />
                                ))}
                            </div>

                            {candidates.length === 0 && (
                                <div className="bg-white rounded-2xl p-12 text-center shadow-xl">
                                    <div className="text-6xl mb-4">📋</div>
                                    <div className="text-gray-500 text-lg">ยังไม่มีผู้สมัครในหมวดนี้</div>
                                </div>
                            )}
                        </div>

                        {/* Stats Sidebar */}
                        <div className="lg:col-span-1">
                            <VoteStats candidates={candidates} totalVotes={totalVotes} />
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && selectedCandidate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fade-in-down">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">
                            ยืนยันการโหวต
                        </h3>
                        
                        <div className="bg-gray-50 rounded-xl p-4 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-red-200 to-amber-200 flex-shrink-0">
                                    {selectedCandidate.imageUrl ? (
                                        <img 
                                            src={selectedCandidate.imageUrl} 
                                            alt={selectedCandidate.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-3xl">
                                            {selectedCandidate.category === 'karaoke' && '🎤'}
                                            {selectedCandidate.category === 'food' && '🍜'}
                                            {selectedCandidate.category === 'cosplay' && '👘'}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-grow">
                                    <div className="font-bold text-gray-800">{selectedCandidate.name}</div>
                                    <div className="text-sm text-gray-600">{selectedCandidate.description}</div>
                                </div>
                            </div>
                        </div>

                        <p className="text-gray-600 mb-6">
                            คุณแน่ใจหรือไม่ที่จะโหวตให้ผู้สมัครคนนี้? 
                            <span className="font-bold text-red-600"> คุณจะไม่สามารถเปลี่ยนแปลงได้</span>
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    setSelectedCandidate(null);
                                }}
                                disabled={votingInProgress}
                                className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-xl font-bold transition-colors disabled:opacity-50"
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

            {/* Success Animation */}
            {showSuccessAnimation && (
                <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                    <div className="bg-white rounded-full p-12 shadow-2xl animate-bounce-soft">
                        <div className="text-8xl animate-pulse">🎉</div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}

