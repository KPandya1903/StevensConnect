-- Migration 006: Add delivery and read receipt timestamps to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Indexes for efficient markDelivered and markRead queries
CREATE INDEX IF NOT EXISTS idx_messages_delivered
  ON messages (conversation_id, delivered_at)
  WHERE delivered_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_read
  ON messages (conversation_id, read_at)
  WHERE read_at IS NULL;
