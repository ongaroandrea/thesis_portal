import { a as numericId, l as requireUser, o as optionalText, r as ApiError, u as requiredText } from "./handler.js";
import { r as activityReferenceImage, t as db } from "./db.js";
import { t as courseService } from "./course.service.js";
import { t as activityService } from "./activity.service.js";
import { and, asc, eq } from "drizzle-orm";
//#region src/lib/server/services/activity-reference-image.service.js
var VIEW_TYPES = [
	"FRONT",
	"SIDE",
	"TOP",
	"ANGLED",
	"OTHER"
];
var DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp|avif));base64,([A-Za-z0-9+/]+={0,2})$/;
var MAX_IMAGE_BYTES = 358400;
function imageValues(input) {
	const storageKey = requiredText(input.dataUrl, "dataUrl", 5e5);
	const match = storageKey.match(DATA_URL_PATTERN);
	if (!match) throw new ApiError(400, "Use a JPEG, PNG, WEBP or AVIF image.", "INVALID_IMAGE");
	if (Math.floor(match[2].length * 3 / 4) > MAX_IMAGE_BYTES) throw new ApiError(400, "Each reference image must be no larger than 350 KB.", "IMAGE_TOO_LARGE");
	const mimeType = match[1];
	if (input.mimeType && input.mimeType !== mimeType) throw new ApiError(400, "The image MIME type does not match its data.", "INVALID_IMAGE");
	if (!VIEW_TYPES.includes(input.viewType)) throw new ApiError(400, "Invalid image view type.", "VALIDATION_ERROR");
	const customViewLabel = optionalText(input.customViewLabel ?? "", "customViewLabel", 100) || null;
	if (input.viewType === "OTHER" && !customViewLabel) throw new ApiError(400, "Specify the custom view name.", "VALIDATION_ERROR");
	const displayOrder = Number(input.displayOrder ?? 0);
	if (!Number.isInteger(displayOrder)) throw new ApiError(400, "displayOrder must be an integer.", "VALIDATION_ERROR");
	return {
		storageKey,
		originalFilename: requiredText(input.originalFilename, "originalFilename", 255),
		mimeType,
		viewType: input.viewType,
		customViewLabel: input.viewType === "OTHER" ? customViewLabel : null,
		altText: optionalText(input.altText ?? "", "altText", 500) || "",
		displayOrder
	};
}
function imageMetadataValues(input) {
	if (!VIEW_TYPES.includes(input.viewType)) throw new ApiError(400, "Invalid image view type.", "VALIDATION_ERROR");
	const customViewLabel = optionalText(input.customViewLabel ?? "", "customViewLabel", 100) || null;
	if (input.viewType === "OTHER" && !customViewLabel) throw new ApiError(400, "Specify the custom view name.", "VALIDATION_ERROR");
	const displayOrder = Number(input.displayOrder ?? 0);
	if (!Number.isInteger(displayOrder)) throw new ApiError(400, "displayOrder must be an integer.", "VALIDATION_ERROR");
	return {
		viewType: input.viewType,
		customViewLabel: input.viewType === "OTHER" ? customViewLabel : null,
		altText: optionalText(input.altText ?? "", "altText", 500) || "",
		displayOrder
	};
}
async function requireManager(activityId, currentUser) {
	requireUser(currentUser);
	const record = await activityService.findActivity(activityId);
	await courseService.requireCourseManager(record.courseId, currentUser);
	return record;
}
var activityReferenceImageService = {
	async list(activityId, currentUser) {
		const record = await activityService.requireActivityAccess(activityId, currentUser);
		return db.select().from(activityReferenceImage).where(eq(activityReferenceImage.activityId, record.id)).orderBy(asc(activityReferenceImage.displayOrder), asc(activityReferenceImage.id));
	},
	async create(activityId, input, currentUser) {
		const record = await requireManager(activityId, currentUser);
		const [created] = await db.insert(activityReferenceImage).values({
			...imageValues(input),
			activityId: record.id,
			uploadedByUserId: numericId(currentUser.id, "userId")
		}).returning();
		return created;
	},
	async sync(activityId, images, currentUser) {
		const record = await requireManager(activityId, currentUser);
		if (!Array.isArray(images) || images.length > 6) throw new ApiError(400, "Provide no more than 6 reference images.", "VALIDATION_ERROR");
		const currentImages = await db.select().from(activityReferenceImage).where(eq(activityReferenceImage.activityId, record.id));
		const currentById = new Map(currentImages.map((image) => [image.id, image]));
		const seenIds = /* @__PURE__ */ new Set();
		const prepared = images.map((image, displayOrder) => {
			if (image.id !== void 0 && image.id !== null) {
				const id = numericId(image.id, "imageId");
				if (!currentById.has(id)) throw new ApiError(404, "Reference image not found.", "IMAGE_NOT_FOUND");
				if (seenIds.has(id)) throw new ApiError(400, "A reference image cannot be included twice.", "VALIDATION_ERROR");
				seenIds.add(id);
				return {
					id,
					values: imageMetadataValues({
						...image,
						displayOrder
					})
				};
			}
			return {
				id: null,
				values: imageValues({
					...image,
					displayOrder
				})
			};
		});
		return db.transaction(async (tx) => {
			for (const image of currentImages) if (!seenIds.has(image.id)) await tx.delete(activityReferenceImage).where(and(eq(activityReferenceImage.id, image.id), eq(activityReferenceImage.activityId, record.id)));
			for (const image of prepared) if (image.id) await tx.update(activityReferenceImage).set(image.values).where(and(eq(activityReferenceImage.id, image.id), eq(activityReferenceImage.activityId, record.id)));
			else await tx.insert(activityReferenceImage).values({
				...image.values,
				activityId: record.id,
				uploadedByUserId: numericId(currentUser.id, "userId")
			});
			return tx.select().from(activityReferenceImage).where(eq(activityReferenceImage.activityId, record.id)).orderBy(asc(activityReferenceImage.displayOrder), asc(activityReferenceImage.id));
		});
	},
	async update(activityId, imageId, input, currentUser) {
		const record = await requireManager(activityId, currentUser);
		const id = numericId(imageId, "imageId");
		const [updated] = await db.update(activityReferenceImage).set(imageMetadataValues(input)).where(and(eq(activityReferenceImage.id, id), eq(activityReferenceImage.activityId, record.id))).returning();
		if (!updated) throw new ApiError(404, "Reference image not found.", "IMAGE_NOT_FOUND");
		return updated;
	},
	async remove(activityId, imageId, currentUser) {
		const record = await requireManager(activityId, currentUser);
		const id = numericId(imageId, "imageId");
		const [image] = await db.select({ id: activityReferenceImage.id }).from(activityReferenceImage).where(and(eq(activityReferenceImage.id, id), eq(activityReferenceImage.activityId, record.id))).limit(1);
		if (!image) throw new ApiError(404, "Reference image not found.", "IMAGE_NOT_FOUND");
		await db.delete(activityReferenceImage).where(and(eq(activityReferenceImage.id, id), eq(activityReferenceImage.activityId, record.id)));
		return { id: image.id };
	}
};
//#endregion
export { activityReferenceImageService as t };
