import { redirect } from '@sveltejs/kit';

export function load({ locals }) {
	if (locals.user?.role !== 'admin') redirect(303, '/supporto');
}
