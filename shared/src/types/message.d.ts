export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    isDeleted: boolean;
    createdAt: string;
}
export interface Conversation {
    id: string;
    listingId: string | null;
    lastMessageAt: string;
    createdAt: string;
    participants: import('./user').PublicUser[];
    lastMessage: Message | null;
    unreadCount: number;
}
export interface MessagesPage {
    messages: Message[];
    hasMore: boolean;
    nextCursor: string | null;
}
export interface SendMessagePayload {
    conversationId: string;
    content: string;
}
export interface MarkReadPayload {
    conversationId: string;
}
export interface TypingPayload {
    conversationId: string;
}
