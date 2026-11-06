import 'dotenv/config';
import postgres from 'postgres';
import { hashPassword } from 'better-auth/crypto';

const databaseUrl = process.env.DATABASE_URL;
const password = process.env.INITIAL_USERS_PASSWORD;

const initialUsers = [
	{
		role: 'professor',
		email: process.env.INITIAL_PROFESSOR_EMAIL,
		name: process.env.INITIAL_PROFESSOR_NAME || 'Initial',
		surname: process.env.INITIAL_PROFESSOR_SURNAME || 'Professor'
	},
	{
		role: 'admin',
		email: process.env.INITIAL_ADMIN_EMAIL,
		name: process.env.INITIAL_ADMIN_NAME || 'Initial',
		surname: process.env.INITIAL_ADMIN_SURNAME || 'Admin'
  },
  {
		role: 'student',
		email: process.env.INITIAL_STUDENT_EMAIL,
		name: process.env.INITIAL_STUDENT_NAME || 'Initial',
		surname: process.env.INITIAL_STUDENT_SURNAME || 'Studente'
	}
];

function fail(message) {
	console.error(`Bootstrap failed: ${message}`);
	process.exit(1);
}

if (!databaseUrl) fail('DATABASE_URL is required.');
if (!password) fail('INITIAL_USERS_PASSWORD is required.');
if (password.length < 8) fail('INITIAL_USERS_PASSWORD must contain at least 8 characters.');

for (const initialUser of initialUsers) {
	if (!initialUser.email) fail(`An email is required for the ${initialUser.role} account.`);
	initialUser.email = initialUser.email.trim().toLowerCase();
	if (!/^[^@\s]+@(?:[a-z0-9-]+\.)*polito\.it$/i.test(initialUser.email)) {
		fail(`${initialUser.email} is not a valid Politecnico di Torino email address.`);
	}
}

if (initialUsers[0].email === initialUsers[1].email) {
	fail('Professor and admin must use different email addresses.');
}

const sql = postgres(databaseUrl, { prepare: false, max: 1 });

/**
 * Create or update one bootstrap account directly in the Better Auth tables,
 * bypassing the sign-up flow: the user is marked verified and unbanned, and
 * its `credential` account row gets the new password hash. Matching is by
 * lower-cased email, so rerunning the script never creates duplicates.
 */
async function upsertCredentialUser(transaction, initialUser, passwordHash) {
	const existing = await transaction`
		SELECT "id"
		FROM "user"
		WHERE lower("email") = ${initialUser.email}
		LIMIT 1
	`;

	let userId;
	let action;

	if (existing.length) {
		userId = existing[0].id;
		action = 'updated';
		await transaction`
			UPDATE "user"
			SET
				"name" = ${initialUser.name},
				"surname" = ${initialUser.surname},
				"role" = ${initialUser.role}::"app_user_role",
				"emailVerified" = true,
				"banned" = false,
				"banReason" = NULL,
				"banExpires" = NULL,
				"updatedAt" = now()
			WHERE "id" = ${userId}
		`;
	} else {
		const inserted = await transaction`
			INSERT INTO "user" (
				"name", "surname", "email", "emailVerified", "role",
				"first_access", "banned", "createdAt", "updatedAt"
			) VALUES (
				${initialUser.name}, ${initialUser.surname}, ${initialUser.email}, true,
				${initialUser.role}::"app_user_role", false, false, now(), now()
			)
			RETURNING "id"
		`;
		userId = inserted[0].id;
		action = 'created';
	}

	const accountId = String(userId);
	await transaction`
		INSERT INTO "account" (
			"userId", "accountId", "providerId", "password", "createdAt", "updatedAt"
		) VALUES (
			${userId}, ${accountId}, 'credential', ${passwordHash}, now(), now()
		)
		ON CONFLICT ("providerId", "accountId")
		DO UPDATE SET
			"userId" = EXCLUDED."userId",
			"password" = EXCLUDED."password",
			"updatedAt" = now()
	`;

	return { ...initialUser, id: userId, action };
}

try {
	const passwordHash = await hashPassword(password);
	const results = await sql.begin(async (transaction) => {
		const createdUsers = [];
		for (const initialUser of initialUsers) {
			createdUsers.push(await upsertCredentialUser(transaction, initialUser, passwordHash));
		}
		return createdUsers;
	});

	for (const result of results) {
		console.log(`${result.role}: ${result.email} (${result.action}, id ${result.id}, verified)`);
	}
	console.log('Initial access accounts are ready.');
} catch (error) {
	console.error('Bootstrap failed:', error instanceof Error ? error.message : error);
	process.exitCode = 1;
} finally {
	await sql.end();
}
