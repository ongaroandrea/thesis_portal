import { redirect } from "@sveltejs/kit";
// src/routes/auth/+layout.server.js
function load({ locals }) {
	if (locals.user) redirect(302, "/corsi");
}
export { load };
