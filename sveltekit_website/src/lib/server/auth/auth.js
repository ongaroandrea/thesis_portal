import 'dotenv/config'; // Loads .env file
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";
import { db } from '$lib/server/db';
import * as schema from "$lib/server/db/schema.js";
import { admin } from "better-auth/plugins"
import { APIError } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { sendMail } from "../mail/mailer.js";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";
import { haveIBeenPwned } from "better-auth/plugins"

const statement = {
    ...defaultStatements,
    project: ["create", "share", "update", "delete"],
}

const ac = createAccessControl(statement);

export const developer = ac.newRole({
    project: ["create", "update", "delete", "share"],
    ...adminAc.statements,
});

export const professor = ac.newRole({
    project: ["create", "update", "delete", "share"],
});

const student = ac.newRole({
    project: ["create", "update"],
});



export const auth = betterAuth({
    appName: "Image Evaluator",
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
                input: true
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
        requireEmailVerification: true,
        emailVerification: {
            required: true,
            tokenExpiration: 60 * 60 * 24, // 24 hours
        },
        minPasswordLength: 8, // minimum 8 characters (default)
        maxPasswordLength: 128, // maximum 128 characters (default)
        sendResetPassword: async ({ user, url, token }) => {
            const urlWithToken = process.env.BETTER_AUTH_URL + `/auth/verifica-password?token=${token}&callbackUrl=` + encodeURIComponent(process.env.BETTER_AUTH_CLIENT_URL || 'http://localhost:5173');
            console.log(`Reset Password URL: ${urlWithToken}`);
            console.log(user.email);
            const mail = renderMailTemplate('password-reset', {
                name: user.name,
                resetUrl: urlWithToken,
            });
            await sendMail(user.email, mail.subject, mail.html, { text: mail.text });
        },
        resetPasswordTokenExpiresIn: 60 * 60 * 24, // 1 hour
        sendResetPasswordEmail: async ({ user, url, token }, request) => {
            if (process.env.NODE_ENV === "development") {
                console.log(`Reset Password URL (dev mode): ${url}`);
            } else {
                const urlWithToken = process.env.BETTER_AUTH_URL + `/auth/verifica-password?token=${token}&callbackUrl=` + encodeURIComponent(process.env.BETTER_AUTH_CLIENT_URL || 'http://localhost:5173');
                const mail = renderMailTemplate('password-reset', {
                    name: user.name,
                    resetUrl: urlWithToken,
                });
                await sendMail(user.email, mail.subject, mail.html, { text: mail.text });
            }
        },

    },
    session: {
        expiresIn: 60 * 60 * 24 * 30, // 30 days
        updateAge: 60 * 60 * 24 * 7, // Update session after 7 days
    },
    emailVerification: {
        sendVerificationEmail: async ({ user, url, token }, request) => {
            const urlWithToken = process.env.BETTER_AUTH_URL + `/auth/verifica-email?token=${token}&callbackUrl=` + encodeURIComponent(process.env.BETTER_AUTH_CLIENT_URL || 'http://localhost:5173');
            const mail = renderMailTemplate('email-verification', {
                name: user.name,
                verificationUrl: urlWithToken,
            });
            await sendMail(user.email, mail.subject, mail.html, { text: mail.text });
        },
    },
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
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
        admin({
            ac,
            roles: {
                developer,
                professor,
                student,
            },
            adminRoles: ["developer"],
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
        secret: process.env.BETTER_AUTH_SECRET,
        baseURL: process.env.BETTER_AUTH_URL,
    },
});

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
