// Constants for the EGOKE application

export const CATEGORIES = [
    { id: 'band', name: 'Band', emoji: '�', description: 'วงดนตรี' },
    { id: 'solo', name: 'Solo', emoji: '�', description: 'นักร้องเดี่ยว' },
    { id: 'cover', name: 'Cover', emoji: '�', description: 'Cover Dance' },
] as const;

export const DEFAULT_SPIN_COST = 20;

export const ROLE_HIERARCHY = {
    superadmin: 4,
    admin: 3,
    staff: 2,
    user: 1,
} as const;

export type UserRole = keyof typeof ROLE_HIERARCHY;

export const ROLE_LABELS = {
    superadmin: 'Super Admin',
    admin: 'Admin',
    staff: 'Staff',
    user: 'User',
} as const;

export const ROLE_EMOJIS = {
    superadmin: '👑',
    admin: '🛡️',
    staff: '🔧',
    user: '👤',
} as const;
