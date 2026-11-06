import { redirect } from '@sveltejs/kit';

/** Same rule as `userService.create` (`POST /api/utenti`): admins only. */
export function load({ locals }) {
	if (locals.user?.role !== 'admin') redirect(303, '/studenti');
}
