export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isDeleted: boolean;
  createdAt: string;       // ISO 8601
  deliveredAt: string | null; // set when recipient joins the conversation room
  readAt: string | null;      // set when recipient emits messages:read
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

// ---- Socket event payload types ----

export interface SendMessagePayload {
  conversationId: string;
  content: string;
}

export interface MessagesReadPayload {
  conversationId: string;
}

export interface TypingPayload {
  conversationId: string;
}

// Server → Client events
export interface MessageDeliveredEvent {
  messageId: string;
  conversationId: string;
  deliveredAt: string;
}

export interface MessageReadEvent {
  conversationId: string;
  readerId: string;
  readAt: string;
  messageIds: string[];
}

export interface UnreadUpdateEvent {
  conversationId: string;
  count: number;
}

export interface UnreadClearedEvent {
  conversationId: string;
}

// Tick status helper
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export function getMessageStatus(msg: Message): MessageStatus {
  if (msg.readAt) return 'read';
  if (msg.deliveredAt) return 'delivered';
  if (msg.id) return 'sent';
  return 'sending';
}
