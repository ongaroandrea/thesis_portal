import { n as activity, t as db } from "./db.js";
import { a as paginated, c as requiredText, i as optionalText, n as dateValue, o as paginationParams, r as numericId, s as requireUser, t as ApiError } from "./api.service.js";
import { t as courseService } from "./course.service.js";
import { r as DEFAULT_CORRECTION_FOCUS_IDS, t as CORRECTION_FOCUS_IDS } from "./correction-focus.js";
import { and, asc, count, eq, gte, isNull, lte, or } from "drizzle-orm";
// src/lib/server/services/activity.service.js
async function findActivity(id) {
	const [record] = await db.select().from(activity).where(eq(activity.id, numericId(id, "activityId"))).limit(1);
	if (!record) throw new ApiError(404, "Activity not found.", "ACTIVITY_NOT_FOUND");
	return record;
}
var publicActivitySelection = {
	id: activity.id,
	courseId: activity.courseId,
	createdByUserId: activity.createdByUserId,
	kind: activity.kind,
	status: activity.status,
	title: activity.title,
	description: activity.description,
	objective: activity.objective,
	durationMinutes: activity.durationMinutes,
	maxCorrectionsPerStudent: activity.maxCorrectionsPerStudent,
	allowedCorrectionFocuses: activity.allowedCorrectionFocuses,
	availableFrom: activity.availableFrom,
	availableUntil: activity.availableUntil,
	resultsReleasedAt: activity.resultsReleasedAt,
	displayOrder: activity.displayOrder,
	createdAt: activity.createdAt,
	updatedAt: activity.updatedAt
};
var isAvailable = (record, now = /* @__PURE__ */ new Date()) => record.status === "PUBLISHED" && (!record.availableFrom || record.availableFrom <= now) && (record.kind === "EXAM" || !record.availableUntil || record.availableUntil >= now);
function nullableDate(input, field) {
	if (input[field] === void 0) return void 0;
	return input[field] === null || input[field] === "" ? null : dateValue(input[field], field);
}
function optionalPositiveInteger(value, field) {
	if (value === void 0) return void 0;
	if (value === null || value === "") return null;
	const number = Number(value);
	if (!Number.isInteger(number) || number <= 0) throw new ApiError(400, `${field} must be a positive integer.`, "VALIDATION_ERROR");
	return number;
}
function activityValues(input, partial = false) {
	const values = {};
	if (!partial || input.title !== void 0) values.title = requiredText(input.title, "title", 200);
	if (!partial || input.objective !== void 0) values.objective = requiredText(input.objective, "objective", 1e4);
	const description = optionalText(input.description, "description", 2e4);
	if (description !== void 0) values.description = description;
	const promptAddendum = optionalText(input.promptAddendum, "promptAddendum", 8e3);
	if (promptAddendum !== void 0) values.promptAddendum = promptAddendum;
	if (!partial || input.kind !== void 0) {
		if (!["LESSON", "EXAM"].includes(input.kind)) throw new ApiError(400, "kind must be LESSON or EXAM.", "VALIDATION_ERROR");
		values.kind = input.kind;
	}
	if (input.status !== void 0) {
		if (![
			"DRAFT",
			"PUBLISHED",
			"ARCHIVED"
		].includes(input.status)) throw new ApiError(400, "Invalid activity status.", "VALIDATION_ERROR");
		values.status = input.status;
	}
	for (const field of [
		"availableFrom",
		"availableUntil",
		"resultsReleasedAt"
	]) {
		const value = nullableDate(input, field);
		if (value !== void 0) values[field] = value;
	}
	for (const field of ["durationMinutes", "maxCorrectionsPerStudent"]) {
		const value = optionalPositiveInteger(input[field], field);
		if (value !== void 0) values[field] = value;
	}
	if (!partial || input.allowedCorrectionFocuses !== void 0) {
		const focuses = input.allowedCorrectionFocuses ?? DEFAULT_CORRECTION_FOCUS_IDS;
		if (!Array.isArray(focuses) || focuses.length === 0 || focuses.some((focus) => !CORRECTION_FOCUS_IDS.has(focus))) throw new ApiError(400, "Select at least one valid correction topic.", "VALIDATION_ERROR");
		values.allowedCorrectionFocuses = [...new Set(focuses)];
	}
	if (input.displayOrder !== void 0) {
		const displayOrder = Number(input.displayOrder);
		if (!Number.isInteger(displayOrder)) throw new ApiError(400, "displayOrder must be an integer.", "VALIDATION_ERROR");
		values.displayOrder = displayOrder;
	}
	if (partial && Object.keys(values).length === 0) throw new ApiError(400, "No activity fields were provided.", "VALIDATION_ERROR");
	return values;
}
function validateActivity(values, existing = null) {
	const from = values.availableFrom === void 0 ? existing?.availableFrom : values.availableFrom;
	const until = values.availableUntil === void 0 ? existing?.availableUntil : values.availableUntil;
	const kind = values.kind ?? existing?.kind;
	const resultsReleasedAt = values.resultsReleasedAt === void 0 ? existing?.resultsReleasedAt : values.resultsReleasedAt;
	if (from && until && from >= until) throw new ApiError(400, "availableUntil must be later than availableFrom.", "INVALID_AVAILABILITY");
	if (kind === "EXAM" && !until) throw new ApiError(400, "An exam submission deadline is required.", "EXAM_DEADLINE_REQUIRED");
	if (resultsReleasedAt && kind !== "EXAM") throw new ApiError(400, "resultsReleasedAt is only valid for exams.", "VALIDATION_ERROR");
}
async function requireActivityAccess(id, currentUser) {
	requireUser(currentUser);
	const record = await findActivity(id);
	try {
		await courseService.requireCourseManager(record.courseId, currentUser);
		return record;
	} catch (error) {
		if (!(error instanceof ApiError) || error.status !== 403) throw error;
	}
	await courseService.requireCourseAccess(record.courseId, currentUser);
	if (!isAvailable(record)) throw new ApiError(403, "This activity is not currently available.", "ACTIVITY_NOT_AVAILABLE");
	return record;
}
var activityService = {
	findActivity,
	requireActivityAccess,
	async list(courseId, currentUser, searchParams) {
		requireUser(currentUser);
		const id = numericId(courseId, "courseId");
		const pagination = paginationParams(searchParams);
		try {
			await courseService.requireCourseManager(id, currentUser);
			const condition = eq(activity.courseId, id);
			const [items, [{ total }]] = await Promise.all([db.select().from(activity).where(condition).orderBy(asc(activity.displayOrder), asc(activity.id)).limit(pagination.pageSize).offset(pagination.offset), db.select({ total: count() }).from(activity).where(condition)]);
			return paginated(items, total, pagination);
		} catch (error) {
			if (!(error instanceof ApiError) || error.status !== 403) throw error;
		}
		await courseService.requireCourseAccess(id, currentUser);
		const now = /* @__PURE__ */ new Date();
		const condition = and(eq(activity.courseId, id), eq(activity.status, "PUBLISHED"), or(isNull(activity.availableFrom), lte(activity.availableFrom, now)), or(eq(activity.kind, "EXAM"), isNull(activity.availableUntil), gte(activity.availableUntil, now)));
		const [items, [{ total }]] = await Promise.all([db.select(publicActivitySelection).from(activity).where(condition).orderBy(asc(activity.displayOrder), asc(activity.id)).limit(pagination.pageSize).offset(pagination.offset), db.select({ total: count() }).from(activity).where(condition)]);
		return paginated(items, total, pagination);
	},
	async get(id, currentUser) {
		const record = await findActivity(id);
		try {
			await courseService.requireCourseManager(record.courseId, currentUser);
			return record;
		} catch (error) {
			if (!(error instanceof ApiError) || error.status !== 403) throw error;
		}
		await requireActivityAccess(id, currentUser);
		const [visible] = await db.select(publicActivitySelection).from(activity).where(eq(activity.id, record.id)).limit(1);
		return visible;
	},
	async create(input, currentUser) {
		const courseId = numericId(input.courseId, "courseId");
		await courseService.requireCourseManager(courseId, currentUser);
		const values = activityValues(input);
		validateActivity(values);
		const [created] = await db.insert(activity).values({
			...values,
			courseId,
			createdByUserId: numericId(currentUser.id, "userId")
		}).returning();
		return created;
	},
	async update(id, input, currentUser) {
		const record = await findActivity(id);
		await courseService.requireCourseManager(record.courseId, currentUser);
		const values = activityValues(input, true);
		if (values.promptAddendum !== void 0 && values.promptAddendum !== record.promptAddendum) {
			const now = /* @__PURE__ */ new Date();
			const examAlreadyStarted = record.kind === "EXAM" && record.availableFrom && record.availableFrom <= now;
			if (record.promptFrozenAt || examAlreadyStarted) throw new ApiError(409, "The exam prompt is frozen and can no longer be changed.", "EXAM_PROMPT_FROZEN");
			values.promptRevision = record.promptRevision + 1;
		}
		validateActivity(values, record);
		const [updated] = await db.update(activity).set({
			...values,
			updatedAt: /* @__PURE__ */ new Date()
		}).where(eq(activity.id, record.id)).returning();
		return updated;
	},
	async remove(id, currentUser) {
		const record = await findActivity(id);
		await courseService.requireCourseManager(record.courseId, currentUser);
		await db.delete(activity).where(eq(activity.id, record.id));
		return { id: record.id };
	}
};
export { activityService as t };
