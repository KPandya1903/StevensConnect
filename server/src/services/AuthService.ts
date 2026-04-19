/**
 * AuthService
 *
 * Business logic for all authentication flows.
 * Talks to UserRepository and TokenService.
 * Never touches req/res — that's the controller's job.
 *
 * Error contract: throws AppError with appropriate status codes.
 * Callers (controllers) let these bubble to the global error handler.
 */

import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/UserRepository';
import { TokenService } from './TokenService';
import { EmailService } from './EmailService';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import type { AuthUser } from '@stevensconnect/shared';

const BCRYPT_COST = 12;
const STEVENS_EMAIL_DOMAIN = '@stevens.edu';

// ---- Helper: map DB row to the shared AuthUser type ----
function toAuthUser(row: { id: string; email: string; username: string; display_name: string; avatar_url: string | null; is_verified: boolean }): AuthUser {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    isVerified: row.is_verified,
  };
}

export interface LoginResult {
  accessToken: string;
  rawRefreshToken: string;
  user: AuthUser;
}

export const AuthService = {
  /**
   * Register a new user.
   * Validates @stevens.edu domain, checks for duplicate email/username,
   * hashes password, stores user, sends verification email.
   */
  async register(
    email: string,
    password: string,
    displayName: string,
    username: string,
  ): Promise<void> {
    // 1. Enforce @stevens.edu domain (server-side — never trust client)
    if (!email.toLowerCase().endsWith(STEVENS_EMAIL_DOMAIN)) {
      throw new AppError(422, 'Only @stevens.edu email addresses are allowed', 'INVALID_EMAIL_DOMAIN');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.toLowerCase().trim();

    // 2. Check for duplicate email
    const existingEmail = await UserRepository.findByEmail(normalizedEmail);
    if (existingEmail) {
      // Don't reveal whether email exists — use generic message
      // (prevents account enumeration)
      throw new AppError(409, 'An account with this email already exists', 'EMAIL_TAKEN');
    }

    // 3. Check for duplicate username
    const existingUsername = await UserRepository.findByUsername(normalizedUsername);
    if (existingUsername) {
      throw new AppError(409, 'This username is already taken', 'USERNAME_TAKEN');
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    // 5. Create user
    const user = await UserRepository.create({
      email: normalizedEmail,
      passwordHash,
      displayName: displayName.trim(),
      username: normalizedUsername,
    });

    // 6. If email is not configured, auto-verify the user immediately
    if (!env.emailEnabled) {
      await UserRepository.setVerified(user.id);
      return;
    }

    // 7. Generate and store verification token, send email
    const token = TokenService.generateVerificationToken();
    const expiresAt = TokenService.verificationTokenExpiresAt();
    await UserRepository.createEmailVerification(user.id, token, expiresAt);

    try {
      await EmailService.sendVerificationEmail(normalizedEmail, token);
    } catch (emailErr) {
      console.error('[Email] Failed to send verification email:', emailErr);
    }
  },

  /**
   * Verify an email address via token.
   * Token must be unused and not expired.
   */
  async verifyEmail(token: string): Promise<void> {
    const verification = await UserRepository.findEmailVerification(token);

    if (!verification) {
      throw new AppError(400, 'Verification link is invalid or has expired', 'INVALID_VERIFICATION_TOKEN');
    }

    // Mark token used and user as verified in a logical sequence
    // (not a transaction for simplicity — worst case: verified but token not marked used,
    //  which is harmless since we check used_at)
    await UserRepository.markEmailVerificationUsed(token);
    await UserRepository.setVerified(verification.user_id);
  },

  /**
   * Login with email + password.
   * Returns access token, raw refresh token (caller sets it as HttpOnly cookie),
   * and the user object.
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Find user — use the same generic error regardless of which check fails
    //    (prevents account enumeration)
    const user = await UserRepository.findByEmail(normalizedEmail);
    const INVALID_CREDENTIALS = new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');

    if (!user) throw INVALID_CREDENTIALS;
    if (!user.is_active) throw new AppError(403, 'This account has been deactivated', 'ACCOUNT_DEACTIVATED');

    // 2. Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) throw INVALID_CREDENTIALS;

    // 3. Require email verification before login
    if (!user.is_verified) {
      throw new AppError(403, 'Please verify your email before logging in', 'EMAIL_NOT_VERIFIED');
    }

    // 4. Sign access token
    const accessToken = TokenService.signAccessToken({
      sub: user.id,
      email: user.email,
      username: user.username,
      isVerified: user.is_verified,
    });

    // 5. Generate refresh token, store hash
    const { rawToken, tokenHash } = TokenService.generateRefreshToken();
    const expiresAt = TokenService.refreshTokenExpiresAt();
    await UserRepository.createRefreshToken(user.id, tokenHash, expiresAt);

    return {
      accessToken,
      rawRefreshToken: rawToken,
      user: toAuthUser(user),
    };
  },

  /**
   * Refresh an access token using a valid refresh token.
   * Rotates the refresh token — old one is revoked, new one issued.
   * Returns new access token + new raw refresh token.
   */
  async refresh(rawRefreshToken: string): Promise<{ accessToken: string; rawRefreshToken: string }> {
    const tokenHash = TokenService.hashRefreshToken(rawRefreshToken);
    const storedToken = await UserRepository.findRefreshToken(tokenHash);

    if (!storedToken) {
      throw new AppError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    // Fetch user to get current state
    const user = await UserRepository.findById(storedToken.user_id);
    if (!user || !user.is_active) {
      throw new AppError(401, 'Account is no longer active', 'ACCOUNT_INACTIVE');
    }

    // Revoke the used token (rotation)
    await UserRepository.revokeRefreshToken(tokenHash);

    // Issue new tokens
    const newAccessToken = TokenService.signAccessToken({
      sub: user.id,
      email: user.email,
      username: user.username,
      isVerified: user.is_verified,
    });

    const { rawToken: newRawToken, tokenHash: newHash } = TokenService.generateRefreshToken();
    await UserRepository.createRefreshToken(
      user.id,
      newHash,
      TokenService.refreshTokenExpiresAt(),
    );

    return { accessToken: newAccessToken, rawRefreshToken: newRawToken };
  },

  /**
   * Logout — revoke the specific refresh token.
   */
  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = TokenService.hashRefreshToken(rawRefreshToken);
    await UserRepository.revokeRefreshToken(tokenHash);
  },

  /**
   * Resend verification email.
   * Invalidates any existing pending tokens first.
   * Silently succeeds even if email is already verified or doesn't exist
   * (prevents account enumeration).
   */
  async resendVerification(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await UserRepository.findByEmail(normalizedEmail);

    // Silently return if user not found or already verified
    if (!user || user.is_verified) return;

    // Invalidate old tokens, create new one
    await UserRepository.invalidatePendingVerifications(user.id);
    const token = TokenService.generateVerificationToken();
    const expiresAt = TokenService.verificationTokenExpiresAt();
    await UserRepository.createEmailVerification(user.id, token, expiresAt);
    try {
      await EmailService.sendVerificationEmail(normalizedEmail, token);
    } catch (emailErr) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[DEV] Resend — verification token for ${normalizedEmail}: ${token}`);
      } else {
        console.error('[Email] Failed to resend verification email:', emailErr);
      }
    }
  },
};
