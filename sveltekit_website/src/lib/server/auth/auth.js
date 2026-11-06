import 'dotenv/config'; // Loads .env file
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";
import { db } from '$lib/server/db';
import * as schema from "$lib/server/db/schema.js";
import { admin as adminPlugin } from "better-auth/plugins"
import { APIError } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { sendMail } from "../mail/mailer.js";
import { renderMailTemplate } from "../mail/render-template.js";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";
import { haveIBeenPwned } from "better-auth/plugins"
import { isBlockedAuthEndpoint } from "./admin-endpoints.js";

// Better Auth access-control roles. Only the admin plugin reads them, to
// decide which admin endpoints a session may call; the app's own
// authorization lives in the services (`user.role` plus course memberships).
// The statements are the plugin defaults; professors and students get none.
const ac = createAccessControl(defaultStatements);

/**
 * Build the link sent in password-reset emails.
 *
 * Points at the app's own `/auth/verifica-password` page (not Better Auth's
 * default callback) so the user picks the new password in the portal UI.
 * Uses the public client URL because the server-side `BETTER_AUTH_URL` may
 * be an internal address in Docker.
 *
 * @param {string} token - Reset token issued by Better Auth.
 * @returns {string} Absolute URL with `token` and `callbackUrl` query params.
 */
function passwordResetUrl(token) {
    const clientUrl = process.env.BETTER_AUTH_CLIENT_URL || process.env.BETTER_AUTH_URL || 'http://localhost:5173';
    const target = new URL('/auth/verifica-password', clientUrl);
    target.searchParams.set('token', token);
    target.searchParams.set('callbackUrl', clientUrl);
    return target.toString();
}

// Admins get the plugin's admin permissions except impersonation, which the
// portal does not offer (see also `isBlockedAuthEndpoint`).
export const admin = ac.newRole({
    user: adminAc.statements.user.filter((action) => action !== "impersonate"),
    session: adminAc.statements.session,
});

export const professor = ac.newRole({});

const student = ac.newRole({});

export const auth = betterAuth({
    appName: "Image Evaluator",
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: [
        process.env.BETTER_AUTH_CLIENT_URL,
        process.env.PUBLIC_URL,
        process.env.BETTER_AUTH_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ].filter(Boolean),
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: schema,
    }),
    user: {
        deleteUser: {
            enabled: true,
            beforeDelete: async (user, request) => {
                if (user.role === "admin") {
                    throw new APIError("BAD_REQUEST", {
                        message: "Admin accounts can't be deleted",
                    });
                }
            },
        },
        additionalFields: {
            surname: {
                type: "string",
                required: false,
                defaultValue: null,
                input: true
            },
            role: {
                type: "string",
                required: false,
                defaultValue: "student",
                input: false
            },
            first_access: {
                type: "boolean",
                required: false,
                defaultValue: true,
                input: false
            },
        }
    },
    emailAndPassword: {
        enabled: true,
        // Accounts are created only by admins (`usersService.create` ->
        // `auth.api.createUser`) or by `scripts/seed-initial-users.mjs`;
        // neither goes through the public sign-up endpoint.
        disableSignUp: true,
        requireEmailVerification: true,
        minPasswordLength: 8, // minimum 8 characters (default)
        maxPasswordLength: 128, // maximum 128 characters (default)
        sendResetPassword: async ({ user, token }) => {
            const urlWithToken = passwordResetUrl(token);
            const mail = renderMailTemplate('password-reset', {
                name: user.name,
                resetUrl: urlWithToken,
            });
            await sendMail(user.email, mail.subject, mail.html, { text: mail.text });
        },
        resetPasswordTokenExpiresIn: 60 * 60 * 24, // 24 hours
    },
    session: {
        expiresIn: 60 * 60 * 24 * 30, // 30 days
        updateAge: 60 * 60 * 24 * 7, // Update session after 7 days
    },
    emailVerification: {
        expiresIn: 60 * 60 * 24, // 24 hours
        sendVerificationEmail: async ({ user, url }) => {
            const mail = renderMailTemplate('email-verification', {
                name: user.name,
                verificationUrl: url,
            });
            await sendMail(user.email, mail.subject, mail.html, { text: mail.text });
        },
    },
    hooks: {
        // Keep the admin plugin endpoints server-only, and refuse
        // password-reset emails for banned accounts.
        before: createAuthMiddleware(async (ctx) => {
            if (isBlockedAuthEndpoint(ctx.path, Boolean(ctx.request))) {
                throw new APIError("FORBIDDEN", {
                    message: "This endpoint is not available.",
                    code: "FORBIDDEN",
                });
            }

            if (ctx.path === "/request-password-reset") {
                const email = typeof ctx.body?.email === "string"
                    ? ctx.body.email.trim().toLowerCase()
                    : "";

                if (!email) {
                    return;
                }

                const targetUser = await ctx.context.internalAdapter.findUserByEmail(email, {
                    includeAccounts: true,
                });

                if (targetUser?.user?.banned) {
                    throw new APIError("FORBIDDEN", {
                        message: "Il tuo account è stato sospeso. Contatta l'amministratore.",
                        code: "BANNED_USER",
                    });
                }
            }
        }),
        // Replace Better Auth's English error messages with Italian ones.
        after: createAuthMiddleware(async (ctx) => {
            // Check if the operation returned an error
            const error = ctx.context.returned;

            if (error instanceof APIError) {
                // Look for the translation using the error code
                const code = error.body?.code || error.body?.message;
                const translatedMessage = AUTH_ERROR_TRANSLATE[code];

                // If a translation exists, throw a new error with the Italian text
                if (translatedMessage) {
                    throw new APIError(error.status, {
                        ...error.body,
                        message: translatedMessage, // Overwrite with Italian
                    });
                }

                // If no translation found, rethrow the original
                throw error;
            }
        }),
    },
    plugins: [
        adminPlugin({
            ac,
            roles: {
                admin,
                professor,
                student,
            },
            adminRoles: ["admin"],
            defaultRole: "student",
        }),
        haveIBeenPwned({
            customPasswordCompromisedMessage: "La password che hai scelto è stata esposta in una violazione dei dati. Per la tua sicurezza, ti consigliamo di scegliere una password diversa."
        }),
        sveltekitCookies(getRequestEvent),
    ],
    advanced: {
        database: {
            generateId: "serial",
        },
        cookiePrefix: "polito_manuri_sanna_auth_",
    },
});

// Keyed by Better Auth error code (or raw message as fallback). Declared after
// `auth` on purpose: it is only read inside the `after` hook at request time,
// so the temporal dead zone is never hit.
const AUTH_ERROR_TRANSLATE = {
    // Sign Up / Registration
    "USER_ALREADY_EXISTS": "Esiste già un utente con questa email.",
    "EMAIL_TAKEN": "Questa email è già in uso.",
    "USERNAME_TAKEN": "Questo nome utente è già in uso.",
    "INVALID_EMAIL": "Indirizzo email non valido.",
    "INVALID_PASSWORD": "La password non è valida (troppo corta o debole).",
    "PASSWORD_COMPROMISED": "La password è stata compromessa in una violazione dei dati. Scegline un'altra.",

    // Login / Authentication
    "INVALID_EMAIL_OR_PASSWORD": "Email o password non corretti.",
    "USER_NOT_FOUND": "Utente non trovato.",
    "INCORRECT_PASSWORD": "Password non corretta.",
    "ACCOUNT_NOT_VERIFIED": "Devi verificare la tua email prima di accedere.",
    "EMAIL_NOT_VERIFIED": "Email non verificata.",

    // Tokens & Sessions
    "INVALID_TOKEN": "Token non valido o scaduto.",
    "TOKEN_EXPIRED": "Il link è scaduto. Richiedine uno nuovo.",
    "SESSION_EXPIRED": "La sessione è scaduta. Effettua nuovamente il login.",

    // Admin / Permissions
    "FORBIDDEN": "Non hai i permessi necessari per eseguire questa azione.",
    "UNAUTHORIZED": "Accesso negato. Devi effettuare il login.",
    "ADMIN_ONLY": "Questa funzione è riservata agli amministratori.",

    // General / Server
    "INTERNAL_SERVER_ERROR": "Errore interno del server. Riprova più tardi.",
    "FAILED_TO_CREATE_USER": "Impossibile creare l'utente. Riprova.",
    "TOO_MANY_REQUESTS": "Troppi tentativi. Riprova tra qualche minuto.",
    "BAD_REQUEST": "Richiesta non valida.",
    "BANNED_USER": "Il tuo account è stato sospeso. Contatta l'amministratore.",
};
