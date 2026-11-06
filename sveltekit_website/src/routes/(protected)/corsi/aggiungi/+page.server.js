import { redirect } from '@sveltejs/kit';

/** Same rule as `courseService.create`: only admins and professors. */
export function load({ locals }) {
	if (!['admin', 'professor'].includes(locals.user?.role)) redirect(303, '/corsi');
}
