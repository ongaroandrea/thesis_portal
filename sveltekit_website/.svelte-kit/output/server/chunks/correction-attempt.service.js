import { a as numericId, c as paginationParams, i as dateValue, l as requireUser, o as optionalText, r as ApiError, s as paginated, u as requiredText } from "./handler.js";
import { a as correctionSession, i as correctionAttempt, n as activity, t as db } from "./db.js";
import { t as CORRECTION_FOCUS_IDS } from "./correction-focus.js";
import { t as correctionSessionService } from "./correction-session.service.js";
import { and, asc, count, eq, max, sql } from "drizzle-orm";
//#region src/lib/server/services/correction-attempt.service.js
var VIEW_TYPES = /* @__PURE__ */ new Set([
	"FRONT",
	"SIDE",
	"TOP",
	"ANGLED",
	"OTHER"
]);
var JOB_STATUSES = /* @__PURE__ */ new Set([
	"queued",
	"processing",
	"completed",
	"failed",
	"unavailable"
]);
function jobStatus(value) {
	if (value === void 0 || value === null || value === "") return null;
	const status = requiredText(value, "jobStatus", 20);
	if (!JOB_STATUSES.has(status)) throw new ApiError(400, "Invalid job status.", "VALIDATION_ERROR");
	return status;
}
function scoreValue(value) {
	if (value === void 0) return void 0;
	if (value === null || value === "") return null;
	const score = Number(value);
	if (!Number.isFinite(score) || score < 0 || score > 30) throw new ApiError(400, "score must be between 0 and 30.", "VALIDATION_ERROR");
	return score.toFixed(2);
}
async function findAttempt(id) {
	const [record] = await db.select().from(correctionAttempt).where(eq(correctionAttempt.id, numericId(id, "attemptId"))).limit(1);
	if (!record) throw new ApiError(404, "Correction attempt not found.", "CORRECTION_ATTEMPT_NOT_FOUND");
	return record;
}
async function requireAttemptAccess(id, currentUser) {
	requireUser(currentUser);
	const record = await findAttempt(id);
	await correctionSessionService.requireSessionAccess(record.sessionId, currentUser);
	return record;
}
var correctionAttemptService = {
	findAttempt,
	async list(sessionId, currentUser, searchParams) {
		const sessionRecord = await correctionSessionService.requireSessionAccess(sessionId, currentUser);
		const pagination = paginationParams(searchParams);
		const condition = eq(correctionAttempt.sessionId, sessionRecord.id);
		const [items, [{ total }]] = await Promise.all([db.select().from(correctionAttempt).where(condition).orderBy(asc(correctionAttempt.attemptNumber)).limit(pagination.pageSize).offset(pagination.offset), db.select({ total: count() }).from(correctionAttempt).where(condition)]);
		return paginated(items, total, pagination);
	},
	get: requireAttemptAccess,
	async create(input, currentUser) {
		requireUser(currentUser);
		const sessionRecord = await correctionSessionService.requireSessionAccess(input.sessionId, currentUser);
		if (sessionRecord.studentUserId !== numericId(currentUser.id, "userId")) throw new ApiError(403, "Only the session owner can submit a correction.", "CORRECTION_ATTEMPT_CREATE_DENIED");
		if (sessionRecord.status === "FAILED") throw new ApiError(409, "Attempts cannot be added to this correction session.", "CORRECTION_SESSION_CLOSED");
		const focus = requiredText(input.focus, "focus", 100);
		if (!CORRECTION_FOCUS_IDS.has(focus) || focus !== sessionRecord.analysisFocus) throw new ApiError(409, "The analysis focus does not match this correction session.", "CONVERSATION_SETTINGS_LOCKED");
		const viewType = requiredText(input.viewType, "viewType", 20);
		if (!VIEW_TYPES.has(viewType)) throw new ApiError(400, "Invalid view type.", "VALIDATION_ERROR");
		const referenceImageId = numericId(input.referenceImageId, "referenceImageId");
		if (referenceImageId !== sessionRecord.referenceImageId) throw new ApiError(409, "The reference image does not match this correction session.", "CONVERSATION_SETTINGS_LOCKED");
		return db.transaction(async (tx) => {
			const lockKey = `activity-correction-limit:${sessionRecord.activityId}:${sessionRecord.studentUserId}`;
			await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
			const [limitRecord] = await tx.select({ limit: activity.maxCorrectionsPerStudent }).from(activity).where(eq(activity.id, sessionRecord.activityId)).limit(1);
			if (limitRecord?.limit != null) {
				const [{ total }] = await tx.select({ total: count() }).from(correctionAttempt).innerJoin(correctionSession, eq(correctionSession.id, correctionAttempt.sessionId)).where(and(eq(correctionSession.activityId, sessionRecord.activityId), eq(correctionSession.studentUserId, sessionRecord.studentUserId)));
				if (Number(total) >= limitRecord.limit) throw new ApiError(409, `The maximum of ${limitRecord.limit} corrections for this activity has been reached.`, "CORRECTION_LIMIT_REACHED");
			}
			const [lastAttempt] = await tx.select({ number: max(correctionAttempt.attemptNumber) }).from(correctionAttempt).where(eq(correctionAttempt.sessionId, sessionRecord.id));
			const [created] = await tx.insert(correctionAttempt).values({
				sessionId: sessionRecord.id,
				attemptNumber: Number(lastAttempt?.number || 0) + 1,
				imageName: requiredText(input.imageName, "imageName", 255),
				focus,
				viewType,
				viewLabel: requiredText(input.viewLabel, "viewLabel", 100),
				referenceImageId,
				jobId: input.jobId == null ? null : optionalText(input.jobId, "jobId", 100) || null,
				jobStatus: jobStatus(input.jobStatus)
			}).returning();
			return created;
		});
	},
	async update(id, input, currentUser) {
		const record = await requireAttemptAccess(id, currentUser);
		const values = { updatedAt: /* @__PURE__ */ new Date() };
		if (input.jobStatus !== void 0) values.jobStatus = jobStatus(input.jobStatus);
		if (input.cancelledAt !== void 0) values.cancelledAt = input.cancelledAt === null ? null : dateValue(input.cancelledAt, "cancelledAt");
		if (input.provider !== void 0) values.provider = optionalText(input.provider, "provider", 100) || null;
		if (input.model !== void 0) values.model = optionalText(input.model, "model", 200) || null;
		if (input.promptVersion !== void 0) values.promptVersion = optionalText(input.promptVersion, "promptVersion", 100) || null;
		if (input.summary !== void 0) values.summary = optionalText(input.summary, "summary", 2e4) || null;
		if (input.rawResponse !== void 0) values.rawResponse = input.rawResponse;
		if (input.failureReason !== void 0) values.failureReason = optionalText(input.failureReason, "failureReason", 2e4) || null;
		if (input.detectedError !== void 0) values.detectedError = optionalText(input.detectedError, "detectedError", 2e4) || null;
		if (input.score !== void 0) values.score = scoreValue(input.score);
		if (input.startedAt !== void 0) values.startedAt = input.startedAt === null ? null : dateValue(input.startedAt, "startedAt");
		if (input.completedAt !== void 0) values.completedAt = input.completedAt === null ? null : dateValue(input.completedAt, "completedAt");
		const [updated] = await db.update(correctionAttempt).set(values).where(eq(correctionAttempt.id, record.id)).returning();
		return updated;
	},
	async remove(id, currentUser) {
		const record = await requireAttemptAccess(id, currentUser);
		await db.delete(correctionAttempt).where(eq(correctionAttempt.id, record.id));
		return { id: record.id };
	}
};
//#endregion
export { correctionAttemptService as t };
