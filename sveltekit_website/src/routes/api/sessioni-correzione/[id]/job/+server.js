import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { ApiError, requiredText } from '$lib/server/services/api.service.js';
import { activityReferenceImageService } from '$lib/server/services/activity-reference-image.service.js';
import { conversationService } from '$lib/server/services/conversation.service.js';
import { correctionSessionService } from '$lib/server/services/correction-session.service.js';
import { correctionAttemptService } from '$lib/server/services/correction-attempt.service.js';
import { analysisJobService } from '$lib/server/services/analysis-job.service.js';
import { promptBuilderService } from '$lib/server/services/prompt-builder.service.js';
import { localStorageService } from '$lib/server/services/local-storage.service.js';
import { correctionFocusOption } from '$lib/correction-focus.js';

const TYPES = new Set(['camera', 'texture', 'light', 'material', 'general']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

function analysisType(focus) {
	return correctionFocusOption(focus)?.analysisType;
}

function jobId(input) {
	return requiredText(input, 'jobId', 100);
}

/**
 * Start an analysis for a correction session (owner only).
 * Flow: check the session and correction limit, validate the uploaded image
 * (JPEG/PNG/WEBP, max 12 MB), build the prompt, load the locked reference
 * image from local storage, send both images in one signed request to
 * Python, then record the attempt and the prompt snapshot. If recording
 * fails, the Python job is cancelled so no orphan job keeps running.
 * The student's image is not stored by the portal; only its filename is.
 * Returns `{ id: null, status: 'unavailable' }` if Python is not configured.
 */
export const POST = ({ params, request, locals }) => apiResponse(async () => {
	const session = await correctionSessionService.requireCorrectionAvailable(params.id, locals.user);
	const form = await request.formData();
	const image = form.get('image');
	const focus = String(form.get('focus') || '');
	const referenceImageId = Number(form.get('referenceImageId'));
	const type = analysisType(session.analysisFocus || focus);
	if (!(image instanceof File) || image.size === 0) {
		throw new ApiError(400, 'Select an image to analyze.', 'INVALID_IMAGE');
	}
	if (!IMAGE_TYPES.has(image.type)) {
		throw new ApiError(400, 'Use a JPEG, PNG or WEBP image.', 'INVALID_IMAGE');
	}
	if (image.size > MAX_IMAGE_BYTES) {
		throw new ApiError(413, 'The image cannot exceed 12 MB.', 'IMAGE_TOO_LARGE');
	}
	if (!TYPES.has(type)) throw new ApiError(409, 'The correction session has an unsupported analysis type. Create a new conversation.', 'CONVERSATION_SETTINGS_LOCKED');
	if (session.analysisFocus && focus !== session.analysisFocus) {
		throw new ApiError(409, 'The analysis type is locked for this conversation. Create a new conversation to use a different one.', 'CONVERSATION_SETTINGS_LOCKED');
	}
	if (session.referenceImageId && referenceImageId !== session.referenceImageId) {
		throw new ApiError(409, 'The point of view is locked for this conversation. Create a new conversation to use a different one.', 'CONVERSATION_SETTINGS_LOCKED');
	}
	if (!conversationService.isConfigured()) return { id: null, status: 'unavailable', position: null };
	const prompt = await promptBuilderService.build(session.activityId, type);
	const referenceImage = await activityReferenceImageService.get(
		session.activityId,
		session.referenceImageId,
		locals.user
	);
	const localKey = localStorageService.keyFromUrl(referenceImage.storageKey);
	const referenceMatch = referenceImage.storageKey.match(DATA_URL_PATTERN);
	if (!localKey && !referenceMatch) {
		throw new ApiError(415, 'The selected reference image must be JPEG, PNG or WEBP for analysis.', 'INVALID_REFERENCE_IMAGE');
	}
	let referenceData;
	try {
		referenceData = localKey
			? await localStorageService.read(localKey)
			: Buffer.from(referenceMatch[2], 'base64');
	} catch (error) {
		if (error?.code === 'ENOENT') {
			throw new ApiError(404, 'The selected reference image file was not found.', 'REFERENCE_IMAGE_NOT_FOUND');
		}
		throw error;
	}
	const result = await conversationService.start({
		image: {
			data: Buffer.from(await image.arrayBuffer()),
			filename: image.name,
			mimeType: image.type
		},
		referenceImage: {
			data: referenceData,
			filename: referenceImage.originalFilename,
			mimeType: referenceImage.mimeType
		},
		prompt: { ...prompt, type }
	});
	if (result.id) {
		let attempt = null;
		try {
			attempt = await correctionAttemptService.createFromTrustedJob({
				sessionId: session.id,
				imageName: image.name,
				focus: session.analysisFocus,
				viewType: referenceImage.viewType,
				viewLabel: referenceImage.viewType === 'OTHER'
					? (referenceImage.customViewLabel || 'Altra vista')
					: ({ FRONT: 'Vista frontale', SIDE: 'Vista laterale', TOP: 'Vista dall’alto', ANGLED: 'Vista angolata' }[referenceImage.viewType] || referenceImage.viewType),
				referenceImageId: referenceImage.id
			}, locals.user, result);
			await analysisJobService.registerCorrection(attempt.id, result, prompt);
		} catch (error) {
			await conversationService.destroy(result.id).catch(() => {});
			if (attempt?.id) await correctionAttemptService.remove(attempt.id, locals.user).catch(() => {});
			throw error;
		}
	}
	return result;
}, 202);

/**
 * Poll a job. Fetches its state from Python, validates a completed result
 * against the stored output schema (invalid output is reported as failed),
 * and mirrors the state into analysis_job and correction_attempt.
 */
export const GET = ({ params, url, locals }) => apiResponse(async () => {
	await correctionSessionService.requireSessionAccess(params.id, locals.user);
	const id = jobId(url.searchParams.get('jobId'));
	await correctionAttemptService.requireTrustedJob(params.id, id, locals.user);
	const job = await conversationService.get(id);
	const validation = await analysisJobService.syncProvider(id, job);
	const trustedJob = validation && !validation.valid
		? { ...job, status: 'failed', error: `Invalid model output: ${validation.validationErrors.join(' ')}` }
		: job;
	await correctionAttemptService.syncTrustedJob(params.id, id, trustedJob, locals.user);
	return trustedJob;
});

/** Cancel a job in Python and mark the attempt as cancelled. */
export const DELETE = ({ params, request, locals }) => apiResponse(async () => {
	await correctionSessionService.requireSessionAccess(params.id, locals.user);
	const input = await readJson(request);
	const id = jobId(input.jobId);
	await correctionAttemptService.requireTrustedJob(params.id, id, locals.user);
	const result = await conversationService.destroy(id);
	await correctionAttemptService.cancelTrustedJob(params.id, id, locals.user);
	return result;
});
