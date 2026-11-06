import { and, asc, count, eq, isNull, lte, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activity, courseMember, examResult, user } from '$lib/server/db/schema';
import { ApiError, dateValue, numericId, optionalText, paginated, paginationParams, requireUser } from './api.service.js';
import { activityService } from './activity.service.js';
import { courseService } from './course.service.js';

const RESULT_STATUSES = new Set(['DRAFT', 'READY', 'PUBLISHED']);

function scoreValue(value) {
	if (value === undefined) return undefined;
	if (value === null || value === '') return null;
	const score = Number(value);
	if (!Number.isFinite(score) || score < 0 || score > 30) {
		throw new ApiError(400, 'score must be between 0 and 30.', 'VALIDATION_ERROR');
	}
	return score.toFixed(2);
}

function statusValue(value, fallback = 'DRAFT') {
	const status = value ?? fallback;
	if (!RESULT_STATUSES.has(status)) {
		throw new ApiError(400, 'status must be DRAFT, READY, or PUBLISHED.', 'VALIDATION_ERROR');
	}
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
	}).from(examResult).innerJoin(activity, eq(activity.id, examResult.activityId))
		.where(eq(examResult.id, numericId(id, 'resultId'))).limit(1);
	if (!record) throw new ApiError(404, 'Exam result not found.', 'EXAM_RESULT_NOT_FOUND');
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

/**
 * A student sees a result only when it is PUBLISHED, its publishedAt is in
 * the past, and the exam-wide `resultsReleasedAt` (if set) has passed.
 */
function isReleased(record, now = new Date()) {
	return record.status === 'PUBLISHED'
		&& record.publishedAt != null
		&& record.publishedAt <= now
		&& (!record.resultsReleasedAt || record.resultsReleasedAt <= now);
}

async function requireExamActivity(activityId, currentUser) {
	const record = await activityService.findActivity(activityId);
	if (record.kind !== 'EXAM') {
		throw new ApiError(400, 'Results can only be recorded for exam activities.', 'RESULT_REQUIRES_EXAM');
	}
	await courseService.requireCourseManager(record.courseId, currentUser);
	return record;
}

async function requireActiveStudent(courseId, studentUserId) {
	const [membership] = await db.select({ id: courseMember.id }).from(courseMember).where(and(
		eq(courseMember.courseId, courseId),
		eq(courseMember.userId, studentUserId),
		eq(courseMember.role, 'STUDENT'),
		eq(courseMember.status, 'ACTIVE')
	)).limit(1);
	if (!membership) {
		throw new ApiError(400, 'The selected user is not an active student in this course.', 'RESULT_STUDENT_NOT_ENROLLED');
	}
}

/**
 * Managers of the result's course can always read it; otherwise only the
 * graded student, while still a course member, and only once released.
 */
async function requireResultAccess(id, currentUser) {
	requireUser(currentUser);
	const record = await findResult(id);
	if (await isCourseManager(record.courseId, currentUser)) return record;
	if (record.studentUserId !== numericId(currentUser.id, 'userId')) {
		throw new ApiError(403, 'You cannot access this exam result.', 'EXAM_RESULT_ACCESS_DENIED');
	}
	await courseService.requireCourseAccess(record.courseId, currentUser);
	if (!isReleased(record)) {
		throw new ApiError(403, 'This exam result has not been released.', 'EXAM_RESULT_NOT_RELEASED');
	}
	return record;
}

/**
 * Map a create/update body to exam_result columns.
 *
 * Keeps `publishedAt` consistent with `status`: PUBLISHED with no date gets
 * the existing date or "now"; moving to any other status clears it, so a
 * result that is un-published is hidden from the student again. On create
 * (`existing` null) the status defaults to DRAFT.
 *
 * @param {object} input - Raw request body.
 * @param {object|null} existing - Current row when updating.
 * @returns {object} Only the columns that should change.
 */
function resultValues(input, existing = null) {
	const values = {};
	const score = scoreValue(input.score);
	if (score !== undefined) values.score = score;
	if (input.feedback !== undefined) values.feedback = optionalText(input.feedback, 'feedback', 20000) || null;
	if (input.status !== undefined || !existing) values.status = statusValue(input.status, existing?.status);
	const status = values.status ?? existing?.status;
	if (input.publishedAt !== undefined) {
		values.publishedAt = input.publishedAt === null || input.publishedAt === '' ? null : dateValue(input.publishedAt, 'publishedAt');
	}
	if (status === 'PUBLISHED') {
		values.publishedAt ??= existing?.publishedAt ?? new Date();
	} else if (values.status !== undefined) {
		values.publishedAt = null;
	}
	return values;
}

export const examResultService = {
	findResult,

	/**
	 * Paginated results for one exam. Managers get every student; a student
	 * gets only their own released results. The release rules of
	 * `isReleased` are repeated here as SQL conditions so filtering and the
	 * total count happen in the database.
	 */
	async list(activityId, currentUser, searchParams) {
		requireUser(currentUser);
		const activityRecord = await activityService.findActivity(activityId);
		if (activityRecord.kind !== 'EXAM') throw new ApiError(400, 'Results are only available for exams.', 'RESULT_REQUIRES_EXAM');
		const pagination = paginationParams(searchParams);
		const manager = await isCourseManager(activityRecord.courseId, currentUser);
		const conditions = [eq(examResult.activityId, activityRecord.id)];
		if (!manager) {
			await courseService.requireCourseAccess(activityRecord.courseId, currentUser);
			const now = new Date();
			conditions.push(
				eq(examResult.studentUserId, numericId(currentUser.id, 'userId')),
				eq(examResult.status, 'PUBLISHED'),
				lte(examResult.publishedAt, now),
				or(isNull(activity.resultsReleasedAt), lte(activity.resultsReleasedAt, now))
			);
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
		const [items, [{ total }]] = await Promise.all([
			db.select(selection).from(examResult)
				.innerJoin(activity, eq(activity.id, examResult.activityId))
				.innerJoin(user, eq(user.id, examResult.studentUserId))
				.where(condition).orderBy(asc(user.surname), asc(user.name), asc(examResult.id))
				.limit(pagination.pageSize).offset(pagination.offset),
			db.select({ total: count() }).from(examResult)
				.innerJoin(activity, eq(activity.id, examResult.activityId)).where(condition)
		]);
		return paginated(items, total, pagination);
	},

	get: requireResultAccess,

	async create(input, currentUser) {
		requireUser(currentUser);
		const activityRecord = await requireExamActivity(input.activityId, currentUser);
		const studentUserId = numericId(input.studentUserId, 'studentUserId');
		await requireActiveStudent(activityRecord.courseId, studentUserId);
		const [created] = await db.insert(examResult).values({
			...resultValues(input),
			activityId: activityRecord.id,
			studentUserId,
			gradedByUserId: numericId(currentUser.id, 'userId')
		}).returning();
		return created;
	},

	async update(id, input, currentUser) {
		requireUser(currentUser);
		const record = await findResult(id);
		await courseService.requireCourseManager(record.courseId, currentUser);
		const values = resultValues(input, record);
		if (Object.keys(values).length === 0) throw new ApiError(400, 'No result fields were provided.', 'VALIDATION_ERROR');
		const [updated] = await db.update(examResult).set({
			...values,
			gradedByUserId: numericId(currentUser.id, 'userId'),
			updatedAt: new Date()
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
