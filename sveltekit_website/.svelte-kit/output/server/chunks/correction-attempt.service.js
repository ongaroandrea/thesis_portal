import { a as correctionAttempt, n as activity, s as correctionSession, t as db } from "./db.js";
import { a as paginated, c as requiredText, i as optionalText, n as dateValue, o as paginationParams, r as numericId, s as requireUser, t as ApiError } from "./api.service.js";
import { t as correctionSessionService } from "./correction-session.service.js";
import { t as CORRECTION_FOCUS_IDS } from "./correction-focus.js";
import { and, asc, count, eq, max, sql } from "drizzle-orm";
// src/lib/server/services/correction-attempt.service.js
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
async function existingAttemptForJob(sessionId, jobId) {
	if (!jobId) return null;
	const [record] = await db.select().from(correctionAttempt).where(and(eq(correctionAttempt.sessionId, numericId(sessionId, "sessionId")), eq(correctionAttempt.jobId, requiredText(jobId, "jobId", 100)))).limit(1);
	return record ?? null;
}
function trustedJobValues(job) {
	const result = job?.result || {};
	const firstError = Array.isArray(result.errors) ? result.errors[0] : null;
	const values = {
		jobStatus: jobStatus(job?.status),
		rawResponse: job,
		updatedAt: /* @__PURE__ */ new Date()
	};
	const summary = result.summary || result.evaluation || result.answer;
	const detectedError = result.error || result.currentError || firstError?.title || firstError?.description;
	const failureReason = job?.error || result.failureReason;
	if (job?.provider || result.provider) values.provider = optionalText(job.provider || result.provider, "provider", 100) || null;
	if (job?.model || result.model) values.model = optionalText(job.model || result.model, "model", 200) || null;
	if (job?.promptVersion || result.promptVersion) values.promptVersion = optionalText(job.promptVersion || result.promptVersion, "promptVersion", 100) || null;
	if (summary) values.summary = optionalText(summary, "summary", 2e4) || null;
	if (detectedError) values.detectedError = optionalText(detectedError, "detectedError", 2e4) || null;
	if (failureReason) values.failureReason = optionalText(failureReason, "failureReason", 2e4) || null;
	if (result.score != null) values.score = scoreValue(result.score);
	if (job?.startedAt || result.startedAt) values.startedAt = dateValue(job.startedAt || result.startedAt, "startedAt");
	if (["completed", "failed"].includes(job?.status)) values.completedAt = dateValue(job.completedAt || result.completedAt || /* @__PURE__ */ new Date(), "completedAt");
	return values;
}
async function insertAttempt(input, sessionRecord, trustedJob = null) {
	return db.transaction(async (tx) => {
		const lockKey = `activity-correction-limit:${sessionRecord.activityId}:${sessionRecord.studentUserId}`;
		await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
		if (trustedJob?.id) {
			const [existing] = await tx.select().from(correctionAttempt).where(and(eq(correctionAttempt.sessionId, sessionRecord.id), eq(correctionAttempt.jobId, trustedJob.id))).limit(1);
			if (existing) return existing;
		}
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
			focus: input.focus,
			viewType: input.viewType,
			viewLabel: requiredText(input.viewLabel, "viewLabel", 100),
			referenceImageId: input.referenceImageId,
			jobId: trustedJob?.id ?? null,
			jobStatus: trustedJob ? jobStatus(trustedJob.status) : "unavailable"
		}).returning();
		return created;
	});
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
		if (input.jobId != null) {
			const existing = await existingAttemptForJob(sessionRecord.id, input.jobId);
			if (existing) return existing;
			throw new ApiError(403, "The analysis job must be registered by the server.", "UNTRUSTED_CORRECTION_JOB");
		}
		return insertAttempt({
			imageName: input.imageName,
			focus,
			viewType,
			viewLabel: input.viewLabel,
			referenceImageId
		}, sessionRecord);
	},
	async update(id, input, currentUser) {
		return requireAttemptAccess(id, currentUser);
	},
	async createFromTrustedJob(input, currentUser, job) {
		const sessionRecord = await correctionSessionService.requireSessionAccess(input.sessionId, currentUser);
		if (sessionRecord.studentUserId !== numericId(currentUser.id, "userId")) throw new ApiError(403, "Only the session owner can submit a correction.", "CORRECTION_ATTEMPT_CREATE_DENIED");
		return insertAttempt(input, sessionRecord, job);
	},
	async syncTrustedJob(sessionId, jobIdValue, job, currentUser) {
		const record = await existingAttemptForJob((await correctionSessionService.requireSessionAccess(sessionId, currentUser)).id, jobIdValue);
		if (!record) throw new ApiError(404, "Correction attempt not found for this job.", "CORRECTION_ATTEMPT_NOT_FOUND");
		const [updated] = await db.update(correctionAttempt).set(trustedJobValues(job)).where(eq(correctionAttempt.id, record.id)).returning();
		return updated;
	},
	async requireTrustedJob(sessionId, jobIdValue, currentUser) {
		const record = await existingAttemptForJob((await correctionSessionService.requireSessionAccess(sessionId, currentUser)).id, jobIdValue);
		if (!record) throw new ApiError(404, "Correction attempt not found for this job.", "CORRECTION_ATTEMPT_NOT_FOUND");
		return record;
	},
	async cancelTrustedJob(sessionId, jobIdValue, currentUser) {
		const record = await existingAttemptForJob((await correctionSessionService.requireSessionAccess(sessionId, currentUser)).id, jobIdValue);
		if (!record) throw new ApiError(404, "Correction attempt not found for this job.", "CORRECTION_ATTEMPT_NOT_FOUND");
		if (!["queued", "processing"].includes(record.jobStatus)) return record;
		const [updated] = await db.update(correctionAttempt).set({
			cancelledAt: /* @__PURE__ */ new Date(),
			updatedAt: /* @__PURE__ */ new Date()
		}).where(eq(correctionAttempt.id, record.id)).returning();
		return updated;
	},
	async remove(id, currentUser) {
		const record = await requireAttemptAccess(id, currentUser);
		await db.delete(correctionAttempt).where(eq(correctionAttempt.id, record.id));
		return { id: record.id };
	}
};
export { correctionAttemptService as t };
