import { redirect } from "@sveltejs/kit";

export function load({ locals }) {
    if (!locals.user) {
        throw redirect(302, "/login");
    }

	const canAccessAdminGroup = ['developer', 'professor'].includes(locals.user.role);

    if (!canAccessAdminGroup) {
		throw redirect(302, "/corsi");
    }
}
