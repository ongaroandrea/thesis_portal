import { apiResponse, readJson } from '$lib/server/api/handler.js';
import { ApiError, requiredText } from '$lib/server/services/api.service.js';
import { activityReferenceImageService } from '$lib/server/services/activity-reference-image.service.js';
import { conversationService } from '$lib/server/services/conversation.service.js';
import { correctionSessionService } from '$lib/server/services/correction-session.service.js';

const TYPES = new Set(['camera', 'texture', 'light', 'material']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

function analysisType(focus) {
	if (focus.startsWith('Camera')) return 'camera';
	return { Illuminazione: 'light', Materiali: 'material', Texture: 'texture', 'Qualità generale': 'texture' }[focus];
}

function jobId(input) {
	return requiredText(input, 'jobId', 100);
}

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
	const referenceImage = await activityReferenceImageService.get(
		session.activityId,
		session.referenceImageId,
		locals.user
	);
	const referenceMatch = referenceImage.storageKey.match(DATA_URL_PATTERN);
	if (!referenceMatch) {
		throw new ApiError(415, 'The selected reference image must be JPEG, PNG or WEBP for analysis.', 'INVALID_REFERENCE_IMAGE');
	}
	const result = await conversationService.start({
		image: {
			data: Buffer.from(await image.arrayBuffer()),
			filename: image.name,
			mimeType: image.type
		},
		referenceImage: {
			data: Buffer.from(referenceMatch[2], 'base64'),
			filename: referenceImage.originalFilename,
			mimeType: referenceMatch[1]
		},
		type
	});
	await correctionSessionService.update(params.id, { status: 'PROCESSING' }, locals.user);
	return result;
}, 202);

export const GET = ({ params, url, locals }) => apiResponse(async () => {
	await correctionSessionService.requireSessionAccess(params.id, locals.user);
	return conversationService.get(jobId(url.searchParams.get('jobId')));
});

export const DELETE = ({ params, request, locals }) => apiResponse(async () => {
	await correctionSessionService.requireSessionAccess(params.id, locals.user);
	const input = await readJson(request);
	return conversationService.destroy(jobId(input.jobId));
});
