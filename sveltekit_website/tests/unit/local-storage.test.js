import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { localStorageService } from '../../src/lib/server/services/local-storage.service.js';

describe('localStorageService', () => {
	let directory;

	beforeEach(async () => {
		directory = await mkdtemp(path.join(tmpdir(), 'thesis-portal-storage-'));
		process.env.LOCAL_STORAGE_PATH = directory;
	});

	afterEach(async () => {
		delete process.env.LOCAL_STORAGE_PATH;
		await rm(directory, { recursive: true, force: true });
	});

	it('stores and reads an image below the configured system folder', async () => {
		const content = Buffer.from('local image bytes');
		const url = await localStorageService.save({
			base64: content.toString('base64'),
			mimeType: 'image/png',
			category: 'reference-images'
		});
		const key = localStorageService.keyFromUrl(url);

		expect(url).toMatch(/^\/api\/storage\/reference-images\/\d{4}\/\d{2}\/[0-9a-f-]+\.png$/);
		expect(await readFile(path.join(directory, key))).toEqual(content);
		expect(await localStorageService.read(key)).toEqual(content);
	});

	it('removes local URLs and ignores legacy data URLs', async () => {
		const url = await localStorageService.save({
			base64: Buffer.from('image').toString('base64'),
			mimeType: 'image/jpeg',
			category: 'exam-submissions'
		});

		expect(await localStorageService.remove('data:image/jpeg;base64,aW1hZ2U=')).toBe(false);
		expect(await localStorageService.remove(url)).toBe(true);
		await expect(localStorageService.read(localStorageService.keyFromUrl(url))).rejects.toMatchObject({ code: 'ENOENT' });
	});

	it('rejects path traversal', async () => {
		await expect(localStorageService.read('../outside.png')).rejects.toThrow('Invalid local storage key');
	});

	it('derives the category and stored URL of a key', () => {
		const key = 'exam-submissions/2026/09/0b9e2f1c-1d2e-4f3a-9b8c-7d6e5f4a3b2c.png';
		expect(localStorageService.categoryForKey(key)).toBe('exam-submissions');
		expect(localStorageService.categoryForKey('reference-images/2026/09/a.jpg')).toBe('reference-images');
		expect(localStorageService.urlForKey(key)).toBe(`/api/storage/${key}`);
		expect(localStorageService.keyFromUrl(localStorageService.urlForKey(key))).toBe(key);
	});

	it('returns no category for invalid keys', () => {
		expect(localStorageService.categoryForKey('../exam-submissions/a.png')).toBeNull();
		expect(localStorageService.categoryForKey('exam-submissions/a.txt')).toBeNull();
		expect(localStorageService.categoryForKey(undefined)).toBeNull();
		expect(() => localStorageService.urlForKey('../a.png')).toThrow('Invalid local storage key');
	});
});
