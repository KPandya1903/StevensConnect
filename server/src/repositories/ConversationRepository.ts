/**
 * ConversationRepository
 *
 * All SQL for conversations, conversation_participants, and messages.
 * Cursor-based pagination for messages (newest-first, infinite scroll upward).
 */

import { pool } from '../db/pool';

// ---- Row types ----

export interface ConversationRow {
  id: string;
  listing_id: string | null;
  last_message_at: Date;
  created_at: Date;
  // Joined fields
  other_user_id: string;
  other_username: string;
  other_display_name: string;
  other_avatar_url: string | null;
  last_message_content: string | null;
  last_message_sender_id: string | null;
  last_message_is_deleted: boolean | null;
  unread_count: string; // pg COUNT returns string
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_deleted: boolean;
  created_at: Date;
  delivered_at: Date | null;
  read_at: Date | null;
}

// ---- Repository ----

export const ConversationRepository = {
  /**
   * Find or create a 1-on-1 conversation between two users.
   * If a conversation already exists (optionally about the same listing), returns it.
   * Otherwise creates conversation + both participant rows atomically.
   */
  async findOrCreate(userAId: string, userBId: string, listingId?: string | null): Promise<string> {
    // Check for existing conversation between these two users
    const existing = await pool.query<{ id: string }>(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_id = $1
       JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id = $2
       LIMIT 1`,
      [userAId, userBId],
    );

    if (existing.rows.length > 0) return existing.rows[0].id;

    // Create new conversation + participants in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO conversations (listing_id) VALUES ($1) RETURNING id`,
        [listingId ?? null],
      );
      const conversationId = rows[0].id;
      await client.query(
        `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
        [conversationId, userAId, userBId],
      );
      await client.query('COMMIT');
      return conversationId;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * List all conversations for a user, ordered by most recent message.
   * Includes the other participant's profile, last message preview, and unread count.
   */
  async findByUser(userId: string): Promise<ConversationRow[]> {
    const { rows } = await pool.query<ConversationRow>(
      `SELECT
         c.id,
         c.listing_id,
         c.last_message_at,
         c.created_at,
         u.id           AS other_user_id,
         u.username     AS other_username,
         u.display_name AS other_display_name,
         u.avatar_url   AS other_avatar_url,
         lm.content     AS last_message_content,
         lm.sender_id   AS last_message_sender_id,
         lm.is_deleted  AS last_message_is_deleted,
         (
           SELECT COUNT(*)
           FROM messages m2
           WHERE m2.conversation_id = c.id
             AND m2.sender_id != $1
             AND m2.created_at > COALESCE(me.last_read_at, '-infinity'::timestamptz)
             AND m2.is_deleted = FALSE
         ) AS unread_count
       FROM conversations c
       JOIN conversation_participants me  ON me.conversation_id  = c.id AND me.user_id  = $1
       JOIN conversation_participants opp ON opp.conversation_id = c.id AND opp.user_id != $1
       JOIN users u ON u.id = opp.user_id
       LEFT JOIN LATERAL (
         SELECT content, sender_id, is_deleted
         FROM messages
         WHERE conversation_id = c.id
         ORDER BY created_at DESC
         LIMIT 1
       ) lm ON TRUE
       ORDER BY c.last_message_at DESC`,
      [userId],
    );
    return rows;
  },

  /**
   * Verify a user is a participant in a conversation.
   */
  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const { rows } = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM conversation_participants
         WHERE conversation_id = $1 AND user_id = $2
       ) AS exists`,
      [conversationId, userId],
    );
    return rows[0].exists;
  },

  /**
   * Cursor-based message fetch. Returns up to `limit` messages older than `beforeId`.
   * Messages returned newest-first so the client can prepend while scrolling up.
   */
  async findMessages(
    conversationId: string,
    limit = 30,
    beforeId?: string,
  ): Promise<MessageRow[]> {
    if (beforeId) {
      const { rows } = await pool.query<MessageRow>(
        `SELECT id, conversation_id, sender_id, content, is_deleted, created_at, delivered_at, read_at FROM messages
         WHERE conversation_id = $1
           AND created_at < (SELECT created_at FROM messages WHERE id = $2)
         ORDER BY created_at DESC
         LIMIT $3`,
        [conversationId, beforeId, limit],
      );
      return rows;
    }

    const { rows } = await pool.query<MessageRow>(
      `SELECT id, conversation_id, sender_id, content, is_deleted, created_at, delivered_at, read_at FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [conversationId, limit],
    );
    return rows;
  },

  async createMessage(conversationId: string, senderId: string, content: string): Promise<MessageRow> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<MessageRow>(
        `INSERT INTO messages (conversation_id, sender_id, content)
         VALUES ($1, $2, $3) RETURNING *`,
        [conversationId, senderId, content],
      );
      // Update last_message_at on the conversation
      await client.query(
        `UPDATE conversations SET last_message_at = NOW() WHERE id = $1`,
        [conversationId],
      );
      await client.query('COMMIT');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getParticipants(conversationId: string): Promise<{ userId: string }[]> {
    const { rows } = await pool.query<{ user_id: string }>(
      `SELECT user_id FROM conversation_participants WHERE conversation_id = $1`,
      [conversationId],
    );
    return rows.map((r) => ({ userId: r.user_id }));
  },

  async markDelivered(
    conversationId: string,
    recipientId: string,
  ): Promise<Array<{ messageId: string; senderId: string; deliveredAt: Date }>> {
    const { rows } = await pool.query<{ id: string; sender_id: string; delivered_at: Date }>(
      `UPDATE messages
       SET delivered_at = NOW()
       WHERE conversation_id = $1
         AND sender_id != $2
         AND delivered_at IS NULL
         AND is_deleted = FALSE
       RETURNING id, sender_id, delivered_at`,
      [conversationId, recipientId],
    );
    return rows.map((r) => ({
      messageId: r.id,
      senderId: r.sender_id,
      deliveredAt: r.delivered_at,
    }));
  },

  async markRead(
    conversationId: string,
    userId: string,
  ): Promise<{ messageIds: string[]; readAt: Date }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<{ id: string }>(
        `UPDATE messages
         SET read_at = NOW()
         WHERE conversation_id = $1
           AND sender_id != $2
           AND read_at IS NULL
           AND is_deleted = FALSE
         RETURNING id`,
        [conversationId, userId],
      );
      await client.query(
        `UPDATE conversation_participants
         SET last_read_at = NOW()
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId],
      );
      await client.query('COMMIT');
      const readAt = new Date();
      return { messageIds: rows.map((r) => r.id), readAt };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async findById(conversationId: string): Promise<{ id: string; listing_id: string | null } | null> {
    const { rows } = await pool.query<{ id: string; listing_id: string | null }>(
      `SELECT id, listing_id FROM conversations WHERE id = $1`,
      [conversationId],
    );
    return rows[0] ?? null;
  },
};
