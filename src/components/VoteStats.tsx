import { useMemo } from 'react';
import type { Candidate } from '../hooks/useVote';

interface VoteStatsProps {
    candidates: Candidate[];
    totalVotes: number;
}

export default function VoteStats({ candidates, totalVotes }: VoteStatsProps) {
    // Sort candidates by vote count
    const sortedCandidates = useMemo(() => {
        return [...candidates].sort((a, b) => b.voteCount - a.voteCount);
    }, [candidates]);

    const topThree = sortedCandidates.slice(0, 3);

    const getRankColor = (rank: number) => {
        switch (rank) {
            case 0: return 'from-yellow-400 to-yellow-600'; // Gold
            case 1: return 'from-gray-300 to-gray-500'; // Silver
            case 2: return 'from-amber-600 to-amber-800'; // Bronze
            default: return 'from-gray-400 to-gray-600';
        }
    };

    const getRankEmoji = (rank: number) => {
        switch (rank) {
            case 0: return '🥇';
            case 1: return '🥈';
            case 2: return '🥉';
            default: return '🏅';
        }
    };

    return (
        <div className="space-y-6">
            {/* Total Stats */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-6 text-white shadow-xl">
                <div className="text-center">
                    <div className="text-5xl font-bold mb-2">{totalVotes}</div>
                    <div className="text-lg opacity-90">โหวตทั้งหมด</div>
                </div>
            </div>

            {/* Top 3 Podium */}
            {topThree.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-xl">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                        🏆 อันดับยอดนิยม
                    </h3>
                    
                    <div className="space-y-3">
                        {topThree.map((candidate, index) => {
                            const percentage = totalVotes > 0 ? (candidate.voteCount / totalVotes * 100) : 0;
                            
                            return (
                                <div 
                                    key={candidate.id}
                                    className="relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-105"
                                >
                                    {/* Background Gradient */}
                                    <div className={`absolute inset-0 bg-gradient-to-r ${getRankColor(index)} opacity-20`} />
                                    
                                    <div className="relative p-4 flex items-center gap-4">
                                        {/* Rank Badge */}
                                        <div className={`flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${getRankColor(index)} flex items-center justify-center text-white font-bold shadow-lg`}>
                                            <span className="text-2xl">{getRankEmoji(index)}</span>
                                        </div>

                                        {/* Candidate Info */}
                                        <div className="flex-grow min-w-0">
                                            <div className="font-bold text-gray-800 truncate">
                                                {candidate.name}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex-grow bg-gray-200 rounded-full h-2 overflow-hidden">
                                                    <div 
                                                        className={`h-full bg-gradient-to-r ${getRankColor(index)} transition-all duration-500`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Vote Count */}
                                        <div className="flex-shrink-0 text-right">
                                            <div className="font-bold text-xl text-gray-800">
                                                {candidate.voteCount}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {percentage.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* All Rankings */}
            {sortedCandidates.length > 3 && (
                <div className="bg-white rounded-2xl p-6 shadow-xl">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                        📊 อันดับทั้งหมด
                    </h3>
                    
                    <div className="space-y-2">
                        {sortedCandidates.map((candidate, index) => {
                            const percentage = totalVotes > 0 ? (candidate.voteCount / totalVotes * 100) : 0;
                            
                            return (
                                <div 
                                    key={candidate.id}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    {/* Rank Number */}
                                    <div className="flex-shrink-0 w-8 text-center font-bold text-gray-600">
                                        #{index + 1}
                                    </div>

                                    {/* Candidate Name */}
                                    <div className="flex-grow min-w-0 truncate text-gray-800">
                                        {candidate.name}
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="flex-grow max-w-32">
                                        <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                            <div 
                                                className="bg-red-600 h-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Vote Count */}
                                    <div className="flex-shrink-0 text-right min-w-20">
                                        <span className="font-bold text-gray-800">{candidate.voteCount}</span>
                                        <span className="text-sm text-gray-500 ml-1">({percentage.toFixed(1)}%)</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {sortedCandidates.length === 0 && (
                <div className="bg-white rounded-2xl p-12 text-center shadow-xl">
                    <div className="text-6xl mb-4">🗳️</div>
                    <div className="text-gray-500">ยังไม่มีผู้สมัครในหมวดนี้</div>
                </div>
            )}
        </div>
    );
}
