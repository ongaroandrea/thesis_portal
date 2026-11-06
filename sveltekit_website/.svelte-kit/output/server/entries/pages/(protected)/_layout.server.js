import { redirect } from "@sveltejs/kit";
// src/routes/(protected)/+layout.server.js
function load({ locals }) {
	if (!locals.user) redirect(302, "/login");
	return { user: locals.user };
}
export { load };
