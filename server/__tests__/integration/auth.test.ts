/**
 * Auth integration tests
 *
 * Tests the full HTTP request → controller → service → repository → DB cycle.
 * No mocking. If the SQL is wrong, the test fails.
 *
 * Coverage:
 *   - Register: success, duplicate email, duplicate username, non-stevens email,
 *               weak password, invalid username format
 *   - Verify email: success, invalid token, expired token, already-used token
 *   - Login: success, wrong password, unverified user, inactive user, unknown email
 *   - Refresh: success, rotation (old token revoked), invalid token, missing cookie
 *   - Logout: success, missing token (graceful)
 *   - Resend verification: success (always 200 regardless of email existence)
 */

import request from 'supertest';
import { app } from '../../src/index';
import { pool } from '../../src/db/pool';
import { UserRepository } from '../../src/repositories/UserRepository';
import { TokenService } from '../../src/services/TokenService';

// ---- Test helpers ----

async function registerUser(overrides: Partial<{
  email: string;
  password: string;
  displayName: string;
  username: string;
}> = {}) {
  const body = {
    email: 'testuser@stevens.edu',
    password: 'Password123!',
    displayName: 'Test User',
    username: 'testuser',
    ...overrides,
  };
  return request(app).post('/api/auth/register').send(body);
}

async function getVerificationToken(email: string): Promise<string> {
  const { rows } = await pool.query<{ token: string }>(
    `SELECT ev.token FROM email_verifications ev
     JOIN users u ON u.id = ev.user_id
     WHERE u.email = $1 AND ev.used_at IS NULL
     ORDER BY ev.created_at DESC LIMIT 1`,
    [email],
  );
  if (!rows[0]) throw new Error(`No verification token found for ${email}`);
  return rows[0].token;
}

async function registerAndVerify(
  email = 'verified@stevens.edu',
  username = 'verifieduser',
) {
  await registerUser({ email, username });
  const token = await getVerificationToken(email);
  await request(app).post('/api/auth/verify-email').send({ token });
}

async function loginUser(email = 'verified@stevens.edu', password = 'Password123!') {
  return request(app).post('/api/auth/login').send({ email, password });
}

// ---- Tests ----

describe('POST /api/auth/register', () => {
  it('creates a user with valid @stevens.edu email', async () => {
    const res = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.data.message).toMatch(/verify/i);

    // User exists in DB, is not verified
    const user = await UserRepository.findByEmail('testuser@stevens.edu');
    expect(user).not.toBeNull();
    expect(user!.is_verified).toBe(false);
  });

  it('stores a hashed password, not plaintext', async () => {
    await registerUser();
    const user = await UserRepository.findByEmail('testuser@stevens.edu');
    expect(user!.password_hash).not.toBe('Password123!');
    expect(user!.password_hash).toMatch(/^\$2[ab]\$/); // bcrypt prefix
  });

  it('creates an email verification token', async () => {
    await registerUser();
    const token = await getVerificationToken('testuser@stevens.edu');
    expect(token).toBeTruthy();
    expect(token.length).toBe(64); // 32 bytes hex = 64 chars
  });

  it('rejects non-@stevens.edu email', async () => {
    const res = await registerUser({ email: 'test@gmail.com' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_EMAIL_DOMAIN');
  });

  it('rejects duplicate email (case-insensitive)', async () => {
    await registerUser({ email: 'duplicate@stevens.edu', username: 'first' });
    const res = await registerUser({ email: 'DUPLICATE@stevens.edu', username: 'second' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects duplicate username (case-insensitive)', async () => {
    await registerUser({ email: 'user1@stevens.edu', username: 'sameuser' });
    const res = await registerUser({ email: 'user2@stevens.edu', username: 'SAMEUSER' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_TAKEN');
  });

  it('rejects password shorter than 8 characters', async () => {
    const res = await registerUser({ password: 'short' });
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toHaveProperty('password');
  });

  it('rejects username with invalid characters', async () => {
    const res = await registerUser({ username: 'bad user!' });
    expect(res.status).toBe(422);
    expect(res.body.error.fields).toHaveProperty('username');
  });

  it('returns 422 when required fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/verify-email', () => {
  it('verifies user with valid token', async () => {
    await registerUser();
    const token = await getVerificationToken('testuser@stevens.edu');
    const res = await request(app).post('/api/auth/verify-email').send({ token });

    expect(res.status).toBe(200);
    const user = await UserRepository.findByEmail('testuser@stevens.edu');
    expect(user!.is_verified).toBe(true);
  });

  it('marks the token as used after verification', async () => {
    await registerUser();
    const token = await getVerificationToken('testuser@stevens.edu');
    await request(app).post('/api/auth/verify-email').send({ token });

    // Second use of same token should fail
    const res2 = await request(app).post('/api/auth/verify-email').send({ token });
    expect(res2.status).toBe(400);
    expect(res2.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
  });

  it('rejects an invalid token', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'not_a_real_token' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
  });

  it('rejects an expired token', async () => {
    await registerUser();
    // Manually expire the token in the DB
    await pool.query(
      `UPDATE email_verifications SET expires_at = NOW() - INTERVAL '1 hour'
       WHERE user_id = (SELECT id FROM users WHERE email = 'testuser@stevens.edu')`,
    );
    const { rows } = await pool.query<{ token: string }>(
      `SELECT ev.token FROM email_verifications ev
       JOIN users u ON u.id = ev.user_id WHERE u.email = 'testuser@stevens.edu'`,
    );
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: rows[0].token });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await registerAndVerify();
  });

  it('returns access token and user on valid credentials', async () => {
    const res = await loginUser();
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user).toMatchObject({
      email: 'verified@stevens.edu',
      username: 'verifieduser',
      isVerified: true,
    });
    // Should NOT return password hash
    expect(res.body.data.user).not.toHaveProperty('password_hash');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('sets an HttpOnly refresh token cookie', async () => {
    const res = await loginUser();
    expect(res.status).toBe(200);
    const cookies = (res.headers['set-cookie'] as unknown) as string[] | undefined;
    expect(cookies).toBeDefined();
    const refreshCookie = (cookies ?? []).find((c: string) => c.startsWith('refresh_token='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/HttpOnly/i);
  });

  it('stores refresh token hash (not raw) in DB', async () => {
    const res = await loginUser();
    const rawToken = extractRefreshToken(res);
    const hash = TokenService.hashRefreshToken(rawToken);

    const { rows } = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1',
      [hash],
    );
    expect(rows).toHaveLength(1);
    // Raw token is NOT in DB
    const { rows: rawRows } = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1',
      [rawToken],
    );
    expect(rawRows).toHaveLength(0);
  });

  it('rejects wrong password', async () => {
    const res = await loginUser('verified@stevens.edu', 'wrongpassword');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects unknown email with same error as wrong password (no enumeration)', async () => {
    const res = await loginUser('nobody@stevens.edu', 'Password123!');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects unverified user', async () => {
    await registerUser({ email: 'unverified@stevens.edu', username: 'unverified' });
    const res = await loginUser('unverified@stevens.edu');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('rejects deactivated user', async () => {
    const user = await UserRepository.findByEmail('verified@stevens.edu');
    await UserRepository.setActive(user!.id, false);
    const res = await loginUser();
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
  });
});

describe('POST /api/auth/refresh', () => {
  let refreshCookie: string;

  beforeEach(async () => {
    await registerAndVerify();
    const loginRes = await loginUser();
    refreshCookie = extractRefreshCookieHeader(loginRes);
  });

  it('returns a new access token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('rotates the refresh token (old one is revoked)', async () => {
    const originalToken = extractRefreshTokenFromCookieHeader(refreshCookie);
    const originalHash = TokenService.hashRefreshToken(originalToken);

    await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);

    // Original token should be revoked
    const { rows } = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1',
      [originalHash],
    );
    expect(rows[0].revoked_at).not.toBeNull();
  });

  it('sets a new refresh token cookie', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie);
    const cookies = (res.headers['set-cookie'] as unknown) as string[] | undefined;
    const newCookie = (cookies ?? []).find((c: string) => c.startsWith('refresh_token='));
    expect(newCookie).toBeDefined();
    // New cookie value differs from old
    const oldTokenValue = refreshCookie.split('=')[1]?.split(';')[0];
    const newTokenValue = newCookie?.split('=')[1]?.split(';')[0];
    expect(newTokenValue).not.toBe(oldTokenValue);
  });

  it('rejects an already-rotated (revoked) refresh token', async () => {
    // Use the token once — it gets rotated
    await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);
    // Use the same old token again — should fail
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('returns 401 when no cookie is present', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_REFRESH_TOKEN');
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the refresh token and clears the cookie', async () => {
    await registerAndVerify();
    const loginRes = await loginUser();
    const refreshCookie = extractRefreshCookieHeader(loginRes);
    const accessToken = loginRes.body.data.accessToken as string;
    const rawToken = extractRefreshTokenFromCookieHeader(refreshCookie);
    const hash = TokenService.hashRefreshToken(rawToken);

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', refreshCookie);

    expect(res.status).toBe(200);

    // Token is revoked in DB
    const { rows } = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1',
      [hash],
    );
    expect(rows[0].revoked_at).not.toBeNull();
  });

  it('returns 401 without an access token', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/resend-verification', () => {
  it('returns 200 for an unverified account', async () => {
    await registerUser();
    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'testuser@stevens.edu' });
    expect(res.status).toBe(200);
  });

  it('returns 200 even for unknown email (no account enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'nobody@stevens.edu' });
    expect(res.status).toBe(200);
  });

  it('returns 200 for already-verified account (silently ignores)', async () => {
    await registerAndVerify();
    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'verified@stevens.edu' });
    expect(res.status).toBe(200);
  });
});

// ---- Cookie extraction helpers ----

function extractRefreshCookieHeader(res: request.Response): string {
  const cookies = (res.headers['set-cookie'] as unknown) as string[] | undefined;
  const cookie = (cookies ?? []).find((c: string) => c.startsWith('refresh_token='));
  if (!cookie) throw new Error('No refresh_token cookie in response');
  return cookie;
}

function extractRefreshToken(res: request.Response): string {
  return extractRefreshTokenFromCookieHeader(extractRefreshCookieHeader(res));
}

function extractRefreshTokenFromCookieHeader(cookieHeader: string): string {
  const value = cookieHeader.split('=')[1]?.split(';')[0];
  if (!value) throw new Error('Could not extract token value from cookie header');
  return value;
}
