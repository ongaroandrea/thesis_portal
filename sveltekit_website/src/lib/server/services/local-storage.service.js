import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const STORAGE_URL_PREFIX = '/api/storage/';
const SAFE_KEY_PATTERN = /^[a-z0-9][a-z0-9/_-]*\.(?:avif|jpg|png|webp)$/;
const EXTENSIONS = new Map([
	['image/avif', 'avif'],
	['image/jpeg', 'jpg'],
	['image/png', 'png'],
	['image/webp', 'webp']
]);

/**
 * Absolute directory that holds every uploaded image binary.
 * Comes from LOCAL_STORAGE_PATH (in Docker: /app/storage, backed by the
 * `local_storage` volume). Relative paths resolve from the process cwd.
 */
function storageRoot() {
	const configuredPath = process.env.LOCAL_STORAGE_PATH?.trim();
	if (!configuredPath) {
		throw new Error('LOCAL_STORAGE_PATH is not set');
	}
	return path.resolve(configuredPath);
}

/**
 * Validate a storage key such as `reference-images/2025/01/<uuid>.png`.
 * Only lowercase letters, digits, `/`, `_`, `-` and an allowed image
 * extension are accepted, and `..` segments are rejected, so a key taken
 * from a URL cannot escape the storage root.
 * @param {string} key
 * @returns {string} the normalized key
 */
function safeKey(key) {
	const normalized = String(key ?? '').replaceAll('\\', '/');
	if (!SAFE_KEY_PATTERN.test(normalized) || normalized.split('/').includes('..')) {
		throw new Error('Invalid local storage key');
	}
	return normalized;
}

/** Resolve a key to an absolute path, re-checking it stays inside the root. */
function filePath(key) {
	const root = storageRoot();
	const resolved = path.resolve(root, safeKey(key));
	if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error('Invalid local storage key');
	return resolved;
}

/**
 * Turn a stored `/api/storage/<key>` URL back into a key.
 * Returns null for anything else (e.g. legacy inline data: URLs), which lets
 * callers support both formats.
 */
function keyFromUrl(storageUrl) {
	if (typeof storageUrl !== 'string' || !storageUrl.startsWith(STORAGE_URL_PREFIX)) return null;
	try {
		return safeKey(decodeURIComponent(storageUrl.slice(STORAGE_URL_PREFIX.length)));
	} catch {
		return null;
	}
}

export const localStorageService = {
	/**
	 * Write a base64 image to disk under `<category>/<YYYY>/<MM>/<uuid>.<ext>`.
	 * The `wx` flag refuses to overwrite an existing file.
	 * @param {{ base64: string, mimeType: string, category: string }} input
	 * @returns {Promise<string>} the `/api/storage/...` URL to store in the DB
	 */
	async save({ base64, mimeType, category }) {
		const extension = EXTENSIONS.get(mimeType);
		if (!extension) throw new Error(`Unsupported local storage MIME type: ${mimeType}`);
		const safeCategory = String(category ?? '').toLowerCase();
		if (!/^[a-z][a-z0-9-]*$/.test(safeCategory)) throw new Error('Invalid local storage category');
		const now = new Date();
		const key = `${safeCategory}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${extension}`;
		const destination = filePath(key);
		await mkdir(path.dirname(destination), { recursive: true });
		await writeFile(destination, Buffer.from(base64, 'base64'), { flag: 'wx' });
		return `${STORAGE_URL_PREFIX}${key}`;
	},

	async read(key) {
		return readFile(filePath(key));
	},

	/**
	 * Delete the file behind a stored URL. Returns false (without throwing)
	 * when the URL is not a local-storage URL or the file is already gone.
	 */
	async remove(storageUrl) {
		const key = keyFromUrl(storageUrl);
		if (!key) return false;
		try {
			await unlink(filePath(key));
			return true;
		} catch (error) {
			if (error?.code === 'ENOENT') return false;
			throw error;
		}
	},

	/**
	 * First path segment of a key (`reference-images`, `exam-submissions`),
	 * or null when the key is not a valid storage key.
	 */
	categoryForKey(key) {
		try {
			return safeKey(key).split('/')[0];
		} catch {
			return null;
		}
	},

	/** The `/api/storage/...` URL stored in the DB for a key. */
	urlForKey(key) {
		return `${STORAGE_URL_PREFIX}${safeKey(key)}`;
	},

	mimeTypeForKey(key) {
		const extension = path.extname(safeKey(key)).toLowerCase();
		return extension === '.jpg' ? 'image/jpeg' : `image/${extension.slice(1)}`;
	},

	keyFromUrl
};
