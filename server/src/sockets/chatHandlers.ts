/**
 * Socket.io chat event handlers — v2
 *
 * Client → Server:
 *   join_conversation   { conversationId }          join room; marks messages delivered
 *   leave_conversation  { conversationId }          leave room
 *   send_message        { conversationId, content } send a message
 *   messages:read       { conversationId }          user is viewing — mark all as read
 *   typing              { conversationId }          broadcast typing indicator
 *   stop_typing         { conversationId }          broadcast stop-typing
 *
 * Server → Client:
 *   message:new         Message                     → conv room (others only, via socket.to)
 *   message:ack         Message                     → sender only (via socket.emit)
 *   message:delivered   { messageId, conversationId, deliveredAt }  → sender's user room
 *   message:read        { conversationId, readerId, readAt, messageIds } → original sender's user room
 *   unread:update       { conversationId, count }   → recipient's user room (never sender)
 *   unread:cleared      { conversationId }          → reader's own user room (all tabs)
 *   user_typing         { conversationId, userId, username } → conv room (others only)
 *   user_stop_typing    { conversationId, userId }  → conv room (others only)
 *   error               { message }                 → sender only
 */

import type { Server, Socket } from 'socket.io';
import { ConversationService } from '../services/ConversationService';
import { ConversationRepository } from '../repositories/ConversationRepository';

interface SocketUser {
  id: string;
  username: string;
  isVerified: boolean;
}

export function registerChatHandlers(io: Server, socket: Socket): void {
  const user = socket.data.user as SocketUser;

  // ---- join_conversation ----
  socket.on('join_conversation', async ({ conversationId }: { conversationId: string }) => {
    try {
      const ok = await ConversationRepository.isParticipant(conversationId, user.id);
      if (!ok) {
        socket.emit('error', { message: 'Not a participant in this conversation' });
        return;
      }
      await socket.join(`conv:${conversationId}`);

      // Mark all undelivered messages from others as delivered
      const delivered = await ConversationService.markDelivered(conversationId, user.id);
      // Notify each original sender that their message was delivered
      for (const d of delivered) {
        io.to(`user:${d.senderId}`).emit('message:delivered', {
          messageId: d.messageId,
          conversationId,
          deliveredAt: d.deliveredAt,
        });
      }
    } catch {
      socket.emit('error', { message: 'Could not join conversation' });
    }
  });

  // ---- leave_conversation ----
  socket.on('leave_conversation', ({ conversationId }: { conversationId: string }) => {
    void socket.leave(`conv:${conversationId}`);
  });

  // ---- send_message ----
  socket.on('send_message', async ({ conversationId, content }: { conversationId: string; content: string }) => {
    try {
      const message = await ConversationService.sendMessage(conversationId, user.id, content);

      // ACK to sender only — confirms the message was saved with its DB id
      socket.emit('message:ack', message);

      // Broadcast to everyone in the room EXCEPT the sender
      socket.to(`conv:${conversationId}`).emit('message:new', message);

      // Push unread:update to each recipient's personal room
      // (never to the sender — they sent it, they don't have an unread for it)
      const participants = await ConversationRepository.getParticipants(conversationId);
      for (const p of participants) {
        if (p.userId === user.id) continue; // skip sender

        // Compute fresh unread count for this recipient from DB
        const convs = await ConversationRepository.findByUser(p.userId);
        const conv = convs.find((c) => c.id === conversationId);
        const count = conv ? parseInt(conv.unread_count, 10) : 1;

        io.to(`user:${p.userId}`).emit('unread:update', { conversationId, count });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      socket.emit('error', { message: msg });
    }
  });

  // ---- messages:read ----
  socket.on('messages:read', async ({ conversationId }: { conversationId: string }) => {
    try {
      const { messageIds, readAt } = await ConversationService.markRead(conversationId, user.id);
      if (messageIds.length === 0) return;

      // Tell the sender(s) of those messages that their messages were read.
      // We need to know who sent each message — fetch minimal data.
      const allMessages = await ConversationRepository.findMessages(conversationId, 100);
      const senderIds = new Set(
        allMessages
          .filter((m) => messageIds.includes(m.id))
          .map((m) => m.sender_id),
      );
      for (const senderId of senderIds) {
        if (senderId === user.id) continue;
        io.to(`user:${senderId}`).emit('message:read', {
          conversationId,
          readerId: user.id,
          readAt,
          messageIds,
        });
      }

      // Tell ALL of the reader's own tabs/devices that unread is cleared for this conversation
      io.to(`user:${user.id}`).emit('unread:cleared', { conversationId });
    } catch {
      // Non-critical — silently ignore
    }
  });

  // ---- typing ----
  socket.on('typing', ({ conversationId }: { conversationId: string }) => {
    socket.to(`conv:${conversationId}`).emit('user_typing', {
      conversationId,
      userId: user.id,
      username: user.username,
    });
  });

  // ---- stop_typing ----
  socket.on('stop_typing', ({ conversationId }: { conversationId: string }) => {
    socket.to(`conv:${conversationId}`).emit('user_stop_typing', {
      conversationId,
      userId: user.id,
    });
  });
}
