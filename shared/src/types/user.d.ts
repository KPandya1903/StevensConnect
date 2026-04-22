export interface User {
    id: string;
    email: string | null;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    gradYear: number | null;
    major: string | null;
    university: string | null;
    profileComplete: boolean;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
}
export type PublicUser = Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'bio' | 'gradYear' | 'major' | 'university' | 'createdAt'>;
export type AuthUser = Pick<User, 'id' | 'email' | 'username' | 'displayName' | 'avatarUrl' | 'isVerified' | 'profileComplete'>;
