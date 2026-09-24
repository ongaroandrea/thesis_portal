import { and, count, desc, eq, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { course, courseMember } from '$lib/server/db/schema';
import { ApiError, dateValue, numericId, optionalText, paginated, paginationParams, requiredText, requireUser } from './api.service.js';

const isDeveloper = (currentUser) => currentUser.role === 'developer';

async function findCourse(id) {
	const [record] = await db.select().from(course).where(eq(course.id, numericId(id, 'courseId'))).limit(1);
	if (!record) throw new ApiError(404, 'Course not found.', 'COURSE_NOT_FOUND');
	return record;
}

async function findActiveMembership(courseId, userId) {
	const [membership] = await db.select().from(courseMember).where(and(
		eq(courseMember.courseId, numericId(courseId, 'courseId')),
		eq(courseMember.userId, numericId(userId, 'userId')),
		eq(courseMember.status, 'ACTIVE')
	)).limit(1);
	return membership ?? null;
}

async function isAuthorizedMember(courseId, userId) {
	return Boolean(await findActiveMembership(courseId, userId));
}

async function canManage(record, currentUser) {
	if (isDeveloper(currentUser)) return true;
	if (currentUser.role !== 'professor') return false;
	const membership = await findActiveMembership(record.id, currentUser.id);
	return membership?.role === 'PROFESSOR';
}

async function requireCourseAccess(courseId, currentUser) {
	requireUser(currentUser);
	const record = await findCourse(courseId);
	if (await canManage(record, currentUser)) return record;
	if (!record.isActive || !(await isAuthorizedMember(record.id, currentUser.id))) {
		throw new ApiError(403, 'You are not an authorized member of this course.', 'COURSE_ACCESS_DENIED');
	}
	return record;
}

async function requireCourseManager(courseId, currentUser) {
	requireUser(currentUser);
	const record = await findCourse(courseId);
	if (!(await canManage(record, currentUser))) {
		throw new ApiError(403, 'Only an authorized course professor or a developer can perform this action.', 'COURSE_MANAGEMENT_DENIED');
	}
	return record;
}

function nullableDate(input, field) {
	if (input[field] === undefined) return undefined;
	return input[field] === null || input[field] === '' ? null : dateValue(input[field], field);
}

function courseValues(input, partial = false) {
	const values = {};
	if (!partial || input.name !== undefined) values.name = requiredText(input.name, 'name', 200);
	const description = optionalText(input.description, 'description', 20000);
	if (description !== undefined) values.description = description;
	const startsAt = nullableDate(input, 'startsAt');
	const endsAt = nullableDate(input, 'endsAt');
	if (startsAt !== undefined) values.startsAt = startsAt;
	if (endsAt !== undefined) values.endsAt = endsAt;
	if (input.isActive !== undefined) {
		if (typeof input.isActive !== 'boolean') throw new ApiError(400, 'isActive must be a boolean.', 'VALIDATION_ERROR');
		values.isActive = input.isActive;
	}
	if (partial && Object.keys(values).length === 0) throw new ApiError(400, 'No course fields were provided.', 'VALIDATION_ERROR');
	return values;
}

function validateWindow(values, existing = null) {
	const startsAt = values.startsAt === undefined ? existing?.startsAt : values.startsAt;
	const endsAt = values.endsAt === undefined ? existing?.endsAt : values.endsAt;
	if (startsAt && endsAt && startsAt >= endsAt) {
		throw new ApiError(400, 'endsAt must be later than startsAt.', 'INVALID_AVAILABILITY');
	}
}

export const courseService = {
	findCourse,
	findActiveMembership,
	isAuthorizedMember,
	requireCourseAccess,
	requireCourseManager,

	async list(currentUser, searchParams) {
		requireUser(currentUser);
		const pagination = paginationParams(searchParams);
		if (isDeveloper(currentUser)) {
			const [records, [{ total }]] = await Promise.all([
				db.select().from(course).orderBy(desc(course.createdAt), desc(course.id)).limit(pagination.pageSize).offset(pagination.offset),
				db.select({ total: count() }).from(course)
			]);
			return paginated(records.map((record) => ({ ...record, membershipRole: null, canManage: true })), total, pagination);
		}
		const membershipCondition = and(
			eq(courseMember.courseId, course.id),
			eq(courseMember.userId, numericId(currentUser.id, 'userId')),
			eq(courseMember.status, 'ACTIVE')
		);
		const visibilityCondition = or(
			eq(course.isActive, true),
			and(eq(courseMember.role, 'PROFESSOR'), eq(courseMember.status, 'ACTIVE'))
		);
		const selection = {
			id: course.id,
			name: course.name,
			description: course.description,
			createdByUserId: course.createdByUserId,
			startsAt: course.startsAt,
			endsAt: course.endsAt,
			isActive: course.isActive,
			createdAt: course.createdAt,
			updatedAt: course.updatedAt,
			membershipRole: courseMember.role
		};
		const [records, [{ total }]] = await Promise.all([
			db.select(selection).from(course).innerJoin(courseMember, membershipCondition)
				.where(visibilityCondition).orderBy(desc(course.createdAt), desc(course.id))
				.limit(pagination.pageSize).offset(pagination.offset),
			db.select({ total: count() }).from(course).innerJoin(courseMember, membershipCondition).where(visibilityCondition)
		]);
		return paginated(records.map((record) => ({
			...record,
			canManage: currentUser.role === 'professor' && record.membershipRole === 'PROFESSOR'
		})), total, pagination);
	},

	async get(id, currentUser) {
		const record = await requireCourseAccess(id, currentUser);
		const membership = isDeveloper(currentUser) ? null : await findActiveMembership(record.id, currentUser.id);
		return {
			...record,
			membershipRole: membership?.role ?? null,
			canManage: await canManage(record, currentUser)
		};
	},

	async create(input, currentUser) {
		requireUser(currentUser);
		if (!isDeveloper(currentUser) && currentUser.role !== 'professor') {
			throw new ApiError(403, 'Only a professor or developer can create a course.', 'COURSE_CREATE_DENIED');
		}
		const values = courseValues(input);
		validateWindow(values);
		const [created] = await db.insert(course).values({
			...values,
			createdByUserId: numericId(currentUser.id, 'userId')
		}).returning();
		return created;
	},

	async update(id, input, currentUser) {
		const record = await requireCourseManager(id, currentUser);
		const values = courseValues(input, true);
		validateWindow(values, record);
		const [updated] = await db.update(course).set({ ...values, updatedAt: new Date() })
			.where(eq(course.id, record.id)).returning();
		return updated;
	},

	async remove(id, currentUser) {
		const record = await requireCourseManager(id, currentUser);
		await db.delete(course).where(eq(course.id, record.id));
		return { id: record.id };
	}
};
