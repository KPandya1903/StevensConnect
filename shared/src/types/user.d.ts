export interface User {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string | null;
    gradYear: number | null;
    major: string | null;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
}
export type PublicUser = Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'bio' | 'gradYear' | 'major' | 'createdAt'>;
export type AuthUser = Pick<User, 'id' | 'email' | 'username' | 'displayName' | 'avatarUrl' | 'isVerified'>;
