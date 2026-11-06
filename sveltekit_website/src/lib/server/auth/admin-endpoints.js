/**
 * Better Auth admin plugin endpoints that are never served over HTTP.
 *
 * The admin plugin mounts `/api/auth/admin/*` (create-user, set-role,
 * ban-user, remove-user, impersonate-user, ...). Those routes would skip the
 * checks in `users.service.js` (for example the block on deleting your own
 * account), so only server-side `auth.api.*` calls from the services may
 * reach them. Impersonation is refused everywhere, server calls included.
 */
const ADMIN_PATH_PREFIX = '/admin/';
const IMPERSONATION_PATHS = new Set(['/admin/impersonate-user', '/admin/stop-impersonating']);

/**
 * Decide whether a Better Auth endpoint call must be rejected.
 *
 * Better Auth's HTTP router passes the incoming `Request` to the endpoint
 * context, while a direct `auth.api.*` call from server code only carries
 * `headers`. A present `request` therefore means the call came from outside.
 *
 * @param {string | undefined} path - Endpoint path such as `/admin/ban-user`.
 * @param {boolean} fromHttp - True when the call came through the HTTP router.
 * @returns {boolean}
 */
export function isBlockedAuthEndpoint(path, fromHttp) {
	if (typeof path !== 'string') return false;
	if (IMPERSONATION_PATHS.has(path)) return true;
	return fromHttp && path.startsWith(ADMIN_PATH_PREFIX);
}
