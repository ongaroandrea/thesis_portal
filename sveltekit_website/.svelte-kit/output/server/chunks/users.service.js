import { b as user, d as courseMember, t as db, v as session } from "./db.js";
import { a as paginated, c as requiredText, i as optionalText, n as dateValue, o as paginationParams, r as numericId, s as requireUser, t as ApiError } from "./api.service.js";
import { n as normalizeNameForStorage } from "./text.js";
import { and, asc, count, countDistinct, eq, inArray } from "drizzle-orm";
import { randomBytes } from "node:crypto";
// src/lib/server/services/users.service.js
var PUBLIC_USER_FIELDS = {
	id: user.id,
	name: user.name,
	surname: user.surname,
	email: user.email,
	emailVerified: user.emailVerified,
	image: user.image,
	role: user.role,
	firstAccess: user.first_access,
	banned: user.banned,
	banReason: user.banReason,
	banExpires: user.banExpires,
	createdAt: user.createdAt,
	updatedAt: user.updatedAt
};
async function findUser(id) {
	const [record] = await db.select(PUBLIC_USER_FIELDS).from(user).where(eq(user.id, numericId(id, "userId"))).limit(1);
	if (!record) throw new ApiError(404, "User not found.", "USER_NOT_FOUND");
	return record;
}
async function managedCourseIds(currentUser) {
	if (currentUser.role !== "professor") return [];
	return (await db.select({ courseId: courseMember.courseId }).from(courseMember).where(and(eq(courseMember.userId, numericId(currentUser.id, "userId")), eq(courseMember.role, "PROFESSOR"), eq(courseMember.status, "ACTIVE")))).map((membership) => membership.courseId);
}
async function canReadUser(targetId, currentUser) {
	if (currentUser.role === "admin" || numericId(currentUser.id, "userId") === targetId) return true;
	const courseIds = await managedCourseIds(currentUser);
	if (courseIds.length === 0) return false;
	const [membership] = await db.select({ id: courseMember.id }).from(courseMember).where(and(inArray(courseMember.courseId, courseIds), eq(courseMember.userId, targetId))).limit(1);
	return Boolean(membership);
}
function authApiError(error, fallbackMessage) {
	const status = Number(error?.statusCode ?? error?.status ?? 500);
	const message = error?.body?.message ?? error?.message ?? fallbackMessage;
	const code = error?.body?.code ?? "AUTH_OPERATION_FAILED";
	return new ApiError(status >= 400 && status <= 599 ? status : 500, message, code);
}
function generateTemporaryPassword() {
	return `T!${randomBytes(12).toString("base64url")}7a`;
}
async function authApi() {
	const { auth } = await import("./auth2.js");
	return auth.api;
}
function nullableText(value, field, maxLength) {
	if (value === void 0) return void 0;
	if (value === null || value === "") return null;
	return optionalText(value, field, maxLength);
}
function updateValues(input, admin) {
	const values = {};
	if (input.name !== void 0) values.name = normalizeNameForStorage(requiredText(input.name, "name", 100));
	if (input.surname !== void 0) values.surname = normalizeNameForStorage(String(input.surname ?? "").trim());
	const image = nullableText(input.image, "image", 2e3);
	if (image !== void 0) values.image = image;
	if (admin) {
		if (input.role !== void 0) {
			if (![
				"admin",
				"professor",
				"student"
			].includes(input.role)) throw new ApiError(400, "role must be admin, professor, or student.", "VALIDATION_ERROR");
			values.role = input.role;
		}
		for (const field of [
			"emailVerified",
			"firstAccess",
			"banned"
		]) if (input[field] !== void 0) {
			if (typeof input[field] !== "boolean") throw new ApiError(400, `${field} must be a boolean.`, "VALIDATION_ERROR");
			values[field === "firstAccess" ? "first_access" : field] = input[field];
		}
		const banReason = nullableText(input.banReason, "banReason", 1e3);
		if (banReason !== void 0) values.banReason = banReason;
		if (input.banExpires !== void 0) values.banExpires = input.banExpires === null || input.banExpires === "" ? null : dateValue(input.banExpires, "banExpires");
	}
	if (Object.keys(values).length === 0) throw new ApiError(400, "No editable user fields were provided.", "VALIDATION_ERROR");
	return values;
}
var userService = {
	findUser,
	async list(currentUser, searchParams) {
		requireUser(currentUser);
		const pagination = paginationParams(searchParams);
		if (currentUser.role === "admin") {
			const [items, [{ total }]] = await Promise.all([db.select(PUBLIC_USER_FIELDS).from(user).orderBy(asc(user.surname), asc(user.name), asc(user.id)).limit(pagination.pageSize).offset(pagination.offset), db.select({ total: count() }).from(user)]);
			return paginated(items, total, pagination);
		}
		const courseIds = await managedCourseIds(currentUser);
		if (courseIds.length === 0) throw new ApiError(403, "Only admins or authorized course professors can list users.", "USER_LIST_DENIED");
		const condition = inArray(courseMember.courseId, courseIds);
		const [items, [{ total }]] = await Promise.all([db.selectDistinct(PUBLIC_USER_FIELDS).from(user).innerJoin(courseMember, eq(courseMember.userId, user.id)).where(condition).orderBy(asc(user.surname), asc(user.name), asc(user.id)).limit(pagination.pageSize).offset(pagination.offset), db.select({ total: countDistinct(user.id) }).from(user).innerJoin(courseMember, eq(courseMember.userId, user.id)).where(condition)]);
		return paginated(items, total, pagination);
	},
	async get(id, currentUser) {
		requireUser(currentUser);
		const targetId = numericId(id, "userId");
		if (!await canReadUser(targetId, currentUser)) throw new ApiError(403, "You cannot access this user.", "USER_ACCESS_DENIED");
		return findUser(targetId);
	},
	async create(input, currentUser, headers) {
		requireUser(currentUser);
		if (currentUser.role !== "admin") throw new ApiError(403, "Only an admin can create user accounts.", "USER_CREATE_DENIED");
		const email = requiredText(input.email, "email", 320).toLowerCase();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "email must be valid.", "VALIDATION_ERROR");
		const temporaryPassword = generateTemporaryPassword();
		const role = input.role ?? "student";
		if (![
			"admin",
			"professor",
			"student"
		].includes(role)) throw new ApiError(400, "role must be admin, professor, or student.", "VALIDATION_ERROR");
		try {
			return {
				user: (await (await authApi()).createUser({
					headers,
					body: {
						email,
						password: temporaryPassword,
						name: normalizeNameForStorage(requiredText(input.name, "name", 100)),
						role,
						data: { surname: normalizeNameForStorage(String(input.surname ?? "").trim()) }
					}
				})).user,
				temporaryPassword
			};
		} catch (error) {
			throw authApiError(error, "Unable to create the user.");
		}
	},
	async update(id, input, currentUser) {
		requireUser(currentUser);
		const targetId = numericId(id, "userId");
		const admin = currentUser.role === "admin";
		if (!admin && targetId !== numericId(currentUser.id, "userId")) throw new ApiError(403, "You can only update your own profile.", "USER_UPDATE_DENIED");
		await findUser(targetId);
		const values = updateValues(input, admin);
		const [updated] = await db.transaction(async (tx) => {
			const records = await tx.update(user).set({
				...values,
				updatedAt: /* @__PURE__ */ new Date()
			}).where(eq(user.id, targetId)).returning(PUBLIC_USER_FIELDS);
			if (values.banned === true) await tx.delete(session).where(eq(session.userId, targetId));
			return records;
		});
		return updated;
	},
	async remove(id, currentUser, headers) {
		requireUser(currentUser);
		if (currentUser.role !== "admin") throw new ApiError(403, "Only an admin can delete user accounts.", "USER_DELETE_DENIED");
		const targetId = numericId(id, "userId");
		if (targetId === numericId(currentUser.id, "userId")) throw new ApiError(400, "You cannot delete your own account from this endpoint.", "SELF_DELETE_DENIED");
		await findUser(targetId);
		try {
			await (await authApi()).removeUser({
				headers,
				body: { userId: String(targetId) }
			});
			return { id: targetId };
		} catch (error) {
			if (error?.code === "23503") throw new ApiError(409, "The user still owns records that prevent deletion.", "USER_DELETE_CONFLICT");
			throw authApiError(error, "Unable to delete the user.");
		}
	}
};
export { userService as t };
