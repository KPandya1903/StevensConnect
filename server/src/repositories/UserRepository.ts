/**
 * UserRepository
 *
 * All SQL that touches the users, email_verifications, and refresh_tokens
 * tables lives here. No business logic — just parameterized queries.
 *
 * Naming convention: methods return the row shape directly (snake_case from DB),
 * mapping to camelCase happens in the service layer.
 */

import { pool } from '../db/pool';

// ---- Row types (match DB column names exactly) ----

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  grad_year: number | null;
  major: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface EmailVerificationRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used_at: Date | null;
}

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
}

// ---- Input types ----

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
  username: string;
}

export interface UpdateUserInput {
  displayName?: string;
  bio?: string | null;
  gradYear?: number | null;
  major?: string | null;
  avatarUrl?: string | null;
}

// ---- Repository ----

export const UserRepository = {
  async create(input: CreateUserInput): Promise<UserRow> {
    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, display_name, username)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.email, input.passwordHash, input.displayName, input.username],
    );
    return rows[0];
  },

  async findByEmail(email: string): Promise<UserRow | null> {
    const { rows } = await pool.query<UserRow>(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<UserRow | null> {
    const { rows } = await pool.query<UserRow>(
      'SELECT * FROM users WHERE id = $1',
      [id],
    );
    return rows[0] ?? null;
  },

  async findByUsername(username: string): Promise<UserRow | null> {
    const { rows } = await pool.query<UserRow>(
      'SELECT * FROM users WHERE username = $1',
      [username],
    );
    return rows[0] ?? null;
  },

  async setVerified(userId: string): Promise<void> {
    await pool.query(
      'UPDATE users SET is_verified = TRUE WHERE id = $1',
      [userId],
    );
  },

  async setActive(userId: string, isActive: boolean): Promise<void> {
    await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2',
      [isActive, userId],
    );
  },

  async update(userId: string, input: UpdateUserInput): Promise<UserRow> {
    // Build SET clause dynamically from non-undefined fields only.
    // This avoids overwriting fields with undefined values.
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.displayName !== undefined) {
      fields.push(`display_name = $${idx++}`);
      values.push(input.displayName);
    }
    if (input.bio !== undefined) {
      fields.push(`bio = $${idx++}`);
      values.push(input.bio);
    }
    if (input.gradYear !== undefined) {
      fields.push(`grad_year = $${idx++}`);
      values.push(input.gradYear);
    }
    if (input.major !== undefined) {
      fields.push(`major = $${idx++}`);
      values.push(input.major);
    }
    if (input.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(input.avatarUrl);
    }

    if (fields.length === 0) {
      const user = await UserRepository.findById(userId);
      if (!user) throw new Error(`User ${userId} not found`);
      return user;
    }

    values.push(userId);
    const { rows } = await pool.query<UserRow>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return rows[0];
  },

  // ---- Email verifications ----

  async createEmailVerification(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO email_verifications (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt],
    );
  },

  async findEmailVerification(token: string): Promise<EmailVerificationRow | null> {
    const { rows } = await pool.query<EmailVerificationRow>(
      `SELECT * FROM email_verifications
       WHERE token = $1
         AND expires_at > NOW()
         AND used_at IS NULL`,
      [token],
    );
    return rows[0] ?? null;
  },

  async markEmailVerificationUsed(token: string): Promise<void> {
    await pool.query(
      'UPDATE email_verifications SET used_at = NOW() WHERE token = $1',
      [token],
    );
  },

  // Invalidate all unused tokens for a user (e.g. before issuing a new one)
  async invalidatePendingVerifications(userId: string): Promise<void> {
    await pool.query(
      `UPDATE email_verifications
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId],
    );
  },

  // ---- Refresh tokens ----

  async createRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt],
    );
  },

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRow | null> {
    const { rows } = await pool.query<RefreshTokenRow>(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1
         AND expires_at > NOW()
         AND revoked_at IS NULL`,
      [tokenHash],
    );
    return rows[0] ?? null;
  },

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
      [tokenHash],
    );
  },

  // Revoke all refresh tokens for a user (logout from all devices)
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await pool.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  },
};
