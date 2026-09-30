import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activity, activityReferenceImage, correctionAttempt, correctionSession, user } from '$lib/server/db/schema';
import { ApiError, numericId, paginated, paginationParams, requiredText, requireUser } from './api.service.js';
import { activityService } from './activity.service.js';
import { courseService } from './course.service.js';
import { CORRECTION_FOCUS_IDS } from '$lib/correction-focus.js';

export function derivedSessionStatus(attempts) {
	const latest = [...attempts].filter((attempt) => !attempt.cancelledAt)
		.sort((left, right) => left.attemptNumber - right.attemptNumber).at(-1);
	if (!latest?.jobStatus) return 'OPEN';
	if (['queued', 'processing'].includes(latest.jobStatus)) return 'PROCESSING';
	if (latest.jobStatus === 'completed') return 'ANSWERED';
	if (['failed', 'unavailable'].includes(latest.jobStatus)) return 'FAILED';
	return 'OPEN';
}

async function attemptsBySessionIds(sessionIds) {
	if (sessionIds.length === 0) return new Map();
	const attempts = await db.select({
		sessionId: correctionAttempt.sessionId,
		attemptNumber: correctionAttempt.attemptNumber,
		jobStatus: correctionAttempt.jobStatus,
		cancelledAt: correctionAttempt.cancelledAt
	}).from(correctionAttempt).where(inArray(correctionAttempt.sessionId, sessionIds))
		.orderBy(asc(correctionAttempt.attemptNumber));
	const grouped = new Map(sessionIds.map((sessionId) => [sessionId, []]));
	for (const attempt of attempts) grouped.get(attempt.sessionId)?.push(attempt);
	return grouped;
}

async function findSession(id) {
	const [record] = await db.select({
		id: correctionSession.id,
		activityId: correctionSession.activityId,
		referenceImageId: correctionSession.referenceImageId,
		analysisFocus: correctionSession.analysisFocus,
		studentUserId: correctionSession.studentUserId,
		anonymousAlias: correctionSession.anonymousAlias,
		isAnonymous: correctionSession.isAnonymous,
		openedAt: correctionSession.openedAt,
		updatedAt: correctionSession.updatedAt,
		courseId: activity.courseId,
		maxCorrectionsPerStudent: activity.maxCorrectionsPerStudent
	}).from(correctionSession).innerJoin(activity, eq(activity.id, correctionSession.activityId))
		.where(eq(correctionSession.id, numericId(id, 'sessionId'))).limit(1);
	if (!record) throw new ApiError(404, 'Correction session not found.', 'CORRECTION_SESSION_NOT_FOUND');
	const attempts = await attemptsBySessionIds([record.id]);
	return { ...record, status: derivedSessionStatus(attempts.get(record.id) ?? []) };
}

async function countStudentCorrections(executor, activityId, studentUserId) {
	const [{ total }] = await executor.select({ total: count() })
		.from(correctionAttempt)
		.innerJoin(correctionSession, eq(correctionSession.id, correctionAttempt.sessionId))
		.where(and(
			eq(correctionSession.activityId, activityId),
			eq(correctionSession.studentUserId, studentUserId)
		));
	return Number(total);
}

async function assertCorrectionAvailable(executor, activityId, studentUserId, limit, lock = false) {
	if (limit == null) return;
	if (lock) {
		const lockKey = `activity-correction-limit:${activityId}:${studentUserId}`;
		await executor.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
	}
	if (await countStudentCorrections(executor, activityId, studentUserId) >= limit) {
		throw new ApiError(409, `The maximum of ${limit} corrections for this activity has been reached.`, 'CORRECTION_LIMIT_REACHED');
	}
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

function visibleSession(record, currentUser, manager) {
	const hideIdentity = manager && record.isAnonymous && record.studentUserId !== numericId(currentUser.id, 'userId');
	const studentDisplayName = hideIdentity
		? (record.anonymousAlias || 'Studente anonimo')
		: ([record.studentName, record.studentSurname].filter(Boolean).join(' ') || record.studentEmail || 'Utente non disponibile');
	return {
		...record,
		studentUserId: hideIdentity ? null : record.studentUserId,
		studentName: hideIdentity ? null : record.studentName,
		studentSurname: hideIdentity ? null : record.studentSurname,
		studentEmail: hideIdentity ? null : record.studentEmail,
		studentDisplayName
	};
}

async function requireSessionAccess(id, currentUser) {
	requireUser(currentUser);
	const record = await findSession(id);
	if (record.studentUserId === numericId(currentUser.id, 'userId')) return record;
	const manager = await isCourseManager(record.courseId, currentUser);
	if (manager) return visibleSession(record, currentUser, true);
	throw new ApiError(403, 'You cannot access this correction session.', 'CORRECTION_SESSION_ACCESS_DENIED');
}

export const correctionSessionService = {
	findSession,
	requireSessionAccess,

	async list(activityId, currentUser, searchParams) {
		requireUser(currentUser);
		const pagination = paginationParams(searchParams);
		const activityRecord = await activityService.requireActivityAccess(activityId, currentUser);
		const manager = await isCourseManager(activityRecord.courseId, currentUser);
		const conditions = [eq(correctionSession.activityId, activityRecord.id)];
		if (!manager) conditions.push(eq(correctionSession.studentUserId, numericId(currentUser.id, 'userId')));
		const selection = {
			id: correctionSession.id,
			activityId: correctionSession.activityId,
			referenceImageId: correctionSession.referenceImageId,
			analysisFocus: correctionSession.analysisFocus,
			studentUserId: correctionSession.studentUserId,
			studentName: user.name,
			studentSurname: user.surname,
			studentEmail: user.email,
			anonymousAlias: correctionSession.anonymousAlias,
			isAnonymous: correctionSession.isAnonymous,
			openedAt: correctionSession.openedAt,
			updatedAt: correctionSession.updatedAt,
			referenceViewType: activityReferenceImage.viewType,
			referenceCustomViewLabel: activityReferenceImage.customViewLabel
		};
		const condition = and(...conditions);
		const [records, [{ total }]] = await Promise.all([
			db.select(selection).from(correctionSession)
				.leftJoin(user, eq(user.id, correctionSession.studentUserId))
				.leftJoin(activityReferenceImage, eq(activityReferenceImage.id, correctionSession.referenceImageId))
				.where(condition).orderBy(desc(correctionSession.openedAt), desc(correctionSession.id))
				.limit(pagination.pageSize).offset(pagination.offset),
			db.select({ total: count() }).from(correctionSession).where(condition)
		]);
		const attempts = await attemptsBySessionIds(records.map((record) => record.id));
		return paginated(records.map((record) => visibleSession({
			...record,
			status: derivedSessionStatus(attempts.get(record.id) ?? []),
			courseId: activityRecord.courseId
		}, currentUser, manager)), total, pagination);
	},

	get: requireSessionAccess,

	async create(input, currentUser) {
		requireUser(currentUser);
		const activityRecord = await activityService.requireActivityAccess(input.activityId, currentUser);
		if (activityRecord.kind === 'EXAM') {
			throw new ApiError(400, 'Exam activities use the dedicated submission workflow.', 'EXAM_USES_SUBMISSIONS');
		}
		const membership = currentUser.role === 'developer'
			? true
			: await courseService.isAuthorizedMember(activityRecord.courseId, currentUser.id);
		if (!membership) throw new ApiError(403, 'Only an authorized course member can create a correction session.', 'MEMBER_NOT_AUTHORIZED');
		const referenceImageId = numericId(input.referenceImageId, 'referenceImageId');
		const [referenceImage] = await db.select({ id: activityReferenceImage.id })
			.from(activityReferenceImage)
			.where(and(eq(activityReferenceImage.id, referenceImageId), eq(activityReferenceImage.activityId, activityRecord.id)))
			.limit(1);
		if (!referenceImage) {
			throw new ApiError(400, 'The selected point of view is not available for this activity.', 'INVALID_REFERENCE_IMAGE');
		}
		const analysisFocus = requiredText(input.analysisFocus, 'analysisFocus', 100);
		if (!CORRECTION_FOCUS_IDS.has(analysisFocus)) {
			throw new ApiError(400, 'Invalid analysis type.', 'VALIDATION_ERROR');
		}
		const allowedFocuses = Array.isArray(activityRecord.allowedCorrectionFocuses)
			? activityRecord.allowedCorrectionFocuses
			: [...CORRECTION_FOCUS_IDS];
		if (!allowedFocuses.includes(analysisFocus)) {
			throw new ApiError(400, 'This analysis topic is not enabled for the activity.', 'CORRECTION_FOCUS_NOT_ALLOWED');
		}
		const isAnonymous = input.isAnonymous === true;
		const studentUserId = numericId(currentUser.id, 'userId');
		return db.transaction(async (tx) => {
			await assertCorrectionAvailable(tx, activityRecord.id, studentUserId, activityRecord.maxCorrectionsPerStudent, true);
			const [created] = await tx.insert(correctionSession).values({
				activityId: activityRecord.id,
				referenceImageId,
				analysisFocus,
				studentUserId,
				isAnonymous,
				anonymousAlias: isAnonymous ? 'Anonimizzato' : null
			}).returning();
			return { ...created, status: 'OPEN' };
		});
	},

	async requireCorrectionAvailable(id, currentUser) {
		const record = await requireSessionAccess(id, currentUser);
		if (record.studentUserId !== numericId(currentUser.id, 'userId')) {
			throw new ApiError(403, 'Only the session owner can submit a correction.', 'CORRECTION_ATTEMPT_CREATE_DENIED');
		}
		await assertCorrectionAvailable(db, record.activityId, record.studentUserId, record.maxCorrectionsPerStudent);
		return record;
	},

	async remove(id, currentUser) {
		requireUser(currentUser);
		const record = await findSession(id);
		const isOwner = record.studentUserId === numericId(currentUser.id, 'userId');
		if (!isOwner && !(await isCourseManager(record.courseId, currentUser))) {
			throw new ApiError(403, 'You cannot delete this correction session.', 'CORRECTION_SESSION_EDIT_DENIED');
		}
		await db.delete(correctionSession).where(eq(correctionSession.id, record.id));
		return { id: record.id };
	}
};
