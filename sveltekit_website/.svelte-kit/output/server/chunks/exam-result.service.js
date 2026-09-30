import { a as numericId, c as paginationParams, i as dateValue, l as requireUser, o as optionalText, r as ApiError, s as paginated } from "./handler.js";
import { h as user, l as courseMember, n as activity, t as db, u as examResult } from "./db.js";
import { t as courseService } from "./course.service.js";
import { t as activityService } from "./activity.service.js";
import { and, asc, count, eq, isNull, lte, or } from "drizzle-orm";
//#region src/lib/server/services/exam-result.service.js
var RESULT_STATUSES = /* @__PURE__ */ new Set([
	"DRAFT",
	"READY",
	"PUBLISHED"
]);
function scoreValue(value) {
	if (value === void 0) return void 0;
	if (value === null || value === "") return null;
	const score = Number(value);
	if (!Number.isFinite(score) || score < 0 || score > 30) throw new ApiError(400, "score must be between 0 and 30.", "VALIDATION_ERROR");
	return score.toFixed(2);
}
function statusValue(value, fallback = "DRAFT") {
	const status = value ?? fallback;
	if (!RESULT_STATUSES.has(status)) throw new ApiError(400, "status must be DRAFT, READY, or PUBLISHED.", "VALIDATION_ERROR");
	return status;
}
async function findResult(id) {
	const [record] = await db.select({
		id: examResult.id,
		activityId: examResult.activityId,
		studentUserId: examResult.studentUserId,
		gradedByUserId: examResult.gradedByUserId,
		status: examResult.status,
		score: examResult.score,
		feedback: examResult.feedback,
		publishedAt: examResult.publishedAt,
		createdAt: examResult.createdAt,
		updatedAt: examResult.updatedAt,
		courseId: activity.courseId,
		activityKind: activity.kind,
		resultsReleasedAt: activity.resultsReleasedAt
	}).from(examResult).innerJoin(activity, eq(activity.id, examResult.activityId)).where(eq(examResult.id, numericId(id, "resultId"))).limit(1);
	if (!record) throw new ApiError(404, "Exam result not found.", "EXAM_RESULT_NOT_FOUND");
	return record;
}
async function isCourseManager(courseId, currentUser) {
	try {
		await courseService.requireCourseManager(courseId, currentUser);
		return true;
	} catch (error) {
		if (error instanceof ApiError && error.status === 403) return false;
		throw error;
	}
}
function isReleased(record, now = /* @__PURE__ */ new Date()) {
	return record.status === "PUBLISHED" && record.publishedAt != null && record.publishedAt <= now && (!record.resultsReleasedAt || record.resultsReleasedAt <= now);
}
async function requireExamActivity(activityId, currentUser) {
	const record = await activityService.findActivity(activityId);
	if (record.kind !== "EXAM") throw new ApiError(400, "Results can only be recorded for exam activities.", "RESULT_REQUIRES_EXAM");
	await courseService.requireCourseManager(record.courseId, currentUser);
	return record;
}
async function requireActiveStudent(courseId, studentUserId) {
	const [membership] = await db.select({ id: courseMember.id }).from(courseMember).where(and(eq(courseMember.courseId, courseId), eq(courseMember.userId, studentUserId), eq(courseMember.role, "STUDENT"), eq(courseMember.status, "ACTIVE"))).limit(1);
	if (!membership) throw new ApiError(400, "The selected user is not an active student in this course.", "RESULT_STUDENT_NOT_ENROLLED");
}
async function requireResultAccess(id, currentUser) {
	requireUser(currentUser);
	const record = await findResult(id);
	if (await isCourseManager(record.courseId, currentUser)) return record;
	if (currentUser.role !== "student" || record.studentUserId !== numericId(currentUser.id, "userId")) throw new ApiError(403, "You cannot access this exam result.", "EXAM_RESULT_ACCESS_DENIED");
	await courseService.requireCourseAccess(record.courseId, currentUser);
	if (!isReleased(record)) throw new ApiError(403, "This exam result has not been released.", "EXAM_RESULT_NOT_RELEASED");
	return record;
}
function resultValues(input, existing = null) {
	const values = {};
	const score = scoreValue(input.score);
	if (score !== void 0) values.score = score;
	if (input.feedback !== void 0) values.feedback = optionalText(input.feedback, "feedback", 2e4) || null;
	if (input.status !== void 0 || !existing) values.status = statusValue(input.status, existing?.status);
	const status = values.status ?? existing?.status;
	if (input.publishedAt !== void 0) values.publishedAt = input.publishedAt === null || input.publishedAt === "" ? null : dateValue(input.publishedAt, "publishedAt");
	if (status === "PUBLISHED") values.publishedAt ??= existing?.publishedAt ?? /* @__PURE__ */ new Date();
	else if (values.status !== void 0) values.publishedAt = null;
	return values;
}
var examResultService = {
	findResult,
	async list(activityId, currentUser, searchParams) {
		requireUser(currentUser);
		const activityRecord = await activityService.findActivity(activityId);
		if (activityRecord.kind !== "EXAM") throw new ApiError(400, "Results are only available for exams.", "RESULT_REQUIRES_EXAM");
		const pagination = paginationParams(searchParams);
		const manager = await isCourseManager(activityRecord.courseId, currentUser);
		const conditions = [eq(examResult.activityId, activityRecord.id)];
		if (!manager) {
			await courseService.requireCourseAccess(activityRecord.courseId, currentUser);
			if (currentUser.role !== "student") throw new ApiError(403, "You cannot list these exam results.", "EXAM_RESULT_ACCESS_DENIED");
			const now = /* @__PURE__ */ new Date();
			conditions.push(eq(examResult.studentUserId, numericId(currentUser.id, "userId")), eq(examResult.status, "PUBLISHED"), lte(examResult.publishedAt, now), or(isNull(activity.resultsReleasedAt), lte(activity.resultsReleasedAt, now)));
		}
		const condition = and(...conditions);
		const selection = {
			id: examResult.id,
			activityId: examResult.activityId,
			studentUserId: examResult.studentUserId,
			studentName: user.name,
			studentSurname: user.surname,
			status: examResult.status,
			score: examResult.score,
			feedback: examResult.feedback,
			publishedAt: examResult.publishedAt,
			gradedByUserId: examResult.gradedByUserId,
			createdAt: examResult.createdAt,
			updatedAt: examResult.updatedAt
		};
		const [items, [{ total }]] = await Promise.all([db.select(selection).from(examResult).innerJoin(activity, eq(activity.id, examResult.activityId)).innerJoin(user, eq(user.id, examResult.studentUserId)).where(condition).orderBy(asc(user.surname), asc(user.name), asc(examResult.id)).limit(pagination.pageSize).offset(pagination.offset), db.select({ total: count() }).from(examResult).innerJoin(activity, eq(activity.id, examResult.activityId)).where(condition)]);
		return paginated(items, total, pagination);
	},
	get: requireResultAccess,
	async create(input, currentUser) {
		requireUser(currentUser);
		const activityRecord = await requireExamActivity(input.activityId, currentUser);
		const studentUserId = numericId(input.studentUserId, "studentUserId");
		await requireActiveStudent(activityRecord.courseId, studentUserId);
		const [created] = await db.insert(examResult).values({
			...resultValues(input),
			activityId: activityRecord.id,
			studentUserId,
			gradedByUserId: numericId(currentUser.id, "userId")
		}).returning();
		return created;
	},
	async update(id, input, currentUser) {
		requireUser(currentUser);
		const record = await findResult(id);
		await courseService.requireCourseManager(record.courseId, currentUser);
		const values = resultValues(input, record);
		if (Object.keys(values).length === 0) throw new ApiError(400, "No result fields were provided.", "VALIDATION_ERROR");
		const [updated] = await db.update(examResult).set({
			...values,
			gradedByUserId: numericId(currentUser.id, "userId"),
			updatedAt: /* @__PURE__ */ new Date()
		}).where(eq(examResult.id, record.id)).returning();
		return updated;
	},
	async remove(id, currentUser) {
		requireUser(currentUser);
		const record = await findResult(id);
		await courseService.requireCourseManager(record.courseId, currentUser);
		await db.delete(examResult).where(eq(examResult.id, record.id));
		return { id: record.id };
	}
};
//#endregion
export { examResultService as t };
