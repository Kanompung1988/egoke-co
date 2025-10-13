export interface AppUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: string; // 'admin', 'staff', or 'none'
    points: number;
}

export interface AuthContextType {
    currentUser: AppUser | null;
    loading: boolean;
}
