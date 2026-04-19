/**
 * Health check integration test.
 *
 * Verifies:
 *   - Server starts and responds to HTTP requests
 *   - /health endpoint returns 200
 *   - Database connectivity (the global-setup ran migrations successfully)
 *   - Unknown routes return 404 with correct shape
 */

import request from 'supertest';
import { app } from '../../src/index';

describe('Server health', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  it('GET /unknown-route returns 404 with error shape', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      error: {
        message: expect.any(String) as string,
        code: 'NOT_FOUND',
      },
    });
  });

  it('Auth router register endpoint exists (returns 422 on empty body, not 404)', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    // 422 = validation error = route exists and is wired up
    expect(res.status).toBe(422);
  });
});
