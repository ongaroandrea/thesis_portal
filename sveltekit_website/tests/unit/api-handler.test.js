import { describe, expect, it } from 'vitest';
import { apiResponse } from '../../src/lib/server/api/handler.js';
import { ApiError } from '../../src/lib/server/services/api.service.js';

async function responseFor(error) {
	const response = await apiResponse(async () => { throw error; });
	return { status: response.status, body: await response.json() };
}

describe('API error normalization', () => {
	it.each([
		['23505', 'RESOURCE_ALREADY_EXISTS'],
		['23503', 'RELATED_RESOURCE_CONFLICT'],
		['23502', 'DATABASE_CONSTRAINT_CONFLICT'],
		['23514', 'DATABASE_CONSTRAINT_CONFLICT'],
		['23P01', 'RESOURCE_CONFLICT'],
		['40001', 'CONCURRENT_WRITE_CONFLICT'],
		['40P01', 'CONCURRENT_WRITE_CONFLICT']
	])('maps PostgreSQL %s to a stable 409 response', async (postgresCode, apiCode) => {
		const { status, body } = await responseFor(Object.assign(new Error('database detail must not leak'), { code: postgresCode }));
		expect(status).toBe(409);
		expect(body.error.code).toBe(apiCode);
		expect(body.error.message).not.toContain('database detail');
	});

	it('preserves intentional API errors', async () => {
		const { status, body } = await responseFor(new ApiError(403, 'Denied.', 'DENIED'));
		expect(status).toBe(403);
		expect(body).toEqual({ error: { code: 'DENIED', message: 'Denied.' } });
	});

	it('recognizes database errors wrapped by the ORM', async () => {
		const wrapped = new Error('query failed', { cause: Object.assign(new Error('duplicate'), { code: '23505' }) });
		const { status, body } = await responseFor(wrapped);
		expect(status).toBe(409);
		expect(body.error.code).toBe('RESOURCE_ALREADY_EXISTS');
	});
});
