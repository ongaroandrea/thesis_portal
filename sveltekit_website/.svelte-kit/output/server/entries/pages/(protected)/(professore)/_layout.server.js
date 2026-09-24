import { redirect } from "@sveltejs/kit";
//#region src/routes/(protected)/(professore)/+layout.server.js
function load({ locals }) {
	if (!locals.user) throw redirect(302, "/login");
	if (!["developer", "professor"].includes(locals.user.role)) throw redirect(302, "/corsi");
}
//#endregion
export { load };
