// ===================================
// Activity Logger Utility
// ===================================

import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseApp';
import type { ActivityLog } from '../types/voteRights';

interface LogActivityParams {
    userId: string;
    userEmail: string;
    userName: string;
    type: ActivityLog['type'];
    description: string;
    pointsBefore: number;
    pointsAfter: number;
    metadata?: ActivityLog['metadata'];
}

export async function logActivity(params: LogActivityParams): Promise<void> {
    try {
        const activityLog: Omit<ActivityLog, 'id'> = {
            userId: params.userId,
            userEmail: params.userEmail,
            userName: params.userName,
            type: params.type,
            description: params.description,
            pointsBefore: params.pointsBefore,
            pointsAfter: params.pointsAfter,
            pointsChange: params.pointsAfter - params.pointsBefore,
            metadata: params.metadata,
            timestamp: serverTimestamp() as Timestamp,
        };

        await addDoc(collection(db, 'activityLogs'), activityLog);
    } catch (error) {
        console.error('Error logging activity:', error);
        // Don't throw - activity logging should not break the main flow
    }
}

// Helper functions for common log types
export async function logVoteCast(
    userId: string,
    userEmail: string,
    userName: string,
    category: 'band' | 'solo' | 'cover',
    candidateId: string,
    candidateName: string,
    voteType: 'free' | 'purchased',
    points: number
): Promise<void> {
    await logActivity({
        userId,
        userEmail,
        userName,
        type: 'VOTE_CAST',
        description: `โหวต${voteType === 'free' ? 'ครั้งฟรี' : 'ด้วยสิทธิ์ที่ซื้อ'}: ${candidateName} (${category})`,
        pointsBefore: points,
        pointsAfter: points,
        metadata: {
            category,
            candidateId,
            candidateName,
            voteType,
        },
    });
}

export async function logVoteRightsPurchase(
    userId: string,
    userEmail: string,
    userName: string,
    category: 'band' | 'solo' | 'cover',
    rightsAmount: number,
    pointsBefore: number,
    pointsAfter: number
): Promise<void> {
    await logActivity({
        userId,
        userEmail,
        userName,
        type: 'VOTE_RIGHTS_PURCHASE',
        description: `ซื้อสิทธิ์โหวต ${rightsAmount} ครั้ง สำหรับ ${category}`,
        pointsBefore,
        pointsAfter,
        metadata: {
            category,
            rightsAmount,
        },
    });
}

export async function logPointGrant(
    userId: string,
    userEmail: string,
    userName: string,
    pointsBefore: number,
    pointsAfter: number,
    grantedBy: string,
    grantedByEmail: string,
    reason?: string
): Promise<void> {
    await logActivity({
        userId,
        userEmail,
        userName,
        type: 'POINT_GRANT',
        description: `ได้รับแต้ม ${pointsAfter - pointsBefore} แต้ม${reason ? `: ${reason}` : ''}`,
        pointsBefore,
        pointsAfter,
        metadata: {
            grantedBy,
            grantedByEmail,
            reason,
        },
    });
}

export async function logPointDeduct(
    userId: string,
    userEmail: string,
    userName: string,
    pointsBefore: number,
    pointsAfter: number,
    reason?: string
): Promise<void> {
    await logActivity({
        userId,
        userEmail,
        userName,
        type: 'POINT_DEDUCT',
        description: `ถูกหักแต้ม ${pointsBefore - pointsAfter} แต้ม${reason ? `: ${reason}` : ''}`,
        pointsBefore,
        pointsAfter,
        metadata: {
            reason,
        },
    });
}

export async function logPrizeClaim(
    userId: string,
    userEmail: string,
    userName: string,
    prizeId: string,
    prizeName: string,
    pointsBefore: number,
    pointsAfter: number
): Promise<void> {
    await logActivity({
        userId,
        userEmail,
        userName,
        type: 'PRIZE_CLAIM',
        description: `แลกของรางวัล: ${prizeName}`,
        pointsBefore,
        pointsAfter,
        metadata: {
            prizeId,
            prizeName,
        },
    });
}

// Admin/Staff จัดการแต้ม
export async function logAdminAdjustPoints(
    userId: string,
    userEmail: string,
    userName: string,
    pointsBefore: number,
    pointsAfter: number,
    adjustedBy: string,
    adjustedByEmail: string,
    reason?: string
): Promise<void> {
    const change = pointsAfter - pointsBefore;
    const action = change > 0 ? 'เพิ่ม' : 'ลด';
    
    await logActivity({
        userId,
        userEmail,
        userName,
        type: change > 0 ? 'POINT_GRANT' : 'POINT_DEDUCT',
        description: `Admin ${action}แต้ม ${Math.abs(change)} แต้ม${reason ? `: ${reason}` : ''}`,
        pointsBefore,
        pointsAfter,
        metadata: {
            adjustedBy,
            adjustedByEmail,
            reason,
            isAdminAction: true,
        },
    });
}

// Game wheel spin
export async function logWheelSpin(
    userId: string,
    userEmail: string,
    userName: string,
    prizeName: string,
    prizeEmoji: string,
    pointsBefore: number,
    pointsAfter: number,
    spinCost: number
): Promise<void> {
    await logActivity({
        userId,
        userEmail,
        userName,
        type: 'GAME_SPIN',
        description: `หมุนวงล้อ (ใช้ ${spinCost} แต้ม) ได้: ${prizeEmoji} ${prizeName}`,
        pointsBefore,
        pointsAfter,
        metadata: {
            prizeName,
            prizeEmoji,
            spinCost,
        },
    });
}

