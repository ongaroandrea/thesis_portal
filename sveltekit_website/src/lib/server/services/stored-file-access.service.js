import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activity, activityReferenceImage, examSubmission, examSubmissionFile } from '$lib/server/db/schema';
import { ApiError, numericId, requireUser } from './api.service.js';
import { activityService } from './activity.service.js';
import { courseService } from './course.service.js';
import { localStorageService } from './local-storage.service.js';

const notFound = () => new ApiError(404, 'Stored file not found.', 'STORED_FILE_NOT_FOUND');

async function isCourseManager(courseId, currentUser) {
	try {
		await courseService.requireCourseManager(courseId, currentUser);
		return true;
	} catch (error) {
		if (error instanceof ApiError && error.status === 403) return false;
		throw error;
	}
}

/** Reference images: readable by anyone who can view the activity. */
async function requireReferenceImageAccess(storageUrl, currentUser) {
	const [image] = await db.select({ activityId: activityReferenceImage.activityId })
		.from(activityReferenceImage).where(eq(activityReferenceImage.storageKey, storageUrl)).limit(1);
	if (!image) throw notFound();
	await activityService.requireActivityAccess(image.activityId, currentUser);
}

/**
 * Exam submission files: readable by course managers (admins included) and
 * by the submitting student while they still have access to the course.
 */
async function requireExamSubmissionAccess(storageUrl, currentUser) {
	const [file] = await db.select({
		studentUserId: examSubmission.studentUserId,
		courseId: activity.courseId
	}).from(examSubmissionFile)
		.innerJoin(examSubmission, eq(examSubmission.id, examSubmissionFile.submissionId))
		.innerJoin(activity, eq(activity.id, examSubmission.activityId))
		.where(eq(examSubmissionFile.storageKey, storageUrl)).limit(1);
	if (!file) throw notFound();
	if (await isCourseManager(file.courseId, currentUser)) return;
	if (file.studentUserId !== numericId(currentUser.id, 'userId')) {
		throw new ApiError(403, 'You cannot access this file.', 'STORED_FILE_ACCESS_DENIED');
	}
	await courseService.requireCourseAccess(file.courseId, currentUser);
}

export const storedFileAccessService = {
	/**
	 * Authorize a read of `/api/storage/<key>` by looking the key up in the
	 * table that owns it. Keys that are invalid, belong to an unknown
	 * category or are not referenced by any row are reported as 404.
	 * @throws {ApiError} 401, 403 or 404.
	 */
	async requireAccess(key, currentUser) {
		requireUser(currentUser);
		const category = localStorageService.categoryForKey(key);
		if (category === 'reference-images') {
			return requireReferenceImageAccess(localStorageService.urlForKey(key), currentUser);
		}
		if (category === 'exam-submissions') {
			return requireExamSubmissionAccess(localStorageService.urlForKey(key), currentUser);
		}
		throw notFound();
	}
};
