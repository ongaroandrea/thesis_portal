import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { analysisJob } from '$lib/server/db/schema.js';

function statusForProvider(status) {
	if (status === 'completed') return 'completed';
	if (status === 'failed') return 'failed';
	return 'pending';
}

/**
 * Minimal JSON-Schema check of the model output: verifies `type`, `required`
 * keys, nested `properties` and array `items`. Other keywords (enum,
 * min/max, etc.) are ignored.
 * @returns {string[]} human-readable errors, empty when valid
 */
function validateSchema(value, schema, path = '$') {
	if (!schema || typeof schema !== 'object') return [];
	const errors = [];
	const type = schema.type;
	const matches = type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
		: type === 'array' ? Array.isArray(value)
			: type === 'string' ? typeof value === 'string'
				: type === 'number' || type === 'integer' ? typeof value === 'number' && Number.isFinite(value) && (type !== 'integer' || Number.isInteger(value))
					: type === 'boolean' ? typeof value === 'boolean' : true;
	if (!matches) return [`${path} must be ${type}.`];
	if (type === 'object') {
		for (const key of schema.required ?? []) {
			if (!(key in value)) errors.push(`${path}.${key} is required.`);
		}
		for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
			if (key in value) errors.push(...validateSchema(value[key], childSchema, `${path}.${key}`));
		}
	}
	if (type === 'array' && schema.items) {
		value.forEach((item, index) => errors.push(...validateSchema(item, schema.items, `${path}[${index}]`)));
	}
	return errors;
}

export const analysisJobService = {
	/** Store the prompt snapshot, hash and model used for a newly queued job. */
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

	/**
	 * Persist the latest worker state for a job. A completed job whose result
	 * does not match the stored output schema is recorded as failed.
	 * @returns {Promise<{record, valid, validationErrors}|null>} null if the job
	 *   is unknown to the database
	 */
	async syncProvider(providerJobId, job) {
		const [record] = await db.select().from(analysisJob)
			.where(eq(analysisJob.providerJobId, providerJobId)).limit(1);
		if (!record) return null;
		const validationErrors = job.status === 'completed'
			? validateSchema(job.result, record.promptSnapshot?.outputSchema)
			: [];
		const valid = validationErrors.length === 0;
		const values = {
			status: valid ? statusForProvider(job.status) : 'failed',
			rawResult: job,
			error: valid ? (job.error ?? null) : `Invalid model output: ${validationErrors.join(' ')}`,
			startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
			completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
			updatedAt: new Date()
		};
		if (job.status === 'completed' && valid) values.validatedResult = job.result ?? null;
		const [updated] = await db.update(analysisJob).set(values)
			.where(eq(analysisJob.providerJobId, providerJobId)).returning();
		return updated ? { record: updated, valid, validationErrors } : null;
	}
};
