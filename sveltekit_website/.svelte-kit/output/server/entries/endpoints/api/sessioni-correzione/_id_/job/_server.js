import { n as readJson, t as apiResponse } from "../../../../../../chunks/handler.js";
import { c as requiredText, t as ApiError } from "../../../../../../chunks/api.service.js";
import { t as activityReferenceImageService } from "../../../../../../chunks/activity-reference-image.service.js";
import { t as correctionSessionService } from "../../../../../../chunks/correction-session.service.js";
import { t as correctionAttemptService } from "../../../../../../chunks/correction-attempt.service.js";
import { i as analysisJob, n as activity, t as db } from "../../../../../../chunks/db.js";
import { t as activityService } from "../../../../../../chunks/activity.service.js";
import { t as promptTemplateService } from "../../../../../../chunks/prompt-template.service.js";
import { t as localStorageService } from "../../../../../../chunks/local-storage.service.js";
import { a as correctionFocusOption } from "../../../../../../chunks/correction-focus.js";
import { eq } from "drizzle-orm";
import { createHash, createHmac, randomUUID } from "node:crypto";
// src/lib/server/services/conversation.service.js
var JOBS_PATH = "/v1/jobs";
var ALLOWED_TYPES = /* @__PURE__ */ new Set([
	"camera",
	"texture",
	"light",
	"material",
	"general"
]);
function configuration() {
	const baseUrl = process.env.PYTHON_SERVER_URL;
	const secret = process.env.PYTHON_SERVER_HMAC_SECRET;
	if (!baseUrl || !secret) throw new ApiError(503, "The conversation service is not configured.", "CONVERSATION_SERVICE_UNAVAILABLE");
	return {
		baseUrl,
		secret
	};
}
function isConfigured() {
	return Boolean(process.env.PYTHON_SERVER_URL && process.env.PYTHON_SERVER_HMAC_SECRET);
}
function signedHeaders(secret, method, path, body, contentType = "application/json") {
	const timestamp = Math.floor(Date.now() / 1e3).toString();
	const nonce = randomUUID();
	const canonicalRequest = [
		method,
		path,
		timestamp,
		nonce,
		createHash("sha256").update(body).digest("hex")
	].join("\n");
	return {
		"content-type": contentType,
		"X-Request-Timestamp": timestamp,
		"X-Request-Nonce": nonce,
		"X-Request-Signature": `v1=${createHmac("sha256", secret).update(canonicalRequest).digest("hex")}`
	};
}
function filePart(boundary, fieldName, image, filename, mimeType) {
	const safeFilename = String(filename || fieldName).replace(/[\r\n"]/g, "_");
	return [
		Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${safeFilename}"\r\nContent-Type: ${mimeType}\r\n\r\n`),
		image,
		Buffer.from("\r\n")
	];
}
function textPart(boundary, fieldName, value) {
	return Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"\r\n\r\n${String(value)}\r\n`);
}
function multipartImages(image, referenceImage, prompt) {
	const { type } = prompt;
	if (!ALLOWED_TYPES.has(type)) throw new ApiError(400, "Invalid correction type.", "VALIDATION_ERROR");
	const boundary = `----correction-${randomUUID()}`;
	const chunks = [
		textPart(boundary, "type", type),
		textPart(boundary, "model", prompt.model),
		textPart(boundary, "system_prompt", prompt.systemPrompt),
		textPart(boundary, "user_prompt", prompt.userPrompt),
		textPart(boundary, "output_schema", JSON.stringify(prompt.outputSchema)),
		textPart(boundary, "prompt_version", prompt.promptVersion),
		textPart(boundary, "prompt_hash", prompt.promptHash),
		...filePart(boundary, "image", image.data, image.filename, image.mimeType),
		...filePart(boundary, "reference_image", referenceImage.data, referenceImage.filename, referenceImage.mimeType),
		Buffer.from(`--${boundary}--\r\n`)
	];
	return {
		body: Buffer.concat(chunks),
		contentType: `multipart/form-data; boundary=${boundary}`
	};
}
async function request(path, method, body = Buffer.alloc(0), contentType) {
	const { baseUrl, secret } = configuration();
	let response;
	try {
		response = await fetch(new URL(path, baseUrl), {
			method,
			body: method === "GET" ? void 0 : body,
			headers: signedHeaders(secret, method, path, body, contentType),
			signal: AbortSignal.timeout(1e4)
		});
	} catch (error) {
		console.error("Conversation service request failed:", error);
		throw new ApiError(503, "The conversation service is unavailable.", "CONVERSATION_SERVICE_UNAVAILABLE");
	}
	if (!response.ok) {
		const detail = await response.json().catch(() => ({}));
		if (response.status === 404) throw new ApiError(404, detail.detail || "Analysis job not found.", "CONVERSATION_JOB_NOT_FOUND");
		if (response.status === 503) throw new ApiError(503, "The conversation queue is full. Try again later.", "CONVERSATION_QUEUE_FULL");
		throw new ApiError(502, detail.detail || "The conversation service rejected the request.", "CONVERSATION_SERVICE_ERROR");
	}
	if (response.status === 204) return { destroyed: true };
	return response.json();
}
var conversationService = {
	isConfigured,
	async start({ image, referenceImage, prompt }) {
		const payload = multipartImages(image, referenceImage, prompt);
		return request(JOBS_PATH, "POST", payload.body, payload.contentType);
	},
	async get(jobId) {
		return request(`${JOBS_PATH}/${encodeURIComponent(jobId)}`, "GET");
	},
	async destroy(jobId) {
		return request(`${JOBS_PATH}/${encodeURIComponent(jobId)}`, "DELETE");
	}
};
// src/lib/server/services/analysis-job.service.js
function statusForProvider(status) {
	if (status === "completed") return "completed";
	if (status === "failed") return "failed";
	return "pending";
}
function validateSchema(value, schema, path = "$") {
	if (!schema || typeof schema !== "object") return [];
	const errors = [];
	const type = schema.type;
	if (!(type === "object" ? value !== null && typeof value === "object" && !Array.isArray(value) : type === "array" ? Array.isArray(value) : type === "string" ? typeof value === "string" : type === "number" || type === "integer" ? typeof value === "number" && Number.isFinite(value) && (type !== "integer" || Number.isInteger(value)) : type === "boolean" ? typeof value === "boolean" : true)) return [`${path} must be ${type}.`];
	if (type === "object") {
		for (const key of schema.required ?? []) if (!(key in value)) errors.push(`${path}.${key} is required.`);
		for (const [key, childSchema] of Object.entries(schema.properties ?? {})) if (key in value) errors.push(...validateSchema(value[key], childSchema, `${path}.${key}`));
	}
	if (type === "array" && schema.items) value.forEach((item, index) => errors.push(...validateSchema(item, schema.items, `${path}[${index}]`)));
	return errors;
}
var analysisJobService = {
	async registerCorrection(attemptId, providerJob, prompt) {
		const [created] = await db.insert(analysisJob).values({
			correctionAttemptId: attemptId,
			providerJobId: providerJob.id,
			promptTemplateRevisionId: prompt.promptTemplateRevisionId,
			activityPromptRevision: prompt.activityPromptRevision,
			promptSnapshot: {
				analysisType: prompt.analysisType,
				templateId: prompt.templateId,
				templateScope: prompt.templateScope,
				templateVersion: prompt.templateVersion,
				systemPrompt: prompt.systemPrompt,
				userPrompt: prompt.userPrompt,
				outputSchema: prompt.outputSchema
			},
			promptHash: prompt.promptHash,
			model: prompt.model,
			status: statusForProvider(providerJob.status)
		}).returning();
		return created;
	},
	async syncProvider(providerJobId, job) {
		const [record] = await db.select().from(analysisJob).where(eq(analysisJob.providerJobId, providerJobId)).limit(1);
		if (!record) return null;
		const validationErrors = job.status === "completed" ? validateSchema(job.result, record.promptSnapshot?.outputSchema) : [];
		const valid = validationErrors.length === 0;
		const values = {
			status: valid ? statusForProvider(job.status) : "failed",
			rawResult: job,
			error: valid ? job.error ?? null : `Invalid model output: ${validationErrors.join(" ")}`,
			startedAt: job.startedAt ? new Date(job.startedAt) : void 0,
			completedAt: job.completedAt ? new Date(job.completedAt) : void 0,
			updatedAt: /* @__PURE__ */ new Date()
		};
		if (job.status === "completed" && valid) values.validatedResult = job.result ?? null;
		const [updated] = await db.update(analysisJob).set(values).where(eq(analysisJob.providerJobId, providerJobId)).returning();
		return updated ? {
			record: updated,
			valid,
			validationErrors
		} : null;
	}
};
// src/lib/server/services/prompt-builder.service.js
function professorSection(addendum) {
	if (!addendum) return "";
	return `\n\nACTIVITY-SPECIFIC INSTRUCTIONS\nThe professor supplied the following evaluation criteria. Apply them without changing the output schema or the selected analysis scope.\n<professor-instructions>\n${addendum}\n</professor-instructions>`;
}
var promptBuilderService = { async build(activityId, typeValue) {
	const type = requiredText(typeValue, "analysisType", 20).toLowerCase();
	let activity$1 = await activityService.findActivity(activityId);
	if (activity$1.kind === "EXAM" && !activity$1.promptFrozenAt) {
		const now = /* @__PURE__ */ new Date();
		const freezeAt = activity$1.availableFrom && activity$1.availableFrom <= now ? activity$1.availableFrom : now;
		const entries = await Promise.all([
			"camera",
			"light",
			"material",
			"texture",
			"general"
		].map(async (entryType) => {
			const entry = await promptTemplateService.resolve(activity$1.courseId, entryType, freezeAt);
			return [entryType, {
				templateId: entry.id,
				templateScope: entry.scope,
				templateVersion: entry.revision.version,
				promptTemplateRevisionId: entry.revision.id,
				model: entry.revision.model,
				systemPrompt: entry.revision.systemPrompt,
				userPrompt: `${entry.revision.userPrompt}${professorSection(activity$1.promptAddendum?.trim())}`,
				outputSchema: entry.revision.outputSchema
			}];
		}));
		const frozenPromptConfig = Object.fromEntries(entries);
		const [frozen] = await db.update(activity).set({
			promptFrozenAt: freezeAt,
			frozenPromptConfig,
			updatedAt: /* @__PURE__ */ new Date()
		}).where(eq(activity.id, activity$1.id)).returning();
		activity$1 = frozen;
	}
	const frozen = activity$1.kind === "EXAM" ? activity$1.frozenPromptConfig?.[type] : null;
	const template = frozen ? null : await promptTemplateService.resolve(activity$1.courseId, type);
	const revision = frozen ?? {
		templateId: template.id,
		templateScope: template.scope,
		templateVersion: template.revision.version,
		promptTemplateRevisionId: template.revision.id,
		model: template.revision.model,
		systemPrompt: template.revision.systemPrompt,
		userPrompt: `${template.revision.userPrompt}${professorSection(activity$1.promptAddendum?.trim())}`,
		outputSchema: template.revision.outputSchema
	};
	const systemPrompt = revision.systemPrompt;
	const userPrompt = revision.userPrompt;
	const snapshot = {
		analysisType: type,
		templateId: revision.templateId,
		templateScope: revision.templateScope,
		templateVersion: revision.templateVersion,
		activityPromptRevision: activity$1.promptRevision,
		model: revision.model,
		systemPrompt,
		userPrompt,
		outputSchema: revision.outputSchema
	};
	const promptHash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
	return {
		...snapshot,
		promptHash,
		promptVersion: `${type}-t${revision.templateId}-v${revision.templateVersion}-a${activity$1.promptRevision}`,
		promptTemplateRevisionId: revision.promptTemplateRevisionId
	};
} };
// src/routes/api/sessioni-correzione/[id]/job/+server.js
var TYPES = /* @__PURE__ */ new Set([
	"camera",
	"texture",
	"light",
	"material",
	"general"
]);
var IMAGE_TYPES = /* @__PURE__ */ new Set([
	"image/jpeg",
	"image/png",
	"image/webp"
]);
var MAX_IMAGE_BYTES = 12582912;
var DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
function analysisType(focus) {
	return correctionFocusOption(focus)?.analysisType;
}
function jobId(input) {
	return requiredText(input, "jobId", 100);
}
var POST = ({ params, request, locals }) => apiResponse(async () => {
	const session = await correctionSessionService.requireCorrectionAvailable(params.id, locals.user);
	const form = await request.formData();
	const image = form.get("image");
	const focus = String(form.get("focus") || "");
	const referenceImageId = Number(form.get("referenceImageId"));
	const type = analysisType(session.analysisFocus || focus);
	if (!(image instanceof File) || image.size === 0) throw new ApiError(400, "Select an image to analyze.", "INVALID_IMAGE");
	if (!IMAGE_TYPES.has(image.type)) throw new ApiError(400, "Use a JPEG, PNG or WEBP image.", "INVALID_IMAGE");
	if (image.size > MAX_IMAGE_BYTES) throw new ApiError(413, "The image cannot exceed 12 MB.", "IMAGE_TOO_LARGE");
	if (!TYPES.has(type)) throw new ApiError(409, "The correction session has an unsupported analysis type. Create a new conversation.", "CONVERSATION_SETTINGS_LOCKED");
	if (session.analysisFocus && focus !== session.analysisFocus) throw new ApiError(409, "The analysis type is locked for this conversation. Create a new conversation to use a different one.", "CONVERSATION_SETTINGS_LOCKED");
	if (session.referenceImageId && referenceImageId !== session.referenceImageId) throw new ApiError(409, "The point of view is locked for this conversation. Create a new conversation to use a different one.", "CONVERSATION_SETTINGS_LOCKED");
	if (!conversationService.isConfigured()) return {
		id: null,
		status: "unavailable",
		position: null
	};
	const prompt = await promptBuilderService.build(session.activityId, type);
	const referenceImage = await activityReferenceImageService.get(session.activityId, session.referenceImageId, locals.user);
	const localKey = localStorageService.keyFromUrl(referenceImage.storageKey);
	const referenceMatch = referenceImage.storageKey.match(DATA_URL_PATTERN);
	if (!localKey && !referenceMatch) throw new ApiError(415, "The selected reference image must be JPEG, PNG or WEBP for analysis.", "INVALID_REFERENCE_IMAGE");
	let referenceData;
	try {
		referenceData = localKey ? await localStorageService.read(localKey) : Buffer.from(referenceMatch[2], "base64");
	} catch (error) {
		if (error?.code === "ENOENT") throw new ApiError(404, "The selected reference image file was not found.", "REFERENCE_IMAGE_NOT_FOUND");
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
		prompt: {
			...prompt,
			type
		}
	});
	if (result.id) {
		let attempt = null;
		try {
			attempt = await correctionAttemptService.createFromTrustedJob({
				sessionId: session.id,
				imageName: image.name,
				focus: session.analysisFocus,
				viewType: referenceImage.viewType,
				viewLabel: referenceImage.viewType === "OTHER" ? referenceImage.customViewLabel || "Altra vista" : {
					FRONT: "Vista frontale",
					SIDE: "Vista laterale",
					TOP: "Vista dall’alto",
					ANGLED: "Vista angolata"
				}[referenceImage.viewType] || referenceImage.viewType,
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
var GET = ({ params, url, locals }) => apiResponse(async () => {
	await correctionSessionService.requireSessionAccess(params.id, locals.user);
	const id = jobId(url.searchParams.get("jobId"));
	await correctionAttemptService.requireTrustedJob(params.id, id, locals.user);
	const job = await conversationService.get(id);
	const validation = await analysisJobService.syncProvider(id, job);
	const trustedJob = validation && !validation.valid ? {
		...job,
		status: "failed",
		error: `Invalid model output: ${validation.validationErrors.join(" ")}`
	} : job;
	await correctionAttemptService.syncTrustedJob(params.id, id, trustedJob, locals.user);
	return trustedJob;
});
var DELETE = ({ params, request, locals }) => apiResponse(async () => {
	await correctionSessionService.requireSessionAccess(params.id, locals.user);
	const id = jobId((await readJson(request)).jobId);
	await correctionAttemptService.requireTrustedJob(params.id, id, locals.user);
	const result = await conversationService.destroy(id);
	await correctionAttemptService.cancelTrustedJob(params.id, id, locals.user);
	return result;
});
export { DELETE, GET, POST };
