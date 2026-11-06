import { and, count, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '$lib/server/db';
import { supportTicket, user } from '$lib/server/db/schema';
import { ApiError, numericId, optionalText, paginated, paginationParams, requiredText, requireUser } from './api.service.js';

export const SUPPORT_CATEGORIES = ['EXAM_DELIVERY', 'CORRECTION', 'ACCOUNT', 'WEBSITE'];
export const SUPPORT_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];

const reporter = alias(user, 'reporter');

function requireAdmin(currentUser) {
	requireUser(currentUser);
	if (currentUser.role !== 'admin') {
		throw new ApiError(403, 'Only administrators can manage support tickets.', 'SUPPORT_ADMIN_REQUIRED');
	}
}

function enumValue(value, allowed, name) {
	if (!allowed.includes(value)) {
		throw new ApiError(400, `${name} must be one of ${allowed.join(', ')}.`, 'VALIDATION_ERROR');
	}
	return value;
}

/** Keep only same-origin paths so a ticket can never store an arbitrary external link. */
function relativePagePath(value) {
	const text = optionalText(value, 'pageUrl', 500);
	if (!text) return null;
	if (!text.startsWith('/') || text.startsWith('//')) {
		throw new ApiError(400, 'pageUrl must be a path within the portal.', 'VALIDATION_ERROR');
	}
	return text;
}

const ticketColumns = {
	id: supportTicket.id,
	category: supportTicket.category,
	status: supportTicket.status,
	subject: supportTicket.subject,
	description: supportTicket.description,
	pageUrl: supportTicket.pageUrl,
	adminNote: supportTicket.adminNote,
	resolvedAt: supportTicket.resolvedAt,
	createdAt: supportTicket.createdAt,
	updatedAt: supportTicket.updatedAt,
	reporterUserId: supportTicket.reporterUserId,
	reporterName: reporter.name,
	reporterSurname: reporter.surname,
	reporterEmail: reporter.email,
	reporterRole: reporter.role
};

function baseQuery() {
	return db.select(ticketColumns).from(supportTicket)
		.innerJoin(reporter, eq(reporter.id, supportTicket.reporterUserId));
}

export const supportTicketService = {
	async create(input, currentUser) {
		requireUser(currentUser);
		const [created] = await db.insert(supportTicket).values({
			reporterUserId: numericId(currentUser.id, 'userId'),
			category: enumValue(input.category, SUPPORT_CATEGORIES, 'category'),
			subject: requiredText(input.subject, 'subject', 160),
			description: requiredText(input.description, 'description', 4000),
			pageUrl: relativePagePath(input.pageUrl)
		}).returning({ id: supportTicket.id });
		return this.get(created.id, currentUser);
	},

	/**
	 * Load one ticket. Non-admins may only read their own; someone else's
	 * ticket is reported as 404 (not 403) so ticket ids cannot be probed.
	 */
	async get(ticketId, currentUser) {
		requireUser(currentUser);
		const [ticket] = await baseQuery().where(eq(supportTicket.id, numericId(ticketId, 'ticketId'))).limit(1);
		if (!ticket) throw new ApiError(404, 'Support ticket not found.', 'SUPPORT_TICKET_NOT_FOUND');
		if (currentUser.role !== 'admin' && ticket.reporterUserId !== numericId(currentUser.id, 'userId')) {
			throw new ApiError(404, 'Support ticket not found.', 'SUPPORT_TICKET_NOT_FOUND');
		}
		return ticket;
	},

	/** Admins see every ticket (optionally filtered by status); everyone else sees only their own. */
	async list(searchParams, currentUser) {
		requireUser(currentUser);
		const pagination = paginationParams(searchParams);
		const filters = [];
		if (currentUser.role !== 'admin' || searchParams.get('scope') === 'mine') {
			filters.push(eq(supportTicket.reporterUserId, numericId(currentUser.id, 'userId')));
		}
		const status = searchParams.get('status');
		if (status) filters.push(eq(supportTicket.status, enumValue(status, SUPPORT_STATUSES, 'status')));
		const where = filters.length ? and(...filters) : undefined;

		const [items, [{ total }]] = await Promise.all([
			baseQuery().where(where)
				.orderBy(sql`case when ${supportTicket.status} = 'RESOLVED' then 1 else 0 end`, desc(supportTicket.createdAt))
				.limit(pagination.pageSize).offset(pagination.offset),
			db.select({ total: count() }).from(supportTicket).where(where)
		]);
		return paginated(items, total, pagination);
	},

	/**
	 * Admin-only status/note change. `resolvedAt`/`resolvedByUserId` are set
	 * only on the transition into RESOLVED (re-saving a resolved ticket keeps
	 * the original resolver) and cleared when the ticket is reopened.
	 */
	async update(ticketId, input, currentUser) {
		requireAdmin(currentUser);
		const existing = await this.get(ticketId, currentUser);
		const values = { updatedAt: new Date() };
		if (input.status !== undefined) {
			values.status = enumValue(input.status, SUPPORT_STATUSES, 'status');
			const resolving = values.status === 'RESOLVED';
			if (resolving && existing.status !== 'RESOLVED') {
				values.resolvedAt = new Date();
				values.resolvedByUserId = numericId(currentUser.id, 'userId');
			} else if (!resolving) {
				values.resolvedAt = null;
				values.resolvedByUserId = null;
			}
		}
		if (input.adminNote !== undefined) values.adminNote = optionalText(input.adminNote, 'adminNote', 2000) || null;
		await db.update(supportTicket).set(values).where(eq(supportTicket.id, existing.id));
		return this.get(existing.id, currentUser);
	}
};
