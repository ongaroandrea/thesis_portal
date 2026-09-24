
import { redirect } from '@sveltejs/kit';

const PUBLIC_PATHS = ['/login', '/reset-password', '/password-dimenticata'];

export function load({ locals, url }) {
    const isPublic = PUBLIC_PATHS.includes(url.pathname);

    console.log('Checking user authentication...');
    console.log('Current URL:', url.pathname);
    console.log('User:', locals.user);

    // Logged-in users have no business on public/auth pages
    if (isPublic && locals.user) {
        console.log('User already authenticated, redirecting...');
        redirect(302, getLandingPath(locals.user));
    }

    // Unauthenticated users can only access public pages
    if (!locals.user && !isPublic) {
        redirect(302, '/login');
    }

    // Authenticated users: role-based landing only on the root path (or wherever you need it)
    if (locals.user && url.pathname === '/') {
        redirect(302, getLandingPath(locals.user));
    }

    return { user: locals.user };
}
