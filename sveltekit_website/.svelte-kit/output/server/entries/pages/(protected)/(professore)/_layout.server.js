import { redirect } from "@sveltejs/kit";
// src/routes/(protected)/(professore)/+layout.server.js
function load({ locals }) {
	if (!locals.user) throw redirect(302, "/login");
	if (!["admin", "professor"].includes(locals.user.role)) throw redirect(302, "/corsi");
}
export { load };
