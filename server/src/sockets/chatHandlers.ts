/**
 * Socket.io chat event handlers.
 *
 * Events (client → server):
 *   join_conversation   { conversationId }  — join room to receive messages
 *   leave_conversation  { conversationId }  — leave room
 *   send_message        { conversationId, content } — send a message
 *   typing              { conversationId }  — broadcast typing indicator
 *   stop_typing         { conversationId }  — broadcast stop-typing
 *   mark_read           { conversationId }  — update last_read_at
 *
 * Events (server → client):
 *   new_message         Message             — broadcast to conversation room
 *   user_typing         { conversationId, userId, username }
 *   user_stop_typing    { conversationId, userId }
 *   error               { message }         — sent only to the emitting socket
 */

import type { Server, Socket } from 'socket.io';
import { ConversationService } from '../services/ConversationService';

interface SocketUser {
  id: string;
  username: string;
  isVerified: boolean;
}

export function registerChatHandlers(io: Server, socket: Socket): void {
  const user = socket.data.user as SocketUser;

  socket.on('join_conversation', async ({ conversationId }: { conversationId: string }) => {
    try {
      // Guard: only participants may join the room
      const { ConversationRepository } = await import('../repositories/ConversationRepository');
      const ok = await ConversationRepository.isParticipant(conversationId, user.id);
      if (!ok) {
        socket.emit('error', { message: 'Not a participant in this conversation' });
        return;
      }
      await socket.join(`conv:${conversationId}`);
    } catch {
      socket.emit('error', { message: 'Could not join conversation' });
    }
  });

  socket.on('leave_conversation', ({ conversationId }: { conversationId: string }) => {
    void socket.leave(`conv:${conversationId}`);
  });

  socket.on('send_message', async ({ conversationId, content }: { conversationId: string; content: string }) => {
    try {
      const message = await ConversationService.sendMessage(conversationId, user.id, content);

      // Broadcast to everyone in the room (including sender for confirmation)
      io.to(`conv:${conversationId}`).emit('new_message', message);

      // Also push to each participant's personal room so their inbox updates
      // even if they haven't opened the conversation yet.
      const { ConversationRepository } = await import('../repositories/ConversationRepository');
      const participants = await ConversationRepository.findByUser(user.id);
      const conv = participants.find((c) => c.id === conversationId);
      if (conv) {
        io.to(`user:${conv.other_user_id}`).emit('new_message', message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      socket.emit('error', { message: msg });
    }
  });

  socket.on('typing', ({ conversationId }: { conversationId: string }) => {
    socket.to(`conv:${conversationId}`).emit('user_typing', {
      conversationId,
      userId: user.id,
      username: user.username,
    });
  });

  socket.on('stop_typing', ({ conversationId }: { conversationId: string }) => {
    socket.to(`conv:${conversationId}`).emit('user_stop_typing', {
      conversationId,
      userId: user.id,
    });
  });

  socket.on('mark_read', async ({ conversationId }: { conversationId: string }) => {
    try {
      await ConversationService.markRead(conversationId, user.id);
    } catch {
      // Silently ignore — not critical
    }
  });
}
