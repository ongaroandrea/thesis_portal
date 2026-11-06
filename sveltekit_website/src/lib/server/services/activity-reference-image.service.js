import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activityReferenceImage } from '$lib/server/db/schema';
import { ApiError, numericId, optionalText, requiredText, requireUser } from './api.service.js';
import { activityService } from './activity.service.js';
import { courseService } from './course.service.js';
import { localStorageService } from './local-storage.service.js';
import { maxReferenceImageBytes } from '$lib/upload-limits.js';

const VIEW_TYPES = ['FRONT', 'SIDE', 'TOP', 'ANGLED', 'OTHER'];
const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp|avif));base64,([A-Za-z0-9+/]+={0,2})$/;

/**
 * Validate a reference image sent as a data: URL (JPEG/PNG/WEBP/AVIF; max
 * 350 KB when compression is on, otherwise MAX_IMAGE_MB), write it to local storage and return the DB column values.
 * The file is written before the DB insert, so callers must delete it if
 * the insert fails.
 */
async function imageValues(input) {
	const maxBytes = maxReferenceImageBytes();
	// Base64 is 4/3 of the file size; the extra 100 chars cover the data: prefix.
	const dataUrl = requiredText(input.dataUrl, 'dataUrl', Math.ceil(maxBytes * 4 / 3) + 100);
	const match = dataUrl.match(DATA_URL_PATTERN);
	if (!match) throw new ApiError(400, 'Use a JPEG, PNG, WEBP or AVIF image.', 'INVALID_IMAGE');
	const approximateBytes = Math.floor(match[2].length * 3 / 4);
	if (approximateBytes > maxBytes) {
		throw new ApiError(400, `Each reference image must be no larger than ${Math.round(maxBytes / 1024)} KB.`, 'IMAGE_TOO_LARGE');
	}
	const mimeType = match[1];
	if (input.mimeType && input.mimeType !== mimeType) {
		throw new ApiError(400, 'The image MIME type does not match its data.', 'INVALID_IMAGE');
	}
	if (!VIEW_TYPES.includes(input.viewType)) {
		throw new ApiError(400, 'Invalid image view type.', 'VALIDATION_ERROR');
	}
	const customViewLabel = optionalText(input.customViewLabel ?? '', 'customViewLabel', 100) || null;
	if (input.viewType === 'OTHER' && !customViewLabel) {
		throw new ApiError(400, 'Specify the custom view name.', 'VALIDATION_ERROR');
	}
	const displayOrder = Number(input.displayOrder ?? 0);
	if (!Number.isInteger(displayOrder)) {
		throw new ApiError(400, 'displayOrder must be an integer.', 'VALIDATION_ERROR');
	}
	const originalFilename = requiredText(input.originalFilename, 'originalFilename', 255);
	const altText = optionalText(input.altText ?? '', 'altText', 500) || '';
	const storageKey = await localStorageService.save({
		base64: match[2],
		mimeType,
		category: 'reference-images'
	});
	return {
		storageKey,
		originalFilename,
		mimeType,
		viewType: input.viewType,
		customViewLabel: input.viewType === 'OTHER' ? customViewLabel : null,
		altText,
		displayOrder
	};
}

function imageMetadataValues(input) {
	if (!VIEW_TYPES.includes(input.viewType)) {
		throw new ApiError(400, 'Invalid image view type.', 'VALIDATION_ERROR');
	}
	const customViewLabel = optionalText(input.customViewLabel ?? '', 'customViewLabel', 100) || null;
	if (input.viewType === 'OTHER' && !customViewLabel) {
		throw new ApiError(400, 'Specify the custom view name.', 'VALIDATION_ERROR');
	}
	const displayOrder = Number(input.displayOrder ?? 0);
	if (!Number.isInteger(displayOrder)) {
		throw new ApiError(400, 'displayOrder must be an integer.', 'VALIDATION_ERROR');
	}
	return {
		viewType: input.viewType,
		customViewLabel: input.viewType === 'OTHER' ? customViewLabel : null,
		altText: optionalText(input.altText ?? '', 'altText', 500) || '',
		displayOrder
	};
}

async function requireManager(activityId, currentUser) {
	requireUser(currentUser);
	const record = await activityService.findActivity(activityId);
	await courseService.requireCourseManager(record.courseId, currentUser);
	return record;
}

export const activityReferenceImageService = {
	async get(activityId, imageId, currentUser) {
		const record = await activityService.requireActivityAccess(activityId, currentUser);
		const [image] = await db.select().from(activityReferenceImage)
			.where(and(
				eq(activityReferenceImage.id, numericId(imageId, 'imageId')),
				eq(activityReferenceImage.activityId, record.id)
			)).limit(1);
		if (!image) throw new ApiError(404, 'Reference image not found.', 'IMAGE_NOT_FOUND');
		return image;
	},

	async list(activityId, currentUser) {
		const record = await activityService.requireActivityAccess(activityId, currentUser);
		return db.select().from(activityReferenceImage)
			.where(eq(activityReferenceImage.activityId, record.id))
			.orderBy(asc(activityReferenceImage.displayOrder), asc(activityReferenceImage.id));
	},

	/**
	 * Upload one reference image (course managers only). The file is written
	 * by `imageValues` before the insert; if the insert fails the orphan file
	 * is removed again (best effort) and the original error is rethrown.
	 */
	async create(activityId, input, currentUser) {
		const record = await requireManager(activityId, currentUser);
		const values = await imageValues(input);
		try {
			const [created] = await db.insert(activityReferenceImage).values({
				...values,
				activityId: record.id,
				uploadedByUserId: numericId(currentUser.id, 'userId')
			}).returning();
			return created;
		} catch (error) {
			await Promise.allSettled([localStorageService.remove(values.storageKey)]);
			throw error;
		}
	},

	/**
	 * Replace the activity's whole set of reference images (max 6) in one go.
	 * Items with an `id` keep their file and only update metadata; items
	 * without one are new uploads. Order in the array becomes displayOrder.
	 * New files are written first and removed again if anything fails; files
	 * of images dropped from the set are deleted only after the DB commit.
	 */
	async sync(activityId, images, currentUser) {
		const record = await requireManager(activityId, currentUser);
		if (!Array.isArray(images) || images.length > 6) {
			throw new ApiError(400, 'Provide no more than 6 reference images.', 'VALIDATION_ERROR');
		}
		const currentImages = await db.select().from(activityReferenceImage)
			.where(eq(activityReferenceImage.activityId, record.id));
		const currentById = new Map(currentImages.map((image) => [image.id, image]));
		const seenIds = new Set();
		const prepared = [];
		const newStorageUrls = [];
		try {
			for (const [displayOrder, image] of images.entries()) {
				if (image.id !== undefined && image.id !== null) {
					const id = numericId(image.id, 'imageId');
					if (!currentById.has(id)) throw new ApiError(404, 'Reference image not found.', 'IMAGE_NOT_FOUND');
					if (seenIds.has(id)) throw new ApiError(400, 'A reference image cannot be included twice.', 'VALIDATION_ERROR');
					seenIds.add(id);
					prepared.push({ id, values: imageMetadataValues({ ...image, displayOrder }) });
				} else {
					const values = await imageValues({ ...image, displayOrder });
					newStorageUrls.push(values.storageKey);
					prepared.push({ id: null, values });
				}
			}
		} catch (error) {
			await Promise.allSettled(newStorageUrls.map((url) => localStorageService.remove(url)));
			throw error;
		}
		const removedStorageUrls = currentImages.filter((image) => !seenIds.has(image.id)).map((image) => image.storageKey);

		let result;
		try {
			result = await db.transaction(async (tx) => {
				for (const image of currentImages) {
					if (!seenIds.has(image.id)) {
						await tx.delete(activityReferenceImage).where(and(
							eq(activityReferenceImage.id, image.id),
							eq(activityReferenceImage.activityId, record.id)
						));
					}
				}
				for (const image of prepared) {
					if (image.id) {
						await tx.update(activityReferenceImage).set(image.values).where(and(
							eq(activityReferenceImage.id, image.id),
							eq(activityReferenceImage.activityId, record.id)
						));
					} else {
						await tx.insert(activityReferenceImage).values({
							...image.values,
							activityId: record.id,
							uploadedByUserId: numericId(currentUser.id, 'userId')
						});
					}
				}
				return tx.select().from(activityReferenceImage)
					.where(eq(activityReferenceImage.activityId, record.id))
					.orderBy(asc(activityReferenceImage.displayOrder), asc(activityReferenceImage.id));
			});
		} catch (error) {
			await Promise.allSettled(newStorageUrls.map((url) => localStorageService.remove(url)));
			throw error;
		}
		const cleanupResults = await Promise.allSettled(removedStorageUrls.map((url) => localStorageService.remove(url)));
		for (const cleanup of cleanupResults) {
			if (cleanup.status === 'rejected') console.error('Failed to remove an unreferenced local image:', cleanup.reason);
		}
		return result;
	},

	async update(activityId, imageId, input, currentUser) {
		const record = await requireManager(activityId, currentUser);
		const id = numericId(imageId, 'imageId');
		const [updated] = await db.update(activityReferenceImage)
			.set(imageMetadataValues(input))
			.where(and(
				eq(activityReferenceImage.id, id),
				eq(activityReferenceImage.activityId, record.id)
			))
			.returning();
		if (!updated) throw new ApiError(404, 'Reference image not found.', 'IMAGE_NOT_FOUND');
		return updated;
	},

	/**
	 * Delete a reference image row, then its file. The DB delete comes first
	 * so a failed file removal only leaves an unreferenced file on disk (just
	 * logged) instead of a row pointing at a missing file.
	 */
	async remove(activityId, imageId, currentUser) {
		const record = await requireManager(activityId, currentUser);
		const id = numericId(imageId, 'imageId');
		const [image] = await db.select({ id: activityReferenceImage.id, storageKey: activityReferenceImage.storageKey })
			.from(activityReferenceImage)
			.where(and(
				eq(activityReferenceImage.id, id),
				eq(activityReferenceImage.activityId, record.id)
			)).limit(1);
		if (!image) throw new ApiError(404, 'Reference image not found.', 'IMAGE_NOT_FOUND');
		await db.delete(activityReferenceImage).where(and(
			eq(activityReferenceImage.id, id),
			eq(activityReferenceImage.activityId, record.id)
		));
		try {
			await localStorageService.remove(image.storageKey);
		} catch (error) {
			console.error('Failed to remove an unreferenced local image:', error);
		}
		return { id: image.id };
	}
};
