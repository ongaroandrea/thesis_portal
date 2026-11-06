import { describe, expect, it } from 'vitest';
import { isBlockedAuthEndpoint } from '../../src/lib/server/auth/admin-endpoints.js';

describe('isBlockedAuthEndpoint', () => {
	it.each([
		'/admin/create-user',
		'/admin/set-role',
		'/admin/ban-user',
		'/admin/remove-user',
		'/admin/list-users',
		'/admin/has-permission'
	])('blocks %s over HTTP but allows server-side auth.api calls', (path) => {
		expect(isBlockedAuthEndpoint(path, true)).toBe(true);
		expect(isBlockedAuthEndpoint(path, false)).toBe(false);
	});

	it.each(['/admin/impersonate-user', '/admin/stop-impersonating'])('always blocks %s', (path) => {
		expect(isBlockedAuthEndpoint(path, true)).toBe(true);
		expect(isBlockedAuthEndpoint(path, false)).toBe(true);
	});

	it.each(['/sign-in/email', '/get-session', '/request-password-reset', '/change-password', '/administrator'])(
		'leaves %s alone',
		(path) => {
			expect(isBlockedAuthEndpoint(path, true)).toBe(false);
		}
	);

	it('ignores a missing path', () => {
		expect(isBlockedAuthEndpoint(undefined, true)).toBe(false);
	});
});
