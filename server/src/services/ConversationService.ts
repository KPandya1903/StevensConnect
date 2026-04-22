/**
 * ConversationService
 *
 * Business rules for chat:
 *   - Users can only read/write to conversations they participate in
 *   - Can't message yourself
 *   - Message content is trimmed and must be non-empty
 *   - find-or-create pattern so opening a chat from a listing is idempotent
 */

import { ConversationRepository } from '../repositories/ConversationRepository';
import { UserRepository } from '../repositories/UserRepository';
import { AppError } from '../middleware/errorHandler';
import type { Conversation, Message, MessagesPage } from '@stevensconnect/shared';

function toMessage(row: import('../repositories/ConversationRepository').MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    isDeleted: row.is_deleted,
    createdAt: row.created_at.toISOString(),
    deliveredAt: row.delivered_at ? row.delivered_at.toISOString() : null,
    readAt: row.read_at ? row.read_at.toISOString() : null,
  };
}

function toConversation(
  row: import('../repositories/ConversationRepository').ConversationRow,
  currentUserId: string,
): Conversation {
  return {
    id: row.id,
    listingId: row.listing_id,
    lastMessageAt: row.last_message_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    participants: [
      {
        id: row.other_user_id,
        username: row.other_username,
        displayName: row.other_display_name,
        avatarUrl: row.other_avatar_url ?? null,
        bio: null,
        gradYear: null,
        major: null,
        university: null,
        createdAt: '',
      },
    ],
    lastMessage: row.last_message_content != null
      ? {
          id: '',
          conversationId: row.id,
          senderId: row.last_message_sender_id!,
          content: row.last_message_is_deleted ? '' : row.last_message_content,
          isDeleted: row.last_message_is_deleted ?? false,
          createdAt: row.last_message_at.toISOString(),
          deliveredAt: null,
          readAt: null,
        }
      : null,
    unreadCount: parseInt(row.unread_count, 10),
  };
}

export const ConversationService = {
  async startConversation(
    requesterId: string,
    targetUserId: string,
    listingId?: string | null,
  ): Promise<{ conversationId: string }> {
    if (requesterId === targetUserId) {
      throw new AppError(422, "You can't message yourself", 'SELF_MESSAGE');
    }

    const target = await UserRepository.findById(targetUserId);
    if (!target || !target.is_active) {
      throw new AppError(404, 'User not found', 'NOT_FOUND');
    }

    const conversationId = await ConversationRepository.findOrCreate(
      requesterId,
      targetUserId,
      listingId,
    );
    return { conversationId };
  },

  async getConversations(userId: string): Promise<Conversation[]> {
    const rows = await ConversationRepository.findByUser(userId);
    return rows.map((r) => toConversation(r, userId));
  },

  async getMessages(
    conversationId: string,
    requesterId: string,
    limit = 30,
    beforeId?: string,
  ): Promise<MessagesPage> {
    const ok = await ConversationRepository.isParticipant(conversationId, requesterId);
    if (!ok) throw new AppError(403, 'You are not part of this conversation', 'FORBIDDEN');

    const rows = await ConversationRepository.findMessages(conversationId, limit + 1, beforeId);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    return {
      messages: page.map(toMessage),
      hasMore,
      nextCursor,
    };
  },

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
  ): Promise<Message> {
    const trimmed = content.trim();
    if (!trimmed) throw new AppError(422, 'Message cannot be empty', 'EMPTY_MESSAGE');
    if (trimmed.length > 2000) throw new AppError(422, 'Message too long (max 2000 chars)', 'MESSAGE_TOO_LONG');

    const ok = await ConversationRepository.isParticipant(conversationId, senderId);
    if (!ok) throw new AppError(403, 'You are not part of this conversation', 'FORBIDDEN');

    const row = await ConversationRepository.createMessage(conversationId, senderId, trimmed);
    return toMessage(row);
  },

  async markRead(
    conversationId: string,
    userId: string,
  ): Promise<{ messageIds: string[]; readAt: string }> {
    const ok = await ConversationRepository.isParticipant(conversationId, userId);
    if (!ok) throw new AppError(403, 'You are not part of this conversation', 'FORBIDDEN');
    const result = await ConversationRepository.markRead(conversationId, userId);
    return { messageIds: result.messageIds, readAt: result.readAt.toISOString() };
  },

  async markDelivered(
    conversationId: string,
    recipientId: string,
  ): Promise<Array<{ messageId: string; senderId: string; deliveredAt: string }>> {
    const ok = await ConversationRepository.isParticipant(conversationId, recipientId);
    if (!ok) throw new AppError(403, 'You are not part of this conversation', 'FORBIDDEN');
    const rows = await ConversationRepository.markDelivered(conversationId, recipientId);
    return rows.map((r) => ({
      messageId: r.messageId,
      senderId: r.senderId,
      deliveredAt: r.deliveredAt.toISOString(),
    }));
  },
};
