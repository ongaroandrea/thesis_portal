import { env } from '$env/dynamic/public';

/**
 * Maximum size of an uploaded photo, shared by the browser checks and the
 * server checks. It comes from `PUBLIC_MAX_IMAGE_MB`, which Docker Compose
 * sets from `MAX_IMAGE_MB` in docker.env (the Python service reads the same
 * value). Read at call time, not at import, so the browser always sees the
 * runtime value. Falls back to 5 MB when unset or invalid.
 */
const DEFAULT_MAX_IMAGE_MB = 5;

export function maxImageMb() {
	const value = Number(env.PUBLIC_MAX_IMAGE_MB);
	return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_IMAGE_MB;
}

export function maxImageBytes() {
	return Math.floor(maxImageMb() * 1024 * 1024);
}

/**
 * Reference images: when compression is on (the default), the browser
 * re-encodes them to WEBP under 350 KB and the server enforces that size.
 * When off (`COMPRESS_REFERENCE_IMAGES=false` in docker.env), the original
 * file is stored as uploaded, up to the normal photo limit.
 */
export const COMPRESSED_REFERENCE_IMAGE_BYTES = 350 * 1024;

export function compressReferenceImages() {
	return !['false', '0', 'no', 'off'].includes(String(env.PUBLIC_COMPRESS_REFERENCE_IMAGES ?? '').trim().toLowerCase());
}

export function maxReferenceImageBytes() {
	return compressReferenceImages() ? COMPRESSED_REFERENCE_IMAGE_BYTES : maxImageBytes();
}
