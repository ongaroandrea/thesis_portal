import { and, asc, count, desc, eq, inArray, max, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activityReferenceImage, examSubmission, examSubmissionFile, user } from '$lib/server/db/schema';
import { ApiError, numericId, paginated, paginationParams, requiredText, requireUser } from './api.service.js';
import { activityService } from './activity.service.js';
import { courseService } from './course.service.js';
import { localStorageService } from './local-storage.service.js';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp|avif));base64,([A-Za-z0-9+/]+={0,2})$/;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 12;

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
 * Load an EXAM activity and tell whether the caller manages its course.
 * Non-managers must be course members and the exam must be published and
 * started.
 * @returns {Promise<{ record: object, manager: boolean }>}
 */
async function requireExam(activityId, currentUser) {
	requireUser(currentUser);
	const record = await activityService.findActivity(activityId);
	if (record.kind !== 'EXAM') throw new ApiError(400, 'Submissions are only available for exams.', 'SUBMISSION_REQUIRES_EXAM');
	if (await isCourseManager(record.courseId, currentUser)) return { record, manager: true };
	await courseService.requireCourseAccess(record.courseId, currentUser);
	const now = new Date();
	if (record.status !== 'PUBLISHED' || (record.availableFrom && now < record.availableFrom)) {
		throw new ApiError(403, 'This exam is not available yet.', 'EXAM_NOT_AVAILABLE');
	}
	return { record, manager: false };
}

function assertSubmissionWindow(record, now = new Date()) {
	if (record.status !== 'PUBLISHED' || (record.availableFrom && now < record.availableFrom)) {
		throw new ApiError(403, 'The exam submission window is not open.', 'EXAM_NOT_OPEN');
	}
	if (record.availableUntil && now > record.availableUntil) {
		throw new ApiError(409, 'The exam submission deadline has passed.', 'EXAM_SUBMISSION_CLOSED');
	}
}

function fileValues(input) {
	const originalFilename = requiredText(input.originalFilename, 'originalFilename', 255);
	const mimeType = requiredText(input.mimeType, 'mimeType', 100);
	if (!IMAGE_TYPES.has(mimeType)) throw new ApiError(400, 'Only JPG, PNG, WEBP and AVIF images are supported.', 'INVALID_EXAM_FILE');
	const dataUrl = requiredText(input.dataUrl, 'dataUrl', 6_000_000);
	const match = dataUrl.match(DATA_URL_PATTERN);
	if (!match || match[1] !== mimeType) throw new ApiError(400, 'The uploaded image data is invalid.', 'INVALID_EXAM_FILE');
	const bytes = Math.floor(match[2].length * 3 / 4);
	if (bytes > MAX_FILE_BYTES) throw new ApiError(413, 'Each exam image must be 4 MB or smaller.', 'EXAM_FILE_TOO_LARGE');
	return { originalFilename, mimeType, base64: match[2] };
}

async function filesForSubmissions(submissionIds) {
	if (submissionIds.length === 0) return new Map();
	const files = await db.select({
		id: examSubmissionFile.id,
		submissionId: examSubmissionFile.submissionId,
		referenceImageId: examSubmissionFile.referenceImageId,
		revision: examSubmissionFile.revision,
		originalFilename: examSubmissionFile.originalFilename,
		mimeType: examSubmissionFile.mimeType,
		storageKey: examSubmissionFile.storageKey,
		isCurrent: examSubmissionFile.isCurrent,
		replacedAt: examSubmissionFile.replacedAt,
		removedAt: examSubmissionFile.removedAt,
		uploadedAt: examSubmissionFile.uploadedAt,
		viewType: activityReferenceImage.viewType,
		customViewLabel: activityReferenceImage.customViewLabel
	}).from(examSubmissionFile)
		.innerJoin(activityReferenceImage, eq(activityReferenceImage.id, examSubmissionFile.referenceImageId))
		.where(inArray(examSubmissionFile.submissionId, submissionIds))
		.orderBy(asc(examSubmissionFile.referenceImageId), desc(examSubmissionFile.revision));
	const grouped = new Map(submissionIds.map((id) => [id, []]));
	for (const file of files) grouped.get(file.submissionId)?.push(file);
	return grouped;
}

export const examSubmissionService = {
	/**
	 * Paginated exam submissions with their full file history attached.
	 * Managers see every student's submission; students only their own.
	 * Files are loaded in a second query (see `filesForSubmissions`) and are
	 * ordered per view with the newest revision first.
	 */
	async list(activityId, currentUser, searchParams) {
		const { record, manager } = await requireExam(activityId, currentUser);
		const pagination = paginationParams(searchParams);
		const conditions = [eq(examSubmission.activityId, record.id)];
		if (!manager) conditions.push(eq(examSubmission.studentUserId, numericId(currentUser.id, 'userId')));
		const condition = and(...conditions);
		const selection = {
			id: examSubmission.id,
			activityId: examSubmission.activityId,
			studentUserId: examSubmission.studentUserId,
			studentName: user.name,
			studentSurname: user.surname,
			studentEmail: user.email,
			createdAt: examSubmission.createdAt,
			updatedAt: examSubmission.updatedAt
		};
		const [items, [{ total }]] = await Promise.all([
			db.select(selection).from(examSubmission).innerJoin(user, eq(user.id, examSubmission.studentUserId))
				.where(condition).orderBy(desc(examSubmission.updatedAt)).limit(pagination.pageSize).offset(pagination.offset),
			db.select({ total: count() }).from(examSubmission).where(condition)
		]);
		const files = await filesForSubmissions(items.map((item) => item.id));
		return paginated(items.map((item) => ({ ...item, files: files.get(item.id) ?? [] })), total, pagination);
	},

	/**
	 * Store one image per selected reference view for the calling student.
	 * The caller needs an ACTIVE `STUDENT` membership in the course (whatever
	 * their global role) and must not manage it.
	 * Each upload becomes a new revision; the previous current file for that
	 * view is marked replaced but kept on disk for the audit history.
	 * An advisory lock per (exam, student) serializes concurrent uploads.
	 */
	async upload(activityId, input, currentUser) {
		const { record, manager } = await requireExam(activityId, currentUser);
		const membership = manager ? null : await courseService.findActiveMembership(record.courseId, currentUser.id);
		if (membership?.role !== 'STUDENT') throw new ApiError(403, 'Only students of the course can upload exam files.', 'EXAM_SUBMISSION_DENIED');
		assertSubmissionWindow(record);
		if (!Array.isArray(input.files) || input.files.length === 0 || input.files.length > MAX_FILES_PER_REQUEST) {
			throw new ApiError(400, `Upload between 1 and ${MAX_FILES_PER_REQUEST} images.`, 'VALIDATION_ERROR');
		}
		const validated = input.files.map((file) => ({
			referenceImageId: numericId(file.referenceImageId, 'referenceImageId'),
			...fileValues(file)
		}));
		const referenceIds = [...new Set(validated.map((file) => file.referenceImageId))];
		if (referenceIds.length !== validated.length) throw new ApiError(400, 'Only one image per view can be uploaded at a time.', 'DUPLICATE_EXAM_VIEW');
		const references = await db.select({ id: activityReferenceImage.id }).from(activityReferenceImage)
			.where(and(eq(activityReferenceImage.activityId, record.id), inArray(activityReferenceImage.id, referenceIds)));
		if (references.length !== referenceIds.length) throw new ApiError(400, 'One or more selected views do not belong to this exam.', 'INVALID_REFERENCE_IMAGE');
		const prepared = [];
		try {
			for (const file of validated) {
				const storageKey = await localStorageService.save({
					base64: file.base64,
					mimeType: file.mimeType,
					category: 'exam-submissions'
				});
				prepared.push({
					referenceImageId: file.referenceImageId,
					originalFilename: file.originalFilename,
					mimeType: file.mimeType,
					storageKey
				});
			}
		} catch (error) {
			await Promise.allSettled(prepared.map((file) => localStorageService.remove(file.storageKey)));
			throw error;
		}
		const studentUserId = numericId(currentUser.id, 'userId');
		try {
			return await db.transaction(async (tx) => {
				await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`exam-submission:${record.id}:${studentUserId}`}, 0))`);
				await tx.insert(examSubmission).values({ activityId: record.id, studentUserId }).onConflictDoNothing();
				const [submission] = await tx.select().from(examSubmission).where(and(
					eq(examSubmission.activityId, record.id), eq(examSubmission.studentUserId, studentUserId)
				)).limit(1);
				const now = new Date();
				for (const file of prepared) {
					const [last] = await tx.select({ revision: max(examSubmissionFile.revision) }).from(examSubmissionFile).where(and(
						eq(examSubmissionFile.submissionId, submission.id), eq(examSubmissionFile.referenceImageId, file.referenceImageId)
					));
					await tx.update(examSubmissionFile).set({ isCurrent: false, replacedAt: now }).where(and(
						eq(examSubmissionFile.submissionId, submission.id),
						eq(examSubmissionFile.referenceImageId, file.referenceImageId),
						eq(examSubmissionFile.isCurrent, true)
					));
					await tx.insert(examSubmissionFile).values({ ...file, submissionId: submission.id, revision: Number(last?.revision ?? 0) + 1 });
				}
				await tx.update(examSubmission).set({ updatedAt: now }).where(eq(examSubmission.id, submission.id));
				return { id: submission.id, uploaded: prepared.length };
			});
		} catch (error) {
			await Promise.allSettled(prepared.map((file) => localStorageService.remove(file.storageKey)));
			throw error;
		}
	},

	/**
	 * Soft-delete the student's current file for a view (sets removedAt).
	 * The binary stays on disk and the row stays in the history.
	 */
	async removeFile(fileId, currentUser) {
		requireUser(currentUser);
		const id = numericId(fileId, 'fileId');
		const [file] = await db.select({
			id: examSubmissionFile.id,
			submissionId: examSubmissionFile.submissionId,
			activityId: examSubmission.activityId,
			studentUserId: examSubmission.studentUserId,
			isCurrent: examSubmissionFile.isCurrent
		}).from(examSubmissionFile).innerJoin(examSubmission, eq(examSubmission.id, examSubmissionFile.submissionId))
			.where(eq(examSubmissionFile.id, id)).limit(1);
		if (!file) throw new ApiError(404, 'Exam file not found.', 'EXAM_FILE_NOT_FOUND');
		const { record } = await requireExam(file.activityId, currentUser);
		if (file.studentUserId !== numericId(currentUser.id, 'userId')) throw new ApiError(403, 'You cannot remove this exam file.', 'EXAM_SUBMISSION_DENIED');
		assertSubmissionWindow(record);
		if (!file.isCurrent) throw new ApiError(409, 'Only the current file can be removed.', 'EXAM_FILE_NOT_CURRENT');
		const now = new Date();
		await db.transaction(async (tx) => {
			await tx.update(examSubmissionFile).set({ isCurrent: false, removedAt: now }).where(eq(examSubmissionFile.id, id));
			await tx.update(examSubmission).set({ updatedAt: now }).where(eq(examSubmission.id, file.submissionId));
		});
		return { id };
	}
};
