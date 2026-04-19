/**
 * Seed script — inserts realistic demo data into the database.
 * Run with: DATABASE_URL=... ts-node src/db/seed.ts
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const PASSWORD_HASH = bcrypt.hashSync('Password123!', 10);

const USERS = [
  { email: 'alex.chen@stevens.edu',    username: 'alexchen',    display_name: 'Alex Chen',    bio: 'CS junior, love hiking and coding.', grad_year: 2026, major: 'Computer Science' },
  { email: 'priya.sharma@stevens.edu', username: 'priyasharma', display_name: 'Priya Sharma',  bio: 'EE senior. Coffee addict.', grad_year: 2025, major: 'Electrical Engineering' },
  { email: 'marco.rossi@stevens.edu',  username: 'marcorossi',  display_name: 'Marco Rossi',   bio: 'ME sophomore. Into robotics.', grad_year: 2027, major: 'Mechanical Engineering' },
  { email: 'sara.lee@stevens.edu',     username: 'saralee',     display_name: 'Sara Lee',      bio: 'Business & Tech. Love NYC.', grad_year: 2026, major: 'Business Technology' },
  { email: 'dev.patel@stevens.edu',    username: 'devpatel',    display_name: 'Dev Patel',     bio: 'Grad student in AI/ML.', grad_year: 2025, major: 'Computer Science (MS)' },
];

const HOUSING = [
  {
    title: '1BR Apartment — 5 min walk to campus',
    description: 'Bright 1-bedroom apartment just a 5-minute walk from Stevens. Hardwood floors, updated kitchen, in-unit laundry. Utilities included. Perfect for a grad student or working professional.',
    price: 1850,
    housing_subtype: 'apartment',
    address: '420 Hudson St, Hoboken, NJ',
    bedrooms: 1,
    bathrooms: 1.0,
    available_from: '2025-06-01',
    is_furnished: false,
    pets_allowed: false,
    utilities_included: true,
    location_text: 'Hoboken, NJ',
  },
  {
    title: 'Roommate Wanted — 2BR near PATH',
    description: 'Looking for a roommate to share a 2BR apartment near the Hoboken PATH station. Place is already furnished. Split rent 50/50. Clean, quiet, and respectful preferred. Stevens student or grad strongly preferred.',
    price: 1100,
    housing_subtype: 'roommate',
    address: '200 Garden St, Hoboken, NJ',
    bedrooms: 2,
    bathrooms: 1.0,
    available_from: '2025-05-15',
    is_furnished: true,
    pets_allowed: true,
    utilities_included: false,
    location_text: 'Hoboken, NJ',
  },
  {
    title: 'Summer Sublet — Studio in Hoboken',
    description: 'Subletting my studio for the summer (May–August). Fully furnished, rooftop access, steps from the waterfront. Great views of NYC. Ideal for summer intern or research student.',
    price: 1600,
    housing_subtype: 'sublet',
    address: '88 River St, Hoboken, NJ',
    bedrooms: 0,
    bathrooms: 1.0,
    available_from: '2025-05-01',
    available_until: '2025-08-31',
    is_furnished: true,
    pets_allowed: false,
    utilities_included: true,
    location_text: 'Hoboken Waterfront',
  },
  {
    title: '2BR/1BA — Jersey City, close to PATH',
    description: 'Spacious 2-bedroom apartment in Journal Square, Jersey City. 10 min PATH ride to Hoboken. Newly renovated bathroom and kitchen. Great for two Stevens students splitting rent.',
    price: 2400,
    housing_subtype: 'apartment',
    address: '350 Summit Ave, Jersey City, NJ',
    bedrooms: 2,
    bathrooms: 1.0,
    available_from: '2025-07-01',
    is_furnished: false,
    pets_allowed: false,
    utilities_included: false,
    location_text: 'Jersey City, NJ',
  },
  {
    title: 'Roommate — Female-only 3BR Hoboken',
    description: 'Two female Stevens students looking for a third roommate in our 3BR apartment on Washington St. Big kitchen, lots of natural light, 8 min walk to campus. Looking for someone clean and friendly.',
    price: 950,
    housing_subtype: 'roommate',
    address: '614 Washington St, Hoboken, NJ',
    bedrooms: 3,
    bathrooms: 2.0,
    available_from: '2025-08-01',
    is_furnished: false,
    pets_allowed: false,
    utilities_included: false,
    location_text: 'Hoboken, NJ',
  },
];

const MARKETPLACE = [
  {
    title: 'Calculus Early Transcendentals 8th Ed',
    description: 'Used for MA 115/116. Good condition, some highlighting in chapters 1–5, otherwise clean. Saving you $180 vs Amazon new.',
    price: 45,
    is_free: false,
    marketplace_category: 'textbooks',
    condition: 'good',
    location_text: 'Stevens Campus',
  },
  {
    title: 'MacBook Pro 14" M2 — Like New',
    description: 'Selling my MacBook Pro 14-inch M2, 16GB RAM, 512GB SSD. Used for one semester, in perfect condition. Comes with original charger and box. Upgrading to M3.',
    price: 1350,
    is_free: false,
    marketplace_category: 'electronics',
    condition: 'like_new',
    location_text: 'Hoboken, NJ',
  },
  {
    title: 'IKEA Desk + Chair — Moving Out Sale',
    description: 'IKEA MICKE desk (white) and ALEX drawer unit. Solid condition, minor scuff on drawer. Great for dorm or apartment. Must pick up — Hoboken only. Moving out at end of month.',
    price: 80,
    is_free: false,
    marketplace_category: 'furniture',
    condition: 'good',
    location_text: 'Hoboken, NJ',
  },
  {
    title: 'Free — Moving boxes (15 boxes)',
    description: 'Moving out and giving away 15 boxes of various sizes. Some packing tape included. First come first served. DM to arrange pickup this weekend in Hoboken.',
    price: 0,
    is_free: true,
    marketplace_category: 'other',
    condition: 'good',
    location_text: 'Hoboken, NJ',
  },
  {
    title: 'Trek FX3 Disc Road Bike',
    description: 'Trek FX3 Disc hybrid bike, medium frame, hydraulic disc brakes. Bought last year, used for commuting. Comes with lock and lights. Great for getting around Hoboken/Jersey City.',
    price: 520,
    is_free: false,
    marketplace_category: 'bikes',
    condition: 'like_new',
    location_text: 'Hoboken, NJ',
  },
  {
    title: 'Intro to Algorithms (CLRS) 4th Ed',
    description: 'Used for CS 546. Hardcover, excellent condition — barely opened. Retail $95, yours for $35.',
    price: 35,
    is_free: false,
    marketplace_category: 'textbooks',
    condition: 'like_new',
    location_text: 'Stevens Campus',
  },
  {
    title: 'Sony WH-1000XM4 Headphones',
    description: 'Sony noise-cancelling headphones. Used for one year, works perfectly. Comes with case and cables. Upgrading to XM5.',
    price: 160,
    is_free: false,
    marketplace_category: 'electronics',
    condition: 'good',
    location_text: 'Hoboken, NJ',
  },
  {
    title: 'Instant Pot Duo 6-Quart',
    description: 'Instant Pot Duo 7-in-1. Used a handful of times, works perfectly. Selling because I never cook. Comes with all accessories.',
    price: 40,
    is_free: false,
    marketplace_category: 'kitchen',
    condition: 'like_new',
    location_text: 'Hoboken, NJ',
  },
  {
    title: 'Patagonia Nano Puff Jacket — Men\'s M',
    description: 'Patagonia Nano Puff in black, men\'s medium. Worn maybe 10 times, great condition. Retail $230.',
    price: 95,
    is_free: false,
    marketplace_category: 'clothing',
    condition: 'like_new',
    location_text: 'Hoboken, NJ',
  },
  {
    title: 'Adjustable Dumbbell Set (5–52.5 lbs)',
    description: 'Bowflex SelectTech 552 adjustable dumbbells. Both dumbbells included. Perfect for home workouts. Selling because I joined the gym.',
    price: 220,
    is_free: false,
    marketplace_category: 'sports',
    condition: 'good',
    location_text: 'Jersey City, NJ',
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding users...');
    const userIds: string[] = [];

    for (const u of USERS) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO users (email, password_hash, display_name, username, bio, grad_year, major, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
         RETURNING id`,
        [u.email, PASSWORD_HASH, u.display_name, u.username, u.bio, u.grad_year, u.major],
      );
      userIds.push(rows[0].id);
      console.log(`  ✓ ${u.username}`);
    }

    console.log('Seeding housing listings...');
    for (let i = 0; i < HOUSING.length; i++) {
      const h = HOUSING[i];
      const userId = userIds[i % userIds.length];
      await client.query(
        `INSERT INTO listings (
          user_id, listing_type, title, description, price, is_free,
          housing_subtype, address, bedrooms, bathrooms,
          available_from, available_until, is_furnished, pets_allowed,
          utilities_included, location_text, status
        ) VALUES ($1,'housing',$2,$3,$4,false,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active')`,
        [
          userId, h.title, h.description, h.price,
          h.housing_subtype, h.address, h.bedrooms, h.bathrooms,
          h.available_from, (h as any).available_until ?? null,
          h.is_furnished, h.pets_allowed, h.utilities_included, h.location_text,
        ],
      );
      console.log(`  ✓ ${h.title}`);
    }

    console.log('Seeding marketplace listings...');
    for (let i = 0; i < MARKETPLACE.length; i++) {
      const m = MARKETPLACE[i];
      const userId = userIds[(i + 2) % userIds.length];
      await client.query(
        `INSERT INTO listings (
          user_id, listing_type, title, description, price, is_free,
          marketplace_category, condition, location_text, status
        ) VALUES ($1,'marketplace',$2,$3,$4,$5,$6,$7,$8,'active')`,
        [userId, m.title, m.description, m.price, m.is_free, m.marketplace_category, m.condition, m.location_text],
      );
      console.log(`  ✓ ${m.title}`);
    }

    console.log('\n✅ Seed complete!');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => { console.error(err); process.exit(1); });
