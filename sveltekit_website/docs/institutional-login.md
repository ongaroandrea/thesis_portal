# Institutional login (future work)

Status: not implemented. This document records the design for restricting access to Politecnico di Torino accounts, so it can be picked up later.

## Current state

Authentication lives entirely in SvelteKit, using Better Auth (`src/lib/server/auth/auth.js`). The Python API has no user accounts; the website calls it with HMAC-signed requests.

- Email and password login, with required email verification. Passwords are hashed by Better Auth (scrypt) and stored in `account.password`.
- Sessions are database rows (`session` table) referenced by a cookie with the prefix `polito_manuri_sanna_auth_`. They last 30 days and are refreshed every 7. There is no JWT.
- `src/hooks.server.js` loads the session on every request into `locals.user` / `locals.session`. The route groups `(protected)` and `(protected)/(professore)` guard pages by login and role.
- Roles are `admin`, `professor` and `student` (`app_user_role`, default `student`), set through the Better Auth `admin` plugin.
- Users are created by admins (`usersService.create`), by `scripts/seed-initial-users.mjs`, or matched from course email imports. `course-import.service.js` only accepts `*.polito.it` addresses.
- The `account` table already has `(providerId, accountId)` and token columns, so linking an SSO identity needs no schema change.

Public self sign-up has been disabled (`emailAndPassword.disableSignUp: true`). Keep it disabled whatever option is chosen below.

## Options

1. SAML 2.0 through the PoliTo identity provider (IDEM-GARR federation, Shibboleth). This is the official university identity, and it releases `eduPersonPrincipalName`, `mail`, `givenName`, `sn` and `eduPersonAffiliation`. Implement it with the `@better-auth/sso` plugin. Registering with the federation takes paperwork and time.
2. OIDC with Microsoft Entra ID, if PoliTo exposes its Microsoft 365 tenant. Use Better Auth `socialProviders.microsoft` with `tenantId` pinned, or `@better-auth/sso` in OIDC mode. It is faster to obtain, but affiliation (student or staff) is usually not released, so roles have to be inferred.
3. Domain restriction only: keep passwords and reject emails outside `polito.it` / `studenti.polito.it` in a `databaseHooks.user.create.before` hook. It takes a few lines and needs nothing from IT, but it is not SSO.

Recommendation: option 1, with option 2 as the fallback if IT offers it faster. Option 3 should be added anyway as defence in depth.

## Implementation plan (option 1)

1. Dependency and config
   - `npm i @better-auth/sso` in `sveltekit_website/`.
   - New variables in `docker.env.example`, `.env.sample` and the `web` service in `compose.yaml`: `SSO_PROVIDER_ID=polito`, `SAML_IDP_METADATA_URL`, `SAML_SP_ENTITY_ID`, `SAML_SP_CERT`, `SAML_SP_KEY`, `ALLOWED_EMAIL_DOMAINS=polito.it,studenti.polito.it`, `ENABLE_PASSWORD_LOGIN=false`, `BREAKGLASS_ADMIN_EMAIL`.

2. `src/lib/server/auth/auth.js`
   - Add `sso()` to `plugins` and register the PoliTo provider:
     - IdP entityID, SSO URL and signing certificate.
     - SP entityID and ACS URL.
     - `wantAssertionsSigned: true`.
     - Attribute mapping.
   - The plugin serves the sign-in redirect, the ACS callback (`/api/auth/sso/saml2/callback/:providerId`) and the SP metadata.
   - In `hooks.before`, allow `/sign-in/email` and `/request-password-reset` only when `ENABLE_PASSWORD_LOGIN` is true or the email is `BREAKGLASS_ADMIN_EMAIL`. Keep one local admin for emergencies, ideally with the `twoFactor` plugin.
   - `databaseHooks.user.create.before`: reject emails outside `ALLOWED_EMAIL_DOMAINS`.
   - `account.accountLinking: { enabled: true, trustedProviders: ["polito"] }`, so users already created by an admin or an import are linked by email instead of duplicated.

3. User creation on first login and role mapping
   - `account.accountId` is the ePPN, which is stable; `mail` can change. `user.email` is `mail` in lower case. `name` is `givenName` and `surname` is `sn`. Set `emailVerified = true`.
   - `eduPersonAffiliation`:
     - Only `student` means role `student`.
     - `faculty`, `staff` or `employee` means `professor`, but only if the email is on an admin-maintained allow-list. Otherwise `student`, and an admin promotes them.
     - `admin` is never assigned from SSO.
   - Set the role only when the user is created. Never overwrite a role an admin changed by hand.

4. Course invitations
   - On user creation, match open `course_invitation` rows by `lower(email)`, set `matched_user_id` / `accepted_at`, and insert active STUDENT `course_member` rows.
   - Move this logic out of `course-import.service.js` into a shared function, so both paths use it.

5. Sessions: nothing to build. After a successful callback Better Auth creates its normal session and cookie, so `hooks.server.js`, the layouts and `locals.user.role` keep working. Use `callbackURL: "/corsi"`, keep `trustedOrigins` same-origin, and remove the `localhost` entries in production.

6. Logout: keep `authClient.signOut()`. Add SAML Single Logout only if IT requires it.

7. Frontend
   - Add `ssoClient()` to `src/lib/client/auth/auth-client.js`.
   - On `src/routes/(public)/login/+page.svelte`, add a primary "Accedi con account PoliTo" button calling `authClient.signIn.sso({ providerId: "polito", callbackURL: "/corsi" })`.
   - Show the email/password form only when `ENABLE_PASSWORD_LOGIN` is true, passed from `(public)/login/+layout.server.js`.
   - Hide the forgotten-password page for SSO users.
   - Add i18n keys in `src/lib/i18n.js`.

8. Admin flows: `usersService.create` should stop generating temporary passwords for institutional addresses. Users are pre-created without a password and linked at their first SSO login.

9. Tests
   - Unit tests for role mapping and domain checks.
   - Integration test against a test IdP: the IDEM test federation, or a development-only SimpleSAMLphp/Keycloak container in `compose.yaml`.

## What to ask PoliTo IT

- Whether they prefer SAML through IDEM or an Entra ID (OIDC) app registration.
- For SAML:
  - SP registration (entityID, ACS URL, SP metadata with certificate, technical and administrative contacts).
  - Release of `eduPersonPrincipalName` (or `pairwise-id`), `mail`, `givenName`, `sn`, `eduPersonAffiliation` / `eduPersonScopedAffiliation`, and optionally a group or entitlement for teaching staff.
  - The IdP metadata URL and signing certificate.
  - A test IdP or test accounts (one student, one teacher).
  - Their Single Logout policy.
- For OIDC:
  - Tenant ID, client ID and secret.
  - Redirect URI registration.
  - Which claims are released (`email`, `upn`, groups).
  - Whether access can be limited to assigned users or groups.
- In both cases, the production hostname with HTTPS. Better Auth `baseURL` must be the public HTTPS URL.

## Security checklist

- SAML:
  - Require signed assertions and validate them against the IdP certificate from signed federation metadata.
  - Check `Audience`, `Destination`/`Recipient`, `NotBefore`/`NotOnOrAfter` and `InResponseTo`.
  - Reject replayed assertion IDs.
  - Use the library's XML handling; never parse by hand.
- OIDC:
  - Validate `iss` and `tid` against the PoliTo tenant (never `common` without a tenant check), plus `aud`, `nonce`, `state` and PKCE.
- Redirects: allow only same-origin `callbackURL` / `RelayState`.
- Attributes:
  - Identify users by scoped ePPN (`@polito.it`).
  - Enforce the email domain on the server.
  - Never grant `admin` from IdP attributes.
- Rate-limit `/sign-in/*`.
- Consider shorter sessions for staff accounts.
