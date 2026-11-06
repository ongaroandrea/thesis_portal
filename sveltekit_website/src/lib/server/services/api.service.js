/** Error carrying an HTTP status and a stable machine-readable code. */
export class ApiError extends Error {
	constructor(status, message, code = 'API_ERROR') {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
	}
}

export function requireUser(currentUser) {
	if (!currentUser) throw new ApiError(401, 'Authentication required.', 'UNAUTHORIZED');
	return currentUser;
}

export function numericId(value, name = 'id') {
	const id = Number(value);
	if (!Number.isSafeInteger(id) || id <= 0) {
		throw new ApiError(400, `${name} must be a positive integer.`, 'INVALID_ID');
	}
	return id;
}

export function requiredText(value, name, maxLength = 10000) {
	const text = typeof value === 'string' ? value.trim() : '';
	if (!text) throw new ApiError(400, `${name} is required.`, 'VALIDATION_ERROR');
	if (text.length > maxLength) {
		throw new ApiError(400, `${name} must be at most ${maxLength} characters.`, 'VALIDATION_ERROR');
	}
	return text;
}

export function optionalText(value, name, maxLength = 10000) {
	if (value === undefined) return undefined;
	if (typeof value !== 'string') {
		throw new ApiError(400, `${name} must be a string.`, 'VALIDATION_ERROR');
	}
	const text = value.trim();
	if (text.length > maxLength) {
		throw new ApiError(400, `${name} must be at most ${maxLength} characters.`, 'VALIDATION_ERROR');
	}
	return text;
}

export function dateValue(value, name) {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new ApiError(400, `${name} must be a valid date.`, 'VALIDATION_ERROR');
	}
	return date;
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

/** Parse `page`/`pageSize` (default 25, max 100) into limit/offset values. */
export function paginationParams(searchParams) {
	const pageValue = searchParams?.get?.('page') ?? 1;
	const pageSizeValue = searchParams?.get?.('pageSize') ?? DEFAULT_PAGE_SIZE;
	const page = Number(pageValue);
	const pageSize = Number(pageSizeValue);
	if (!Number.isSafeInteger(page) || page <= 0) {
		throw new ApiError(400, 'page must be a positive integer.', 'INVALID_PAGINATION');
	}
	if (!Number.isSafeInteger(pageSize) || pageSize <= 0 || pageSize > MAX_PAGE_SIZE) {
		throw new ApiError(400, `pageSize must be between 1 and ${MAX_PAGE_SIZE}.`, 'INVALID_PAGINATION');
	}
	return { page, pageSize, offset: (page - 1) * pageSize };
}

export function paginated(items, total, pagination) {
	const normalizedTotal = Number(total ?? 0);
	return {
		items,
		page: pagination.page,
		pageSize: pagination.pageSize,
		total: normalizedTotal,
		totalPages: Math.ceil(normalizedTotal / pagination.pageSize)
	};
}
