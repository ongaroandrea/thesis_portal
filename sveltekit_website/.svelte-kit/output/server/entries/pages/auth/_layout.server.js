import { redirect } from "@sveltejs/kit";
//#region src/routes/auth/+layout.server.js
function load({ locals }) {
	if (locals.user) throw redirect(302, "");
}
//#endregion
export { load };
