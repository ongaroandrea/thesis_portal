import { json } from "@sveltejs/kit";
//#region src/lib/server/services/api.service.js
var ApiError = class extends Error {
	constructor(status, message, code = "API_ERROR") {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
	}
};
function requireUser(currentUser) {
	if (!currentUser) throw new ApiError(401, "Authentication required.", "UNAUTHORIZED");
	return currentUser;
}
function numericId(value, name = "id") {
	const id = Number(value);
	if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError(400, `${name} must be a positive integer.`, "INVALID_ID");
	return id;
}
function requiredText(value, name, maxLength = 1e4) {
	const text = typeof value === "string" ? value.trim() : "";
	if (!text) throw new ApiError(400, `${name} is required.`, "VALIDATION_ERROR");
	if (text.length > maxLength) throw new ApiError(400, `${name} must be at most ${maxLength} characters.`, "VALIDATION_ERROR");
	return text;
}
function optionalText(value, name, maxLength = 1e4) {
	if (value === void 0) return void 0;
	if (typeof value !== "string") throw new ApiError(400, `${name} must be a string.`, "VALIDATION_ERROR");
	const text = value.trim();
	if (text.length > maxLength) throw new ApiError(400, `${name} must be at most ${maxLength} characters.`, "VALIDATION_ERROR");
	return text;
}
function dateValue(value, name) {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) throw new ApiError(400, `${name} must be a valid date.`, "VALIDATION_ERROR");
	return date;
}
var DEFAULT_PAGE_SIZE = 25;
var MAX_PAGE_SIZE = 100;
function paginationParams(searchParams) {
	const pageValue = searchParams?.get?.("page") ?? 1;
	const pageSizeValue = searchParams?.get?.("pageSize") ?? DEFAULT_PAGE_SIZE;
	const page = Number(pageValue);
	const pageSize = Number(pageSizeValue);
	if (!Number.isSafeInteger(page) || page <= 0) throw new ApiError(400, "page must be a positive integer.", "INVALID_PAGINATION");
	if (!Number.isSafeInteger(pageSize) || pageSize <= 0 || pageSize > MAX_PAGE_SIZE) throw new ApiError(400, `pageSize must be between 1 and ${MAX_PAGE_SIZE}.`, "INVALID_PAGINATION");
	return {
		page,
		pageSize,
		offset: (page - 1) * pageSize
	};
}
function paginated(items, total, pagination) {
	const normalizedTotal = Number(total ?? 0);
	return {
		items,
		page: pagination.page,
		pageSize: pagination.pageSize,
		total: normalizedTotal,
		totalPages: Math.ceil(normalizedTotal / pagination.pageSize)
	};
}
//#endregion
//#region src/lib/server/api/handler.js
var DATABASE_CONFLICTS = /* @__PURE__ */ new Map([
	["23505", {
		code: "RESOURCE_ALREADY_EXISTS",
		message: "A record with the same unique values already exists."
	}],
	["23503", {
		code: "RELATED_RESOURCE_CONFLICT",
		message: "The operation conflicts with a related record."
	}],
	["23502", {
		code: "DATABASE_CONSTRAINT_CONFLICT",
		message: "The operation violates a required database constraint."
	}],
	["23514", {
		code: "DATABASE_CONSTRAINT_CONFLICT",
		message: "The operation violates a database constraint."
	}],
	["23P01", {
		code: "RESOURCE_CONFLICT",
		message: "The operation conflicts with an existing record."
	}],
	["40001", {
		code: "CONCURRENT_WRITE_CONFLICT",
		message: "The record changed concurrently. Retry the operation."
	}],
	["40P01", {
		code: "CONCURRENT_WRITE_CONFLICT",
		message: "The operation conflicted with another write. Retry it."
	}]
]);
function normalizeApiError(error) {
	if (error instanceof ApiError) return error;
	const databaseCode = error?.code ?? error?.cause?.code;
	const conflict = DATABASE_CONFLICTS.get(databaseCode);
	return conflict ? new ApiError(409, conflict.message, conflict.code) : null;
}
async function readJson(request) {
	try {
		const body = await request.json();
		if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
		return body;
	} catch {
		throw new ApiError(400, "The request body must be a JSON object.", "INVALID_JSON");
	}
}
async function apiResponse(operation, status = 200) {
	try {
		return json({ data: await operation() }, { status });
	} catch (error) {
		const apiError = normalizeApiError(error);
		if (apiError) return json({ error: {
			code: apiError.code,
			message: apiError.message
		} }, { status: apiError.status });
		console.error("API request failed:", error);
		return json({ error: {
			code: "INTERNAL_SERVER_ERROR",
			message: "Internal server error."
		} }, { status: 500 });
	}
}
//#endregion
export { numericId as a, paginationParams as c, dateValue as i, requireUser as l, readJson as n, optionalText as o, ApiError as r, paginated as s, apiResponse as t, requiredText as u };
