import { and, count, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activity, correctionAttempt, correctionFeedback, correctionSession } from '$lib/server/db/schema';
import { ApiError, numericId, optionalText, requireUser } from './api.service.js';
import { correctionAttemptService } from './correction-attempt.service.js';
import { correctionSessionService } from './correction-session.service.js';
import { courseService } from './course.service.js';

const VERDICTS = new Set(['CORRECT', 'PARTIAL', 'INCORRECT']);

function nullableComment(value, name) {
	if (value === undefined) return undefined;
	return optionalText(value, name, 2000) || null;
}

async function contextForAttempt(attemptId, currentUser) {
	requireUser(currentUser);
	const attempt = await correctionAttemptService.get(attemptId, currentUser);
	const session = await correctionSessionService.findSession(attempt.sessionId);
	return { attempt, session };
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

async function findByAttempt(attemptId) {
	const [record] = await db.select().from(correctionFeedback)
		.where(eq(correctionFeedback.attemptId, numericId(attemptId, 'attemptId'))).limit(1);
	return record ?? null;
}

export const correctionFeedbackService = {
	async get(attemptId, currentUser) {
		await contextForAttempt(attemptId, currentUser);
		return findByAttempt(attemptId);
	},

	/**
	 * Upsert the single feedback row of a completed attempt.
	 * Course managers (admins included) write the correctness verdict.
	 * Everyone else writes the usefulness rating, only on their own attempt
	 * and only with an ACTIVE `STUDENT` membership in the course, whatever
	 * their global role. Both halves live in the same row.
	 */
	async save(attemptId, input, currentUser) {
		const { attempt, session } = await contextForAttempt(attemptId, currentUser);
		if (attempt.jobStatus !== 'completed') {
			throw new ApiError(409, 'Feedback can be submitted only for a completed correction.', 'CORRECTION_NOT_COMPLETED');
		}
		const now = new Date();
		let values;
		if (!(await isCourseManager(session.courseId, currentUser))) {
			const membership = await courseService.findActiveMembership(session.courseId, currentUser.id);
			if (session.studentUserId !== numericId(currentUser.id, 'userId') || membership?.role !== 'STUDENT') {
				throw new ApiError(403, 'Only the student who requested the correction can rate its usefulness.', 'FEEDBACK_STUDENT_DENIED');
			}
			if (typeof input.isUseful !== 'boolean') {
				throw new ApiError(400, 'isUseful must be a boolean.', 'VALIDATION_ERROR');
			}
			values = {
				studentUserId: numericId(currentUser.id, 'userId'),
				isUseful: input.isUseful,
				studentComment: nullableComment(input.studentComment, 'studentComment') ?? null,
				studentSubmittedAt: now,
				updatedAt: now
			};
		} else {
			if (!VERDICTS.has(input.verdict)) {
				throw new ApiError(400, 'verdict must be CORRECT, PARTIAL or INCORRECT.', 'VALIDATION_ERROR');
			}
			values = {
				studentUserId: session.studentUserId,
				reviewedByUserId: numericId(currentUser.id, 'userId'),
				verdict: input.verdict,
				professorComment: nullableComment(input.professorComment, 'professorComment') ?? null,
				reviewedAt: now,
				updatedAt: now
			};
		}

		const [saved] = await db.insert(correctionFeedback)
			.values({ attemptId: attempt.id, ...values })
			.onConflictDoUpdate({ target: correctionFeedback.attemptId, set: values })
			.returning();
		return saved;
	},

	/**
	 * Aggregate feedback on completed AI corrections for one activity (course
	 * managers only).
	 *
	 * Runs three grouped queries in parallel over completed attempts, left
	 * joined to their feedback so attempts without feedback still count:
	 * overall totals, per analysis focus, and per (promptVersion, model) so
	 * prompt revisions can be compared. Postgres returns `count(...)` as a
	 * string (bigint), hence the `Number()` conversions.
	 *
	 * @param {unknown} activityId
	 * @param {object} currentUser - `locals.user`.
	 * @returns {Promise<{completedAttempts: number, studentResponses: number,
	 *   usefulResponses: number, reviewedResponses: number, correct: number,
	 *   partial: number, incorrect: number, byFocus: object[], byPrompt: object[]}>}
	 */
	async statistics(activityId, currentUser) {
		requireUser(currentUser);
		const id = numericId(activityId, 'activityId');
		const [activityRecord] = await db.select({ courseId: activity.courseId })
			.from(activity).where(eq(activity.id, id)).limit(1);
		if (!activityRecord) throw new ApiError(404, 'Activity not found.', 'ACTIVITY_NOT_FOUND');
		await courseService.requireCourseManager(activityRecord.courseId, currentUser);

		const [totalsResult, byFocus, byPrompt] = await Promise.all([db.select({
			completedAttempts: count(correctionAttempt.id),
			studentResponses: sql`count(${correctionFeedback.studentSubmittedAt})`,
			usefulResponses: sql`count(*) filter (where ${correctionFeedback.isUseful} = true)`,
			reviewedResponses: sql`count(${correctionFeedback.reviewedAt})`,
			correct: sql`count(*) filter (where ${correctionFeedback.verdict} = 'CORRECT')`,
			partial: sql`count(*) filter (where ${correctionFeedback.verdict} = 'PARTIAL')`,
			incorrect: sql`count(*) filter (where ${correctionFeedback.verdict} = 'INCORRECT')`
		}).from(correctionAttempt)
			.innerJoin(correctionSession, eq(correctionSession.id, correctionAttempt.sessionId))
			.leftJoin(correctionFeedback, eq(correctionFeedback.attemptId, correctionAttempt.id))
			.where(and(eq(correctionSession.activityId, id), eq(correctionAttempt.jobStatus, 'completed'))),
		db.select({
			focus: correctionAttempt.focus,
			total: count(correctionAttempt.id),
			reviewed: sql`count(${correctionFeedback.reviewedAt})`,
			correct: sql`count(*) filter (where ${correctionFeedback.verdict} = 'CORRECT')`,
			partial: sql`count(*) filter (where ${correctionFeedback.verdict} = 'PARTIAL')`,
			incorrect: sql`count(*) filter (where ${correctionFeedback.verdict} = 'INCORRECT')`
		}).from(correctionAttempt)
			.innerJoin(correctionSession, eq(correctionSession.id, correctionAttempt.sessionId))
			.leftJoin(correctionFeedback, eq(correctionFeedback.attemptId, correctionAttempt.id))
			.where(and(eq(correctionSession.activityId, id), eq(correctionAttempt.jobStatus, 'completed')))
			.groupBy(correctionAttempt.focus)
		, db.select({
			promptVersion: correctionAttempt.promptVersion,
			model: correctionAttempt.model,
			total: count(correctionAttempt.id),
			reviewed: sql`count(${correctionFeedback.reviewedAt})`,
			correct: sql`count(*) filter (where ${correctionFeedback.verdict} = 'CORRECT')`,
			partial: sql`count(*) filter (where ${correctionFeedback.verdict} = 'PARTIAL')`,
			incorrect: sql`count(*) filter (where ${correctionFeedback.verdict} = 'INCORRECT')`
		}).from(correctionAttempt)
			.innerJoin(correctionSession, eq(correctionSession.id, correctionAttempt.sessionId))
			.leftJoin(correctionFeedback, eq(correctionFeedback.attemptId, correctionAttempt.id))
			.where(and(eq(correctionSession.activityId, id), eq(correctionAttempt.jobStatus, 'completed')))
			.groupBy(correctionAttempt.promptVersion, correctionAttempt.model)
		]);
		const [totals] = totalsResult;

		return {
			completedAttempts: Number(totals.completedAttempts),
			studentResponses: Number(totals.studentResponses),
			usefulResponses: Number(totals.usefulResponses),
			reviewedResponses: Number(totals.reviewedResponses),
			correct: Number(totals.correct),
			partial: Number(totals.partial),
			incorrect: Number(totals.incorrect),
			byFocus: byFocus.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, key === 'focus' ? value : Number(value)]))),
			byPrompt: byPrompt.map((row) => ({
				...row,
				total: Number(row.total),
				reviewed: Number(row.reviewed),
				correct: Number(row.correct),
				partial: Number(row.partial),
				incorrect: Number(row.incorrect)
			}))
		};
	}
};
