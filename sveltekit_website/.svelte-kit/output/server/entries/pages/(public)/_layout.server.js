import { redirect } from "@sveltejs/kit";
// src/routes/(public)/+layout.server.js
function load({ locals }) {
	if (locals.user) redirect(302, "/corsi");
	return {};
}
export { load };
