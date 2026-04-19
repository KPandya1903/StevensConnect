/**
 * Environment configuration.
 *
 * ALL environment variables used anywhere in the server must be declared here.
 * This file is imported once at startup. If any required variable is missing or
 * has the wrong type, the process exits immediately with a descriptive error.
 *
 * Rule: Never use process.env.X anywhere else in the codebase. Import from this file.
 */

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  TEST_DATABASE_URL: z
    .string()
    .url('TEST_DATABASE_URL must be a valid PostgreSQL connection string')
    .optional(),

  // Auth
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters — generate with crypto.randomBytes(64)'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().positive().default(30),

  // CORS
  CLIENT_ORIGIN: z.string().url('CLIENT_ORIGIN must be a valid URL'),

  // Email (all optional — if not set, email verification is skipped and users are auto-verified)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // File uploads
  UPLOAD_STORAGE: z.enum(['local', 's3']).default('local'),
  UPLOAD_MAX_IMAGE_SIZE_BYTES: z.coerce.number().int().positive().default(8_388_608), // 8 MB
  UPLOAD_MAX_AVATAR_SIZE_BYTES: z.coerce.number().int().positive().default(5_242_880), // 5 MB

  // AWS S3 (only required when UPLOAD_STORAGE=s3)
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  // Rate limiting
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().int().positive().default(900_000), // 15 min

  // Sentry (optional — only required in production)
  SENTRY_DSN: z.string().url().optional(),
});

// Refine: S3 fields are required when UPLOAD_STORAGE=s3
const refinedSchema = envSchema.refine(
  (data) => {
    if (data.UPLOAD_STORAGE === 's3') {
      return (
        !!data.AWS_REGION &&
        !!data.AWS_ACCESS_KEY_ID &&
        !!data.AWS_SECRET_ACCESS_KEY &&
        !!data.AWS_S3_BUCKET
      );
    }
    return true;
  },
  {
    message: 'AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET are required when UPLOAD_STORAGE=s3',
  },
);

function parseEnv(): z.infer<typeof refinedSchema> {
  const result = refinedSchema.safeParse(process.env);

  if (!result.success) {
    console.error('\n❌ Invalid environment variables:\n');
    result.error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    });
    console.error('\nCheck your .env file against .env.example\n');
    process.exit(1);
  }

  return result.data;
}

// Parsed and validated env — exported as a plain object.
// In test environment, TEST_DATABASE_URL overrides DATABASE_URL automatically.
const raw = parseEnv();
export const env = {
  ...raw,
  DATABASE_URL: raw.NODE_ENV === 'test' && raw.TEST_DATABASE_URL ? raw.TEST_DATABASE_URL : raw.DATABASE_URL,
  isProduction: raw.NODE_ENV === 'production',
  isDevelopment: raw.NODE_ENV === 'development',
  isTest: raw.NODE_ENV === 'test',
  // True when SMTP is fully configured
  emailEnabled: !!(raw.SMTP_HOST && raw.SMTP_USER && raw.SMTP_PASS && raw.EMAIL_FROM),
} as const;
