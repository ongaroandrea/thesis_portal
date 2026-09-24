import { redirect } from "@sveltejs/kit";
//#region src/routes/(protected)/+layout.server.js
var PUBLIC_PATHS = [
	"/login",
	"/reset-password",
	"/password-dimenticata"
];
function load({ locals, url }) {
	const isPublic = PUBLIC_PATHS.includes(url.pathname);
	console.log("Checking user authentication...");
	console.log("Current URL:", url.pathname);
	console.log("User:", locals.user);
	if (isPublic && locals.user) {
		console.log("User already authenticated, redirecting...");
		redirect(302, getLandingPath(locals.user));
	}
	if (!locals.user && !isPublic) redirect(302, "/login");
	if (locals.user && url.pathname === "/") redirect(302, getLandingPath(locals.user));
	return { user: locals.user };
}
//#endregion
export { load };
