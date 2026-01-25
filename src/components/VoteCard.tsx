import type { Candidate } from '../hooks/useVote';

interface VoteCardProps {
    candidate: Candidate;
    onVote: (candidate: Candidate) => void;
    hasVoted: boolean;
    isVotedCandidate: boolean;
    isOpen: boolean;
    totalVotes: number;
}

export default function VoteCard({ 
    candidate, 
    onVote, 
    hasVoted, 
    isVotedCandidate, 
    isOpen,
    totalVotes 
}: VoteCardProps) {
    const votePercentage = totalVotes > 0 ? (candidate.voteCount / totalVotes * 100) : 0;

    return (
        <div className={`group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 ${
            isVotedCandidate ? 'ring-4 ring-amber-400' : ''
        }`}>
            {/* Image */}
            <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
                {candidate.imageUrl ? (
                    <img 
                        src={candidate.imageUrl} 
                        alt={candidate.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
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
                {isVotedCandidate && (
                    <div className="absolute top-3 right-3 bg-amber-400 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
                        ✓ คุณโหวตให้
                    </div>
                )}

                {/* Vote Count Badge */}
                <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                    {candidate.voteCount} โหวต
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="font-bold text-lg text-gray-800 mb-1 line-clamp-2">
                    {candidate.name}
                </h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {candidate.description}
                </p>

                {/* Progress Bar */}
                <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>คะแนนโหวต</span>
                        <span>{votePercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-red-500 to-amber-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${votePercentage}%` }}
                        />
                    </div>
                </div>

                {/* Vote Button */}
                {isOpen ? (
                    <button
                        onClick={() => onVote(candidate)}
                        disabled={hasVoted}
                        className={`w-full py-3 rounded-xl font-bold transition-all duration-300 ${
                            hasVoted
                                ? isVotedCandidate
                                    ? 'bg-amber-400 text-white cursor-not-allowed'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl active:scale-95'
                        }`}
                    >
                        {hasVoted ? (
                            isVotedCandidate ? '✓ โหวตแล้ว' : 'คุณโหวตคนอื่นแล้ว'
                        ) : (
                            <>🗳️ โหวตให้</>
                        )}
                    </button>
                ) : (
                    <div className="w-full py-3 bg-gray-200 text-gray-500 rounded-xl font-bold text-center">
                        ปิดรับโหวตแล้ว
                    </div>
                )}
            </div>

            {/* Ranking Badge */}
            {votePercentage > 0 && totalVotes >= 10 && (
                <div className="absolute bottom-4 right-4">
                    {votePercentage >= 30 && (
                        <div className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-lg text-xs font-bold shadow-lg">
                            🔥 ยอดนิยม
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
