import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activity as activityTable } from '$lib/server/db/schema.js';
import { requiredText } from './api.service.js';
import { activityService } from './activity.service.js';
import { promptTemplateService } from './prompt-template.service.js';

function professorSection(addendum) {
	if (!addendum) return '';
	return `\n\nACTIVITY-SPECIFIC INSTRUCTIONS\nThe professor supplied the following evaluation criteria. Apply them without changing the output schema or the selected analysis scope.\n<professor-instructions>\n${addendum}\n</professor-instructions>`;
}

export const promptBuilderService = {
	/**
	 * Resolve the prompt to send for one correction.
	 *
	 * Lessons always use the currently active course or global revision.
	 * Exams are frozen the first time a correction is built: the revisions in
	 * force at the exam start (or now, if it has not started) for all five
	 * analysis types are copied into `frozenPromptConfig`, so later prompt
	 * edits never change how an exam is graded. The professor's activity
	 * instructions are appended to the user prompt in both cases.
	 *
	 * @param {number|string} activityId
	 * @param {string} typeValue camera | light | material | texture | general
	 * @returns {Promise<object>} snapshot fields plus `promptHash` (SHA-256 of
	 *   the JSON snapshot), a readable `promptVersion` and the revision id.
	 */
	async build(activityId, typeValue) {
		const type = requiredText(typeValue, 'analysisType', 20).toLowerCase();
		let activity = await activityService.findActivity(activityId);
		if (activity.kind === 'EXAM' && !activity.promptFrozenAt) {
			const now = new Date();
			const freezeAt = activity.availableFrom && activity.availableFrom <= now ? activity.availableFrom : now;
			const types = ['camera', 'light', 'material', 'texture', 'general'];
			const entries = await Promise.all(types.map(async (entryType) => {
				const entry = await promptTemplateService.resolve(activity.courseId, entryType, freezeAt);
				return [entryType, {
					templateId: entry.id,
					templateScope: entry.scope,
					templateVersion: entry.revision.version,
					promptTemplateRevisionId: entry.revision.id,
					model: entry.revision.model,
					systemPrompt: entry.revision.systemPrompt,
					userPrompt: `${entry.revision.userPrompt}${professorSection(activity.promptAddendum?.trim())}`,
					outputSchema: entry.revision.outputSchema
				}];
			}));
			const frozenPromptConfig = Object.fromEntries(entries);
			const [frozen] = await db.update(activityTable).set({
				promptFrozenAt: freezeAt,
				frozenPromptConfig,
				updatedAt: new Date()
			}).where(eq(activityTable.id, activity.id)).returning();
			activity = frozen;
		}
		const frozen = activity.kind === 'EXAM' ? activity.frozenPromptConfig?.[type] : null;
		const template = frozen ? null : await promptTemplateService.resolve(activity.courseId, type);
		const revision = frozen ?? {
			templateId: template.id,
			templateScope: template.scope,
			templateVersion: template.revision.version,
			promptTemplateRevisionId: template.revision.id,
			model: template.revision.model,
			systemPrompt: template.revision.systemPrompt,
			userPrompt: `${template.revision.userPrompt}${professorSection(activity.promptAddendum?.trim())}`,
			outputSchema: template.revision.outputSchema
		};
		const systemPrompt = revision.systemPrompt;
		const userPrompt = revision.userPrompt;
		const snapshot = {
			analysisType: type,
			templateId: revision.templateId,
			templateScope: revision.templateScope,
			templateVersion: revision.templateVersion,
			activityPromptRevision: activity.promptRevision,
			model: revision.model,
			systemPrompt,
			userPrompt,
			outputSchema: revision.outputSchema
		};
		const promptHash = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
		return {
			...snapshot,
			promptHash,
			promptVersion: `${type}-t${revision.templateId}-v${revision.templateVersion}-a${activity.promptRevision}`,
			promptTemplateRevisionId: revision.promptTemplateRevisionId
		};
	}
};
