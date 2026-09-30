export const CORRECTION_FOCUS_OPTIONS = Object.freeze([
	{ id: 'LIGHT', labelKey: 'correction.lighting', analysisType: 'light' },
	{ id: 'CAMERA', labelKey: 'correction.camera', analysisType: 'camera' },
	{ id: 'MATERIAL', labelKey: 'correction.materials', analysisType: 'material' },
	{ id: 'TEXTURE', labelKey: 'correction.texture', analysisType: 'texture' },
	{ id: 'GENERAL', labelKey: 'correction.generalQuality', analysisType: 'camera' }
]);

export const CORRECTION_FOCUS_IDS = new Set(
	CORRECTION_FOCUS_OPTIONS.map((option) => option.id)
);

export const DEFAULT_CORRECTION_FOCUS_IDS = Object.freeze(
	CORRECTION_FOCUS_OPTIONS.map((option) => option.id)
);

export function allowedCorrectionFocusIds(activity) {
	const configured = activity?.allowedCorrectionFocuses;
	if (!Array.isArray(configured) || configured.length === 0) return [...DEFAULT_CORRECTION_FOCUS_IDS];
	return configured.filter((id) => CORRECTION_FOCUS_IDS.has(id));
}

export function correctionFocusOption(id) {
	return CORRECTION_FOCUS_OPTIONS.find((option) => option.id === id) ?? null;
}
