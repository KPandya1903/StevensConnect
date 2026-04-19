/**
 * ListingRepository
 *
 * All SQL for the listings table and listing_saves.
 * No business logic — just parameterized queries.
 *
 * Key design decisions:
 *   - findAll uses a single query with conditional WHERE clauses.
 *     Offset pagination is fine for listings (not real-time data).
 *   - Full-text search via the generated search_vector tsvector column.
 *   - views_count is incremented atomically in the DB.
 *   - save/unsave uses INSERT ... ON CONFLICT DO NOTHING + DELETE pattern.
 */

import { pool } from '../db/pool';
import type { ListingType, ListingStatus, HousingSubtype, MarketplaceCategory, ItemCondition } from '@stevensconnect/shared';

// ---- Row type (DB column names) ----

export interface ListingRow {
  id: string;
  user_id: string;
  listing_type: ListingType;
  title: string;
  description: string;
  price: string | null;  // pg returns NUMERIC as string
  is_free: boolean;
  status: ListingStatus;
  housing_subtype: HousingSubtype | null;
  address: string | null;
  bedrooms: number | null;
  bathrooms: string | null;
  available_from: Date | null;
  available_until: Date | null;
  is_furnished: boolean | null;
  pets_allowed: boolean | null;
  utilities_included: boolean | null;
  marketplace_category: MarketplaceCategory | null;
  condition: ItemCondition | null;
  image_urls: string[];
  video_url: string | null;
  location_text: string | null;
  views_count: number;
  created_at: Date;
  updated_at: Date;
  // Joined fields (present when fetching with author)
  author_id?: string;
  author_username?: string;
  author_display_name?: string;
  author_avatar_url?: string | null;
  // Computed (present when fetching for a specific user)
  is_saved?: boolean;
}

// ---- Input types ----

export interface CreateListingInput {
  userId: string;
  listingType: ListingType;
  title: string;
  description: string;
  price?: number | null;
  isFree?: boolean;
  housingSubtype?: HousingSubtype | null;
  address?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
  isFurnished?: boolean | null;
  petsAllowed?: boolean | null;
  utilitiesIncluded?: boolean | null;
  marketplaceCategory?: MarketplaceCategory | null;
  condition?: ItemCondition | null;
  locationText?: string | null;
}

export interface UpdateListingInput {
  title?: string;
  description?: string;
  price?: number | null;
  isFree?: boolean;
  housingSubtype?: HousingSubtype | null;
  address?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
  isFurnished?: boolean | null;
  petsAllowed?: boolean | null;
  utilitiesIncluded?: boolean | null;
  marketplaceCategory?: MarketplaceCategory | null;
  condition?: ItemCondition | null;
  locationText?: string | null;
}

export interface FindAllOptions {
  listingType?: ListingType;
  housingSubtype?: HousingSubtype;
  marketplaceCategory?: MarketplaceCategory;
  minPrice?: number;
  maxPrice?: number;
  isFree?: boolean;
  search?: string;
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
  userId?: string;         // filter by owner
  viewerUserId?: string;   // used to compute is_saved
  status?: ListingStatus;
}

export interface FindAllResult {
  listings: ListingRow[];
  total: number;
}

// ---- Repository ----

export const ListingRepository = {
  async create(input: CreateListingInput): Promise<ListingRow> {
    const { rows } = await pool.query<ListingRow>(
      `INSERT INTO listings (
        user_id, listing_type, title, description, price, is_free,
        housing_subtype, address, bedrooms, bathrooms,
        available_from, available_until, is_furnished, pets_allowed, utilities_included,
        marketplace_category, condition, location_text
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18
      ) RETURNING *`,
      [
        input.userId, input.listingType, input.title, input.description,
        input.price ?? null, input.isFree ?? false,
        input.housingSubtype ?? null, input.address ?? null,
        input.bedrooms ?? null, input.bathrooms ?? null,
        input.availableFrom ?? null, input.availableUntil ?? null,
        input.isFurnished ?? null, input.petsAllowed ?? null, input.utilitiesIncluded ?? null,
        input.marketplaceCategory ?? null, input.condition ?? null,
        input.locationText ?? null,
      ],
    );
    return rows[0];
  },

  async findById(id: string, viewerUserId?: string): Promise<ListingRow | null> {
    const { rows } = await pool.query<ListingRow>(
      `SELECT l.*,
              u.id          AS author_id,
              u.username    AS author_username,
              u.display_name AS author_display_name,
              u.avatar_url  AS author_avatar_url
              ${viewerUserId ? `, EXISTS(SELECT 1 FROM listing_saves ls WHERE ls.listing_id = l.id AND ls.user_id = $2) AS is_saved` : ''}
       FROM listings l
       JOIN users u ON u.id = l.user_id
       WHERE l.id = $1`,
      viewerUserId ? [id, viewerUserId] : [id],
    );
    return rows[0] ?? null;
  },

  async findAll(opts: FindAllOptions): Promise<FindAllResult> {
    const conditions: string[] = ["l.status = 'active'"];
    const values: unknown[] = [];
    let idx = 1;

    if (opts.status) {
      conditions[0] = `l.status = $${idx++}`;
      values.push(opts.status);
    }

    if (opts.listingType) {
      conditions.push(`l.listing_type = $${idx++}`);
      values.push(opts.listingType);
    }
    if (opts.housingSubtype) {
      conditions.push(`l.housing_subtype = $${idx++}`);
      values.push(opts.housingSubtype);
    }
    if (opts.marketplaceCategory) {
      conditions.push(`l.marketplace_category = $${idx++}`);
      values.push(opts.marketplaceCategory);
    }
    if (opts.isFree === true) {
      conditions.push(`l.is_free = TRUE`);
    }
    if (opts.minPrice !== undefined) {
      conditions.push(`l.price >= $${idx++}`);
      values.push(opts.minPrice);
    }
    if (opts.maxPrice !== undefined) {
      conditions.push(`l.price <= $${idx++}`);
      values.push(opts.maxPrice);
    }
    if (opts.userId) {
      conditions.push(`l.user_id = $${idx++}`);
      values.push(opts.userId);
    }
    if (opts.search) {
      conditions.push(`l.search_vector @@ plainto_tsquery('english', $${idx++})`);
      values.push(opts.search);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortMap: Record<string, string> = {
      newest:    'l.created_at DESC',
      oldest:    'l.created_at ASC',
      price_asc: 'l.price ASC NULLS LAST',
      price_desc:'l.price DESC NULLS LAST',
    };
    const orderBy = sortMap[opts.sort ?? 'newest'];

    const limit = Math.min(opts.limit ?? 20, 50);
    const page  = Math.max(opts.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const savedSubquery = opts.viewerUserId
      ? `, EXISTS(SELECT 1 FROM listing_saves ls WHERE ls.listing_id = l.id AND ls.user_id = '${opts.viewerUserId}') AS is_saved`
      : '';

    const dataQuery = `
      SELECT l.*,
             u.id           AS author_id,
             u.username     AS author_username,
             u.display_name AS author_display_name,
             u.avatar_url   AS author_avatar_url
             ${savedSubquery}
      FROM listings l
      JOIN users u ON u.id = l.user_id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total FROM listings l ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query<ListingRow>(dataQuery, values),
      pool.query<{ total: string }>(countQuery, values),
    ]);

    return {
      listings: dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
    };
  },

  async update(id: string, input: UpdateListingInput): Promise<ListingRow> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const fieldMap: [keyof UpdateListingInput, string][] = [
      ['title', 'title'],
      ['description', 'description'],
      ['price', 'price'],
      ['isFree', 'is_free'],
      ['housingSubtype', 'housing_subtype'],
      ['address', 'address'],
      ['bedrooms', 'bedrooms'],
      ['bathrooms', 'bathrooms'],
      ['availableFrom', 'available_from'],
      ['availableUntil', 'available_until'],
      ['isFurnished', 'is_furnished'],
      ['petsAllowed', 'pets_allowed'],
      ['utilitiesIncluded', 'utilities_included'],
      ['marketplaceCategory', 'marketplace_category'],
      ['condition', 'condition'],
      ['locationText', 'location_text'],
    ];

    for (const [inputKey, dbCol] of fieldMap) {
      if (input[inputKey] !== undefined) {
        fields.push(`${dbCol} = $${idx++}`);
        values.push(input[inputKey]);
      }
    }

    if (fields.length === 0) {
      const row = await ListingRepository.findById(id);
      return row!;
    }

    values.push(id);
    const { rows } = await pool.query<ListingRow>(
      `UPDATE listings SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return rows[0];
  },

  async setStatus(id: string, status: ListingStatus): Promise<void> {
    await pool.query('UPDATE listings SET status = $1 WHERE id = $2', [status, id]);
  },

  async addImage(id: string, url: string): Promise<string[]> {
    const { rows } = await pool.query<{ image_urls: string[] }>(
      `UPDATE listings SET image_urls = array_append(image_urls, $1) WHERE id = $2 RETURNING image_urls`,
      [url, id],
    );
    return rows[0].image_urls;
  },

  async removeImage(id: string, url: string): Promise<string[]> {
    const { rows } = await pool.query<{ image_urls: string[] }>(
      `UPDATE listings SET image_urls = array_remove(image_urls, $1) WHERE id = $2 RETURNING image_urls`,
      [url, id],
    );
    return rows[0].image_urls;
  },

  async incrementViews(id: string): Promise<void> {
    await pool.query('UPDATE listings SET views_count = views_count + 1 WHERE id = $1', [id]);
  },

  // Returns true if now saved, false if now unsaved
  async toggleSave(userId: string, listingId: string): Promise<boolean> {
    const { rows } = await pool.query<{ saved: boolean }>(
      `WITH del AS (
         DELETE FROM listing_saves
         WHERE user_id = $1 AND listing_id = $2
         RETURNING listing_id
       )
       INSERT INTO listing_saves (user_id, listing_id)
       SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM del)
       RETURNING TRUE AS saved`,
      [userId, listingId],
    );
    return rows.length > 0; // row returned = inserted (now saved)
  },

  async getSavedListings(userId: string, page = 1, limit = 20): Promise<FindAllResult> {
    const offset = (page - 1) * limit;
    const [dataResult, countResult] = await Promise.all([
      pool.query<ListingRow>(
        `SELECT l.*, u.id AS author_id, u.username AS author_username,
                u.display_name AS author_display_name, u.avatar_url AS author_avatar_url,
                TRUE AS is_saved
         FROM listings l
         JOIN listing_saves ls ON ls.listing_id = l.id
         JOIN users u ON u.id = l.user_id
         WHERE ls.user_id = $1 AND l.status = 'active'
         ORDER BY ls.saved_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      ),
      pool.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM listing_saves WHERE user_id = $1`,
        [userId],
      ),
    ]);
    return { listings: dataResult.rows, total: parseInt(countResult.rows[0].total, 10) };
  },

  async setVideo(id: string, url: string): Promise<void> {
    await pool.query('UPDATE listings SET video_url = $1 WHERE id = $2', [url, id]);
  },

  async clearVideo(id: string): Promise<void> {
    await pool.query('UPDATE listings SET video_url = NULL WHERE id = $1', [id]);
  },

  async createReport(reporterId: string, listingId: string, reason: string, details?: string): Promise<void> {
    await pool.query(
      `INSERT INTO reports (reporter_id, listing_id, reason, details) VALUES ($1, $2, $3, $4)`,
      [reporterId, listingId, reason, details ?? null],
    );
  },
};
