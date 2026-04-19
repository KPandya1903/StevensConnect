/**
 * Listings integration tests
 *
 * Covers: CRUD, authorization (owner-only mutations), filters,
 *         full-text search, save/unsave, status transitions, reports.
 */

import request from 'supertest';
import { app } from '../../src/index';
import { pool } from '../../src/db/pool';
import { UserRepository } from '../../src/repositories/UserRepository';
import { TokenService } from '../../src/services/TokenService';

// ---- Test helpers ----

async function createVerifiedUser(email: string, username: string) {
  const hash = await (await import('bcryptjs')).default.hash('Password123!', 4); // low cost for tests
  const user = await UserRepository.create({
    email,
    passwordHash: hash,
    displayName: 'Test User',
    username,
  });
  await UserRepository.setVerified(user.id);
  return user;
}

function bearerToken(userId: string, email: string, username: string) {
  return `Bearer ${TokenService.signAccessToken({ sub: userId, email, username, isVerified: true })}`;
}

const BASE_LISTING = {
  listingType: 'marketplace',
  title: 'Intro to CS Textbook',
  description: 'Great condition, used for one semester only, still has all pages.',
  price: 25,
  marketplaceCategory: 'textbooks',
  condition: 'good',
  locationText: 'Hoboken, NJ',
};

const HOUSING_LISTING = {
  listingType: 'housing',
  title: 'Cozy Studio near Stevens',
  description: 'Perfect for a grad student, 5 min walk to campus, utilities included.',
  price: 1200,
  housingSubtype: 'apartment',
  bedrooms: 0,
  bathrooms: 1,
  availableFrom: '2026-06-01',
  locationText: 'Hoboken, NJ',
  utilitiesIncluded: true,
};

describe('POST /api/listings', () => {
  let token: string;

  beforeEach(async () => {
    const user = await createVerifiedUser('owner@stevens.edu', 'owner');
    token = bearerToken(user.id, user.email, user.username);
  });

  it('creates a marketplace listing', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', token)
      .send(BASE_LISTING);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: BASE_LISTING.title,
      listingType: 'marketplace',
      marketplaceCategory: 'textbooks',
      status: 'active',
      price: 25,
    });
    expect(res.body.data).toHaveProperty('id');
  });

  it('creates a housing listing', async () => {
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', token)
      .send(HOUSING_LISTING);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      listingType: 'housing',
      housingSubtype: 'apartment',
      utilitiesIncluded: true,
    });
  });

  it('rejects marketplace listing without category', async () => {
    const { marketplaceCategory: _, ...noCategory } = BASE_LISTING;
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', token)
      .send(noCategory);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('MISSING_MARKETPLACE_CATEGORY');
  });

  it('rejects housing listing without subtype', async () => {
    const { housingSubtype: _, ...noSubtype } = HOUSING_LISTING;
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', token)
      .send(noSubtype);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('MISSING_HOUSING_SUBTYPE');
  });

  it('rejects listing with no price and not free', async () => {
    const { price: _, ...noPrice } = BASE_LISTING;
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', token)
      .send({ ...noPrice });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('MISSING_PRICE');
  });

  it('accepts a free listing with no price', async () => {
    const { price: _, ...noPrice } = BASE_LISTING;
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', token)
      .send({ ...noPrice, isFree: true });
    expect(res.status).toBe(201);
    expect(res.body.data.isFree).toBe(true);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/listings').send(BASE_LISTING);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/listings', () => {
  let token: string;
  let listingId: string;

  beforeEach(async () => {
    const user = await createVerifiedUser('owner@stevens.edu', 'owner');
    token = bearerToken(user.id, user.email, user.username);

    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', token)
      .send(BASE_LISTING);
    listingId = res.body.data.id as string;
  });

  it('returns listings array with pagination', async () => {
    const res = await request(app)
      .get('/api/listings')
      .set('Authorization', token);
    expect(res.status).toBe(200);
    expect(res.body.data.listings).toBeInstanceOf(Array);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('totalPages');
  });

  it('filters by listing_type=marketplace', async () => {
    // Create a housing listing too
    await request(app)
      .post('/api/listings')
      .set('Authorization', token)
      .send(HOUSING_LISTING);

    const res = await request(app)
      .get('/api/listings?type=marketplace')
      .set('Authorization', token);
    expect(res.status).toBe(200);
    expect(res.body.data.listings.every((l: { listingType: string }) => l.listingType === 'marketplace')).toBe(true);
  });

  it('full-text search finds matching listings', async () => {
    const res = await request(app)
      .get('/api/listings?search=textbook')
      .set('Authorization', token);
    expect(res.status).toBe(200);
    expect(res.body.data.listings.length).toBeGreaterThan(0);
  });

  it('full-text search returns empty for unrelated term', async () => {
    const res = await request(app)
      .get('/api/listings?search=zippitydoodah')
      .set('Authorization', token);
    expect(res.status).toBe(200);
    expect(res.body.data.listings.length).toBe(0);
  });

  it('GET /api/listings/:id returns listing with author', async () => {
    const res = await request(app)
      .get(`/api/listings/${listingId}`)
      .set('Authorization', token);
    expect(res.status).toBe(200);
    expect(res.body.data.author).toBeDefined();
    expect(res.body.data.author.username).toBe('owner');
  });

  it('returns 404 for unknown listing id', async () => {
    const res = await request(app)
      .get('/api/listings/00000000-0000-0000-0000-000000000000')
      .set('Authorization', token);
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/listings/:id', () => {
  let ownerToken: string;
  let otherToken: string;
  let listingId: string;

  beforeEach(async () => {
    const owner = await createVerifiedUser('owner@stevens.edu', 'owner');
    const other = await createVerifiedUser('other@stevens.edu', 'other');
    ownerToken = bearerToken(owner.id, owner.email, owner.username);
    otherToken = bearerToken(other.id, other.email, other.username);

    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', ownerToken)
      .send(BASE_LISTING);
    listingId = res.body.data.id as string;
  });

  it('owner can update a listing', async () => {
    const res = await request(app)
      .put(`/api/listings/${listingId}`)
      .set('Authorization', ownerToken)
      .send({ title: 'Updated Title For CS Book', price: 20 });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Title For CS Book');
    expect(res.body.data.price).toBe(20);
  });

  it('non-owner gets 403', async () => {
    const res = await request(app)
      .put(`/api/listings/${listingId}`)
      .set('Authorization', otherToken)
      .send({ title: 'Hacked Title' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('PATCH /api/listings/:id/status', () => {
  let ownerToken: string;
  let listingId: string;

  beforeEach(async () => {
    const owner = await createVerifiedUser('owner@stevens.edu', 'owner');
    ownerToken = bearerToken(owner.id, owner.email, owner.username);
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', ownerToken)
      .send(BASE_LISTING);
    listingId = res.body.data.id as string;
  });

  it('owner can mark listing as sold', async () => {
    const res = await request(app)
      .patch(`/api/listings/${listingId}/status`)
      .set('Authorization', ownerToken)
      .send({ status: 'sold' });
    expect(res.status).toBe(200);

    // Verify listing no longer appears in feed
    const feed = await request(app)
      .get('/api/listings')
      .set('Authorization', ownerToken);
    expect(feed.body.data.listings.find((l: { id: string }) => l.id === listingId)).toBeUndefined();
  });

  it('cannot update status of a non-active listing', async () => {
    await request(app)
      .patch(`/api/listings/${listingId}/status`)
      .set('Authorization', ownerToken)
      .send({ status: 'sold' });

    // Try to mark sold again
    const res = await request(app)
      .patch(`/api/listings/${listingId}/status`)
      .set('Authorization', ownerToken)
      .send({ status: 'closed' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LISTING_NOT_ACTIVE');
  });
});

describe('POST /api/listings/:id/save', () => {
  let userToken: string;
  let listingId: string;

  beforeEach(async () => {
    const owner = await createVerifiedUser('owner@stevens.edu', 'owner');
    const saver = await createVerifiedUser('saver@stevens.edu', 'saver');
    const ownerToken = bearerToken(owner.id, owner.email, owner.username);
    userToken = bearerToken(saver.id, saver.email, saver.username);

    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', ownerToken)
      .send(BASE_LISTING);
    listingId = res.body.data.id as string;
  });

  it('saves a listing and returns saved=true', async () => {
    const res = await request(app)
      .post(`/api/listings/${listingId}/save`)
      .set('Authorization', userToken);
    expect(res.status).toBe(200);
    expect(res.body.data.saved).toBe(true);
  });

  it('unsaves on second call (toggle)', async () => {
    await request(app)
      .post(`/api/listings/${listingId}/save`)
      .set('Authorization', userToken);

    const res = await request(app)
      .post(`/api/listings/${listingId}/save`)
      .set('Authorization', userToken);
    expect(res.body.data.saved).toBe(false);
  });

  it('saved listing appears in /api/users/me/saves', async () => {
    await request(app)
      .post(`/api/listings/${listingId}/save`)
      .set('Authorization', userToken);

    const saves = await request(app)
      .get('/api/users/me/saves')
      .set('Authorization', userToken);
    expect(saves.status).toBe(200);
    expect(saves.body.data.listings.some((l: { id: string }) => l.id === listingId)).toBe(true);
  });
});

describe('POST /api/listings/:id/report', () => {
  let userToken: string;
  let listingId: string;

  beforeEach(async () => {
    const owner = await createVerifiedUser('owner@stevens.edu', 'owner');
    const reporter = await createVerifiedUser('reporter@stevens.edu', 'reporter');
    const ownerToken = bearerToken(owner.id, owner.email, owner.username);
    userToken = bearerToken(reporter.id, reporter.email, reporter.username);

    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', ownerToken)
      .send(BASE_LISTING);
    listingId = res.body.data.id as string;
  });

  it('submits a report', async () => {
    const res = await request(app)
      .post(`/api/listings/${listingId}/report`)
      .set('Authorization', userToken)
      .send({ reason: 'spam', details: 'This is clearly spam.' });
    expect(res.status).toBe(200);

    // Verify report in DB
    const { rows } = await pool.query(
      'SELECT * FROM reports WHERE listing_id = $1',
      [listingId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].reason).toBe('spam');
  });
});
