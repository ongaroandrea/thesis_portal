import { and, asc, desc, eq, lte, max, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { promptTemplate, promptTemplateRevision } from '$lib/server/db/schema.js';
import { ApiError, numericId, requiredText, requireUser } from './api.service.js';
import { courseService } from './course.service.js';

export const PROMPT_ANALYSIS_TYPES = new Set(['camera', 'light', 'material', 'texture', 'general']);

function analysisType(value) {
	const type = requiredText(value, 'analysisType', 20).toLowerCase();
	if (!PROMPT_ANALYSIS_TYPES.has(type)) {
		throw new ApiError(400, 'Invalid prompt analysis type.', 'VALIDATION_ERROR');
	}
	return type;
}

function outputSchema(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new ApiError(400, 'outputSchema must be a JSON object.', 'VALIDATION_ERROR');
	}
	const serialized = JSON.stringify(value);
	if (serialized.length > 50_000) {
		throw new ApiError(400, 'outputSchema cannot exceed 50,000 characters.', 'VALIDATION_ERROR');
	}
	return value;
}

/**
 * Decide which prompt scope a request targets and whether the user may use it.
 * No courseId means GLOBAL (admins only); a courseId means that course's
 * overrides (course managers only).
 */
async function authorizeScope(courseId, currentUser) {
	requireUser(currentUser);
	if (courseId == null || courseId === '') {
		if (currentUser.role !== 'admin') {
			throw new ApiError(403, 'Only admins can manage global prompts.', 'PROMPT_GLOBAL_ACCESS_DENIED');
		}
		return { scope: 'GLOBAL', courseId: null };
	}
	const id = numericId(courseId, 'courseId');
	await courseService.requireCourseManager(id, currentUser);
	return { scope: 'COURSE', courseId: id };
}

/**
 * Load a template's revision: the active one, or, when `at` is given, the
 * newest revision created on or before that date (used to freeze exams).
 */
async function activeRevisionFor(template, at = null) {
	const [revision] = await db.select().from(promptTemplateRevision).where(and(
		eq(promptTemplateRevision.templateId, template.id),
		at ? lte(promptTemplateRevision.createdAt, at) : eq(promptTemplateRevision.version, template.activeRevision)
	)).orderBy(desc(promptTemplateRevision.version)).limit(1);
	if (!revision) {
		throw new ApiError(500, 'The active prompt revision is missing.', 'PROMPT_REVISION_MISSING');
	}
	return { ...template, revision };
}

/**
 * Pick the prompt for a course and analysis type: a course override wins,
 * otherwise the global template is used. Throws 503 if neither exists.
 */
async function resolve(courseId, typeValue, at = null) {
	const type = analysisType(typeValue);
	const id = numericId(courseId, 'courseId');
	const [courseTemplate] = await db.select().from(promptTemplate).where(and(
		eq(promptTemplate.scope, 'COURSE'),
		eq(promptTemplate.courseId, id),
		eq(promptTemplate.analysisType, type),
		at ? lte(promptTemplate.createdAt, at) : undefined
	)).limit(1);
	if (courseTemplate) {
		const resolved = await activeRevisionFor(courseTemplate, at);
		if (resolved) return resolved;
	}
	const [globalTemplate] = await db.select().from(promptTemplate).where(and(
		eq(promptTemplate.scope, 'GLOBAL'),
		eq(promptTemplate.analysisType, type),
		at ? lte(promptTemplate.createdAt, at) : undefined
	)).limit(1);
	if (!globalTemplate) {
		throw new ApiError(503, `No ${type} prompt template is configured.`, 'PROMPT_TEMPLATE_MISSING');
	}
	return activeRevisionFor(globalTemplate, at);
}

export const promptTemplateService = {
	resolve,

	/**
	 * List the effective prompts for a scope, each with its active revision.
	 * For GLOBAL only the global templates are returned. For a course, its own
	 * overrides come with `inherited: false` and every analysis type without
	 * an override is filled in from the global template with
	 * `inherited: true`, so the editor always shows one entry per type.
	 */
	async list(courseId, currentUser) {
		const scope = await authorizeScope(courseId, currentUser);
		const templates = await db.select().from(promptTemplate).where(
			scope.scope === 'GLOBAL'
				? eq(promptTemplate.scope, 'GLOBAL')
				: and(eq(promptTemplate.scope, 'COURSE'), eq(promptTemplate.courseId, scope.courseId))
		).orderBy(asc(promptTemplate.analysisType));

		const own = await Promise.all(templates.map((template) => activeRevisionFor(template)));
		if (scope.scope === 'GLOBAL') return own.map((entry) => ({ ...entry, inherited: false }));

		const ownTypes = new Set(own.map((entry) => entry.analysisType));
		const globals = await db.select().from(promptTemplate)
			.where(eq(promptTemplate.scope, 'GLOBAL')).orderBy(asc(promptTemplate.analysisType));
		const inherited = await Promise.all(globals
			.filter((entry) => !ownTypes.has(entry.analysisType))
			.map((template) => activeRevisionFor(template)));
		return [...own.map((entry) => ({ ...entry, inherited: false })), ...inherited.map((entry) => ({ ...entry, inherited: true }))]
			.sort((a, b) => a.analysisType.localeCompare(b.analysisType));
	},

	async history(templateId, currentUser) {
		requireUser(currentUser);
		const id = numericId(templateId, 'templateId');
		const [template] = await db.select().from(promptTemplate).where(eq(promptTemplate.id, id)).limit(1);
		if (!template) throw new ApiError(404, 'Prompt template not found.', 'PROMPT_TEMPLATE_NOT_FOUND');
		await authorizeScope(template.courseId, currentUser);
		return db.select().from(promptTemplateRevision)
			.where(eq(promptTemplateRevision.templateId, id)).orderBy(desc(promptTemplateRevision.version));
	},

	/**
	 * Append a new immutable revision and make it active. Revisions are never
	 * edited in place. An advisory lock per (scope, course, type) serializes
	 * concurrent saves so version numbers stay unique.
	 */
	async createRevision(input, currentUser) {
		const scope = await authorizeScope(input.courseId, currentUser);
		const type = analysisType(input.analysisType);
		const values = {
			model: requiredText(input.model, 'model', 200),
			systemPrompt: requiredText(input.systemPrompt, 'systemPrompt', 50_000),
			userPrompt: requiredText(input.userPrompt, 'userPrompt', 50_000),
			outputSchema: outputSchema(input.outputSchema),
			createdByUserId: numericId(currentUser.id, 'userId')
		};

		return db.transaction(async (tx) => {
			const lockKey = `prompt-template:${scope.scope}:${scope.courseId ?? 'global'}:${type}`;
			await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
			let [template] = await tx.select().from(promptTemplate).where(and(
				eq(promptTemplate.scope, scope.scope),
				scope.courseId == null ? sql`${promptTemplate.courseId} is null` : eq(promptTemplate.courseId, scope.courseId),
				eq(promptTemplate.analysisType, type)
			)).limit(1);
			if (!template) {
				[template] = await tx.insert(promptTemplate).values({
					analysisType: type,
					scope: scope.scope,
					courseId: scope.courseId,
					activeRevision: 1
				}).returning();
			}
			const [last] = await tx.select({ version: max(promptTemplateRevision.version) })
				.from(promptTemplateRevision).where(eq(promptTemplateRevision.templateId, template.id));
			const version = Number(last?.version ?? 0) + 1;
			const [revision] = await tx.insert(promptTemplateRevision).values({
				...values,
				templateId: template.id,
				version
			}).returning();
			const [updated] = await tx.update(promptTemplate).set({ activeRevision: version, updatedAt: new Date() })
				.where(eq(promptTemplate.id, template.id)).returning();
			return { ...updated, revision, inherited: false };
		});
	}
};
