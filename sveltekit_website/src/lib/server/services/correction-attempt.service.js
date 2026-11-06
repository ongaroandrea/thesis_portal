import { and, asc, count, eq, max, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activity, correctionAttempt, correctionSession } from '$lib/server/db/schema';
import { ApiError, dateValue, numericId, optionalText, paginated, paginationParams, requiredText, requireUser } from './api.service.js';
import { correctionSessionService } from './correction-session.service.js';
import { courseService } from './course.service.js';
import { CORRECTION_FOCUS_IDS } from '$lib/correction-focus.js';

const VIEW_TYPES = new Set(['FRONT', 'SIDE', 'TOP', 'ANGLED', 'OTHER']);
const JOB_STATUSES = new Set(['queued', 'processing', 'completed', 'failed', 'unavailable']);

function jobStatus(value) {
	if (value === undefined || value === null || value === '') return null;
	const status = requiredText(value, 'jobStatus', 20);
	if (!JOB_STATUSES.has(status)) throw new ApiError(400, 'Invalid job status.', 'VALIDATION_ERROR');
	return status;
}

function scoreValue(value) {
	if (value === undefined) return undefined;
	if (value === null || value === '') return null;
	const score = Number(value);
	if (!Number.isFinite(score) || score < 0 || score > 30) {
		throw new ApiError(400, 'score must be between 0 and 30.', 'VALIDATION_ERROR');
	}
	return score.toFixed(2);
}

async function findAttempt(id) {
	const [record] = await db.select().from(correctionAttempt)
		.where(eq(correctionAttempt.id, numericId(id, 'attemptId'))).limit(1);
	if (!record) throw new ApiError(404, 'Correction attempt not found.', 'CORRECTION_ATTEMPT_NOT_FOUND');
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
	const [record] = await db.select().from(correctionAttempt).where(and(
		eq(correctionAttempt.sessionId, numericId(sessionId, 'sessionId')),
		eq(correctionAttempt.jobId, requiredText(jobId, 'jobId', 100))
	)).limit(1);
	return record ?? null;
}

/**
 * Map a job object fetched (with a signed request) from the Python worker
 * onto correction_attempt columns. Several field names are accepted for
 * summary/error because different prompt schemas name them differently.
 * Only called with server-fetched data, never with client input.
 */
function trustedJobValues(job) {
	const result = job?.result || {};
	const firstError = Array.isArray(result.errors) ? result.errors[0] : null;
	const values = {
		jobStatus: jobStatus(job?.status),
		rawResponse: job,
		updatedAt: new Date()
	};
	const summary = result.summary || result.evaluation || result.answer;
	const detectedError = result.error || result.currentError || firstError?.title || firstError?.description;
	const failureReason = job?.error || result.failureReason;
	if (job?.provider || result.provider) values.provider = optionalText(job.provider || result.provider, 'provider', 100) || null;
	if (job?.model || result.model) values.model = optionalText(job.model || result.model, 'model', 200) || null;
	if (job?.promptVersion || result.promptVersion) values.promptVersion = optionalText(job.promptVersion || result.promptVersion, 'promptVersion', 100) || null;
	if (summary) values.summary = optionalText(summary, 'summary', 20000) || null;
	if (detectedError) values.detectedError = optionalText(detectedError, 'detectedError', 20000) || null;
	if (failureReason) values.failureReason = optionalText(failureReason, 'failureReason', 20000) || null;
	if (result.score != null) values.score = scoreValue(result.score);
	if (job?.startedAt || result.startedAt) values.startedAt = dateValue(job.startedAt || result.startedAt, 'startedAt');
	if (['completed', 'failed'].includes(job?.status)) {
		values.completedAt = dateValue(job.completedAt || result.completedAt || new Date(), 'completedAt');
	}
	return values;
}

/**
 * Create the next attempt for a session inside a transaction.
 * Takes the same advisory lock as correction-session so the per-student
 * correction limit cannot be exceeded by concurrent submissions, and is
 * idempotent per job id (returns the existing attempt if already recorded).
 */
async function insertAttempt(input, sessionRecord, trustedJob = null) {
	return db.transaction(async (tx) => {
		const lockKey = `activity-correction-limit:${sessionRecord.activityId}:${sessionRecord.studentUserId}`;
		await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
		if (trustedJob?.id) {
			const [existing] = await tx.select().from(correctionAttempt).where(and(
				eq(correctionAttempt.sessionId, sessionRecord.id),
				eq(correctionAttempt.jobId, trustedJob.id)
			)).limit(1);
			if (existing) return existing;
		}
		const [limitRecord] = await tx.select({ limit: activity.maxCorrectionsPerStudent })
			.from(activity).where(eq(activity.id, sessionRecord.activityId)).limit(1);
		if (limitRecord?.limit != null) {
			const [{ total }] = await tx.select({ total: count() })
				.from(correctionAttempt)
				.innerJoin(correctionSession, eq(correctionSession.id, correctionAttempt.sessionId))
				.where(and(
					eq(correctionSession.activityId, sessionRecord.activityId),
					eq(correctionSession.studentUserId, sessionRecord.studentUserId)
				));
			if (Number(total) >= limitRecord.limit) {
				throw new ApiError(409, `The maximum of ${limitRecord.limit} corrections for this activity has been reached.`, 'CORRECTION_LIMIT_REACHED');
			}
		}
		const [lastAttempt] = await tx.select({ number: max(correctionAttempt.attemptNumber) })
			.from(correctionAttempt).where(eq(correctionAttempt.sessionId, sessionRecord.id));
		const [created] = await tx.insert(correctionAttempt).values({
			sessionId: sessionRecord.id,
			attemptNumber: Number(lastAttempt?.number || 0) + 1,
			imageName: requiredText(input.imageName, 'imageName', 255),
			focus: input.focus,
			viewType: input.viewType,
			viewLabel: requiredText(input.viewLabel, 'viewLabel', 100),
			referenceImageId: input.referenceImageId,
			jobId: trustedJob?.id ?? null,
			jobStatus: trustedJob ? jobStatus(trustedJob.status) : 'unavailable'
		}).returning();
		return created;
	});
}

export const correctionAttemptService = {
	findAttempt,

	async list(sessionId, currentUser, searchParams) {
		const sessionRecord = await correctionSessionService.requireSessionAccess(sessionId, currentUser);
		const pagination = paginationParams(searchParams);
		const condition = eq(correctionAttempt.sessionId, sessionRecord.id);
		const [items, [{ total }]] = await Promise.all([
			db.select().from(correctionAttempt).where(condition)
				.orderBy(asc(correctionAttempt.attemptNumber)).limit(pagination.pageSize).offset(pagination.offset),
			db.select({ total: count() }).from(correctionAttempt).where(condition)
		]);
		return paginated(items, total, pagination);
	},

	get: requireAttemptAccess,

	/**
	 * Client-facing attempt creation (public API). Only the session owner may
	 * call it, and focus/reference image must match the session's locked
	 * settings. A client cannot attach a job id of its own: if `jobId` is
	 * given it must already have been registered server-side (via
	 * `createFromTrustedJob`), otherwise 403. Without a job id the attempt is
	 * stored with `jobStatus: 'unavailable'`.
	 */
	async create(input, currentUser) {
		requireUser(currentUser);
		const sessionRecord = await correctionSessionService.requireSessionAccess(input.sessionId, currentUser);
		if (sessionRecord.studentUserId !== numericId(currentUser.id, 'userId')) {
			throw new ApiError(403, 'Only the session owner can submit a correction.', 'CORRECTION_ATTEMPT_CREATE_DENIED');
		}
		if (sessionRecord.status === 'FAILED') {
			throw new ApiError(409, 'Attempts cannot be added to this correction session.', 'CORRECTION_SESSION_CLOSED');
		}
		const focus = requiredText(input.focus, 'focus', 100);
		if (!CORRECTION_FOCUS_IDS.has(focus) || focus !== sessionRecord.analysisFocus) {
			throw new ApiError(409, 'The analysis focus does not match this correction session.', 'CONVERSATION_SETTINGS_LOCKED');
		}
		const viewType = requiredText(input.viewType, 'viewType', 20);
		if (!VIEW_TYPES.has(viewType)) throw new ApiError(400, 'Invalid view type.', 'VALIDATION_ERROR');
		const referenceImageId = numericId(input.referenceImageId, 'referenceImageId');
		if (referenceImageId !== sessionRecord.referenceImageId) {
			throw new ApiError(409, 'The reference image does not match this correction session.', 'CONVERSATION_SETTINGS_LOCKED');
		}

		if (input.jobId != null) {
			const existing = await existingAttemptForJob(sessionRecord.id, input.jobId);
			if (existing) return existing;
			throw new ApiError(403, 'The analysis job must be registered by the server.', 'UNTRUSTED_CORRECTION_JOB');
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
		// Kept as a compatibility acknowledgement for older clients. All provider-owned
		// fields are ignored; trusted job routes persist them after a signed server fetch.
		return requireAttemptAccess(id, currentUser);
	},

	/**
	 * Record an attempt for a job the server itself just queued on the Python
	 * worker (see the `sessioni-correzione/[id]/job` POST route). `job` is the
	 * worker's response, so its id/status are trusted. Owner only.
	 */
	async createFromTrustedJob(input, currentUser, job) {
		const sessionRecord = await correctionSessionService.requireSessionAccess(input.sessionId, currentUser);
		if (sessionRecord.studentUserId !== numericId(currentUser.id, 'userId')) {
			throw new ApiError(403, 'Only the session owner can submit a correction.', 'CORRECTION_ATTEMPT_CREATE_DENIED');
		}
		return insertAttempt(input, sessionRecord, job);
	},

	/**
	 * Copy the latest worker state (status, summary, errors, timings) onto the
	 * attempt that owns `jobIdValue`. `job` must come from a signed server
	 * fetch, never from the browser. Throws 404 if the job is not part of
	 * this session, which also stops users polling other people's jobs.
	 */
	async syncTrustedJob(sessionId, jobIdValue, job, currentUser) {
		const sessionRecord = await correctionSessionService.requireSessionAccess(sessionId, currentUser);
		const record = await existingAttemptForJob(sessionRecord.id, jobIdValue);
		if (!record) throw new ApiError(404, 'Correction attempt not found for this job.', 'CORRECTION_ATTEMPT_NOT_FOUND');
		const [updated] = await db.update(correctionAttempt).set(trustedJobValues(job))
			.where(eq(correctionAttempt.id, record.id)).returning();
		return updated;
	},

	async requireTrustedJob(sessionId, jobIdValue, currentUser) {
		const sessionRecord = await correctionSessionService.requireSessionAccess(sessionId, currentUser);
		const record = await existingAttemptForJob(sessionRecord.id, jobIdValue);
		if (!record) throw new ApiError(404, 'Correction attempt not found for this job.', 'CORRECTION_ATTEMPT_NOT_FOUND');
		return record;
	},

	/**
	 * Mark the attempt for a job as cancelled. Only queued/processing attempts
	 * change; finished ones are returned untouched. Cancelled attempts are
	 * ignored by `derivedSessionStatus` but still count toward the limit.
	 */
	async cancelTrustedJob(sessionId, jobIdValue, currentUser) {
		const sessionRecord = await correctionSessionService.requireSessionAccess(sessionId, currentUser);
		const record = await existingAttemptForJob(sessionRecord.id, jobIdValue);
		if (!record) throw new ApiError(404, 'Correction attempt not found for this job.', 'CORRECTION_ATTEMPT_NOT_FOUND');
		if (!['queued', 'processing'].includes(record.jobStatus)) return record;
		const [updated] = await db.update(correctionAttempt).set({ cancelledAt: new Date(), updatedAt: new Date() })
			.where(eq(correctionAttempt.id, record.id)).returning();
		return updated;
	},

	/**
	 * Delete an attempt (course managers and admins only). Every attempt
	 * counts toward `maxCorrectionsPerStudent`, so a student deleting their
	 * own would get corrections back; a manager may do it on purpose.
	 */
	async remove(id, currentUser) {
		const record = await requireAttemptAccess(id, currentUser);
		const sessionRecord = await correctionSessionService.findSession(record.sessionId);
		await courseService.requireCourseManager(sessionRecord.courseId, currentUser);
		await db.delete(correctionAttempt).where(eq(correctionAttempt.id, record.id));
		return { id: record.id };
	}
};
