// ===================================
// Vote Rights Types
// ===================================

import { Timestamp } from 'firebase/firestore';

export interface VoteRights {
    band: number;
    solo: number;
    cover: number;
}

export interface UserVoteRights {
    userId: string;
    voteRights: VoteRights;
    totalFreeVotesUsed: number;
    totalPurchasedVotes: number;
    updatedAt: Timestamp;
}

export interface VoteRightsPurchase {
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    category: 'band' | 'solo' | 'cover';
    rightsAmount: number;
    pointsSpent: number;
    pointsBefore: number;
    pointsAfter: number;
    purchasedAt: Timestamp;
}

export interface ActivityLog {
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    type: 'POINT_GRANT' | 'POINT_DEDUCT' | 'VOTE_CAST' | 'VOTE_RIGHTS_PURCHASE' | 'PRIZE_CLAIM';
    description: string;
    pointsBefore: number;
    pointsAfter: number;
    pointsChange: number;
    metadata?: {
        category?: string;
        candidateId?: string;
        candidateName?: string;
        voteType?: 'free' | 'purchased';
        rightsAmount?: number;
        grantedBy?: string;
        grantedByEmail?: string;
        reason?: string;
        prizeId?: string;
        prizeName?: string;
    };
    timestamp: Timestamp;
    ipAddress?: string;
    userAgent?: string;
}

export interface UserVoteRecord {
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    category: 'band' | 'solo' | 'cover';
    candidateId: string;
    candidateName: string;
    voteType: 'free' | 'purchased';
    votedAt: Timestamp;
}
