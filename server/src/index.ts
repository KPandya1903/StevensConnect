/**
 * Server entry point.
 *
 * Responsibilities (and ONLY these):
 *   1. Load env (triggers Zod validation — exits on misconfiguration)
 *   2. Create Express app
 *   3. Apply global middleware
 *   4. Mount route handlers
 *   5. Attach Socket.io to the HTTP server
 *   6. Verify DB connectivity
 *   7. Start listening
 *   8. Register graceful shutdown
 *
 * Business logic lives in services. DB queries live in repositories.
 * This file wires them together — nothing more.
 */

import 'dotenv/config';
import { initSentry, Sentry } from './config/sentry';
// Sentry must be initialised before any other imports that it instruments
initSentry();
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { env } from './config/env';
import { connectDb, closeDb } from './db/pool';
import { errorHandler } from './middleware/errorHandler';

// Route imports (added as each phase is built)
import path from 'path';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { listingsRouter } from './routes/listings';
import { conversationsRouter } from './routes/conversations';
import { registerChatHandlers } from './sockets/chatHandlers';

// ---- Express app setup ----

const app = express();

// Trust Render's reverse proxy so rate-limiter sees real client IPs
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS — only allow requests from the configured client origin
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,               // Required for HttpOnly cookie (refresh token)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Gzip compression for all responses
app.use(compression());

// HTTP request logging (skip in test to keep output clean)
if (!env.isTest) {
  app.use(morgan(env.isDevelopment ? 'dev' : 'combined'));
}

// Parse cookies (used for HttpOnly refresh token)
app.use(cookieParser());

// Parse JSON bodies. Limit to 1MB to prevent abuse.
app.use(express.json({ limit: '1mb' }));

// Parse URL-encoded bodies (used by some form submissions)
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ---- Health check ----
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV });
});

// ---- API routes ----
// Serve uploaded files in dev (in prod, S3 handles this)
if (!env.isProduction) {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/conversations', conversationsRouter);

// ---- 404 handler — must be after all routes ----
app.use((_req, res) => {
  res.status(404).json({
    error: { message: 'Route not found', code: 'NOT_FOUND' },
  });
});

// ---- Sentry error handler (must come before our own) ----
// Cast needed: Sentry v10 returns a type incompatible with @types/express v4 overloads
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use(Sentry.expressErrorHandler() as any);

// ---- Global error handler — must be last ----
app.use(errorHandler);

// ---- HTTP server + Socket.io ----

const httpServer = createServer(app);

export const io = new SocketServer(httpServer, {
  cors: {
    origin: env.CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Don't serve the socket.io client bundle — we import it in the React app
  serveClient: false,
});

// Socket.io auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) {
    next(new Error('Authentication required'));
    return;
  }

  // Lazy import to avoid circular dependency
  void import('jsonwebtoken').then(({ default: jwt }) => {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; email: string; username: string; isVerified: boolean };
      socket.data.user = {
        id: payload.sub,
        email: payload.email,
        username: payload.username,
        isVerified: payload.isVerified,
      };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });
});

io.on('connection', (socket) => {
  const user = socket.data.user as { id: string; username: string } | undefined;
  if (!user) return;

  // Each authenticated user joins their personal notification room
  void socket.join(`user:${user.id}`);

  if (env.isDevelopment) {
    console.info(`Socket connected: ${user.username} (${socket.id})`);
  }

  registerChatHandlers(io, socket);

  socket.on('disconnect', () => {
    if (env.isDevelopment) {
      console.info(`Socket disconnected: ${user.username} (${socket.id})`);
    }
  });
});

// ---- Bootstrap ----

async function start(): Promise<void> {
  await connectDb();

  httpServer.listen(env.PORT, () => {
    console.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

// ---- Graceful shutdown ----

async function shutdown(signal: string): Promise<void> {
  console.info(`\n${signal} received. Shutting down gracefully...`);
  httpServer.close(async () => {
    await closeDb();
    console.info('Server closed.');
    process.exit(0);
  });
  // Force exit if shutdown takes too long
  setTimeout(() => process.exit(1), 10_000);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT',  () => void shutdown('SIGINT'));

// Catch unhandled rejections — log and exit rather than silently continuing
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

// Only call start() when this file is run directly, not when imported by tests
if (require.main === module) {
  void start();
}

export { app, httpServer };
