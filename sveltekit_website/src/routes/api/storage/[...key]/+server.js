import { error } from '@sveltejs/kit';
import { ApiError } from '$lib/server/services/api.service.js';
import { localStorageService } from '$lib/server/services/local-storage.service.js';
import { storedFileAccessService } from '$lib/server/services/stored-file-access.service.js';

/**
 * Serve a stored image by key. The key is looked up in the database to find
 * the record that owns it: reference images need access to their activity,
 * exam submission files are limited to the submitting student and the
 * course managers. Unknown keys get 404.
 */
export async function GET({ params, locals }) {
	try {
		await storedFileAccessService.requireAccess(params.key, locals.user);
	} catch (accessError) {
		if (accessError instanceof ApiError) error(accessError.status, accessError.message);
		throw accessError;
	}
	try {
		const body = await localStorageService.read(params.key);
		return new Response(body, {
			headers: {
				'content-type': localStorageService.mimeTypeForKey(params.key),
				'cache-control': 'private, max-age=3600',
				'x-content-type-options': 'nosniff'
			}
		});
	} catch (storageError) {
		if (storageError?.code === 'ENOENT' || storageError?.message === 'Invalid local storage key') {
			error(404, 'Stored file not found.');
		}
		throw storageError;
	}
}
