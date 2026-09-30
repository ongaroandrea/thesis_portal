import { and, asc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { courseInvitation, courseMember, user } from '$lib/server/db/schema';
import { ApiError, numericId, paginated, paginationParams, requireUser } from './api.service.js';
import { courseService } from './course.service.js';
import { combineCourseAuthorizations } from './course-member-view.js';

async function findMember(id) {
	const [record] = await db.select().from(courseMember).where(eq(courseMember.id, numericId(id, 'memberId'))).limit(1);
	if (!record) throw new ApiError(404, 'Course member not found.', 'MEMBER_NOT_FOUND');
	return record;
}

async function findUser(userId) {
	const [record] = await db.select().from(user).where(eq(user.id, numericId(userId, 'userId'))).limit(1);
	if (!record) throw new ApiError(404, 'User not found.', 'USER_NOT_FOUND');
	return record;
}

async function findUserByEmail(email) {
	const normalizedEmail = String(email ?? '').trim().toLowerCase();
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
		throw new ApiError(400, 'A valid user email is required.', 'VALIDATION_ERROR');
	}
	const [record] = await db.select().from(user)
		.where(sql`lower(${user.email}) = ${normalizedEmail}`).limit(1);
	if (!record) throw new ApiError(404, 'No user was found with this email.', 'USER_NOT_FOUND');
	return record;
}

async function findValidInvitation(courseId, targetUser) {
	const [invitation] = await db.select().from(courseInvitation).where(and(
		eq(courseInvitation.courseId, courseId),
		eq(courseInvitation.email, targetUser.email.trim().toLowerCase()),
		or(isNull(courseInvitation.expiresAt), gt(courseInvitation.expiresAt, new Date()))
	)).limit(1);
	return invitation ?? null;
}

export const courseMemberService = {
	findMember,

	async list(courseId, currentUser, searchParams) {
		const courseRecord = await courseService.requireCourseManager(courseId, currentUser);
		const pagination = paginationParams(searchParams);
		const selection = {
			id: courseMember.id,
			courseId: courseMember.courseId,
			userId: courseMember.userId,
			name: user.name,
			surname: user.surname,
			email: user.email,
			role: courseMember.role,
			status: courseMember.status,
			joinedAt: courseMember.joinedAt,
			createdAt: courseMember.createdAt,
			updatedAt: courseMember.updatedAt
		};
		const [memberItems, invitations] = await Promise.all([
			db.select(selection).from(courseMember).innerJoin(user, eq(user.id, courseMember.userId))
				.where(eq(courseMember.courseId, courseRecord.id)).orderBy(asc(user.surname), asc(user.name), asc(courseMember.id)),
			db.select({
				id: courseInvitation.id,
				courseId: courseInvitation.courseId,
				matchedUserId: courseInvitation.matchedUserId,
				name: user.name,
				surname: user.surname,
				email: courseInvitation.email,
				createdAt: courseInvitation.createdAt
			}).from(courseInvitation).leftJoin(user, eq(user.id, courseInvitation.matchedUserId))
				.where(eq(courseInvitation.courseId, courseRecord.id)).orderBy(asc(courseInvitation.email))
		]);
		const authorizations = combineCourseAuthorizations(memberItems, invitations);
		return paginated(authorizations.slice(pagination.offset, pagination.offset + pagination.pageSize), authorizations.length, pagination);
	},

	async get(id, currentUser) {
		requireUser(currentUser);
		const record = await findMember(id);
		const isSelf = record.userId === numericId(currentUser.id, 'userId');
		if (!isSelf) await courseService.requireCourseManager(record.courseId, currentUser);
		return record;
	},

	async create(input, currentUser) {
		requireUser(currentUser);
		const courseId = numericId(input.courseId, 'courseId');
		const targetUser = await findUserByEmail(input.email);
		const userId = numericId(targetUser.id, 'userId');
		let managerAuthorized = false;
		try {
			await courseService.requireCourseManager(courseId, currentUser);
			managerAuthorized = true;
		} catch (error) {
			if (!(error instanceof ApiError) || error.status !== 403) throw error;
		}

		let invitation = null;
		if (!managerAuthorized) {
			if (userId !== numericId(currentUser.id, 'userId') || !targetUser.emailVerified) {
				throw new ApiError(403, 'Membership must be authorized by course staff or a verified invitation.', 'MEMBER_NOT_AUTHORIZED');
			}
			invitation = await findValidInvitation(courseId, targetUser);
			if (!invitation) throw new ApiError(403, 'No valid course authorization was found.', 'MEMBER_NOT_AUTHORIZED');
		}

		const [existing] = await db.select().from(courseMember).where(and(
			eq(courseMember.courseId, courseId), eq(courseMember.userId, userId)
		)).limit(1);
		if (existing) throw new ApiError(409, 'The user is already a member of this course.', 'MEMBER_EXISTS');

		const role = input.role ?? 'STUDENT';
		if (!['PROFESSOR', 'STUDENT'].includes(role)) throw new ApiError(400, 'role must be PROFESSOR or STUDENT.', 'VALIDATION_ERROR');
		if (!managerAuthorized && role !== 'STUDENT') throw new ApiError(403, 'An invitation can only create a student membership.', 'MEMBER_ROLE_DENIED');
		if (role === 'PROFESSOR' && !['professor', 'developer'].includes(targetUser.role)) {
			throw new ApiError(400, 'Only a professor or developer account can receive the PROFESSOR course role.', 'MEMBER_ROLE_DENIED');
		}

		return db.transaction(async (tx) => {
			const [created] = await tx.insert(courseMember).values({ courseId, userId, role, status: 'ACTIVE' }).returning();
			if (invitation) {
				await tx.update(courseInvitation).set({ matchedUserId: userId, acceptedAt: new Date() })
					.where(eq(courseInvitation.id, invitation.id));
			}
			return created;
		});
	},

	async update(id, input, currentUser) {
		const record = await findMember(id);
		await courseService.requireCourseManager(record.courseId, currentUser);
		const values = {};
		if (input.role !== undefined) {
			if (!['PROFESSOR', 'STUDENT'].includes(input.role)) throw new ApiError(400, 'role must be PROFESSOR or STUDENT.', 'VALIDATION_ERROR');
			if (input.role === 'PROFESSOR') {
				const targetUser = await findUser(record.userId);
				if (!['professor', 'developer'].includes(targetUser.role)) {
					throw new ApiError(400, 'Only a professor or developer account can receive the PROFESSOR course role.', 'MEMBER_ROLE_DENIED');
				}
			}
			values.role = input.role;
		}
		if (input.status !== undefined) {
			if (!['ACTIVE', 'SUSPENDED', 'REMOVED'].includes(input.status)) throw new ApiError(400, 'Invalid member status.', 'VALIDATION_ERROR');
			values.status = input.status;
		}
		if (Object.keys(values).length === 0) throw new ApiError(400, 'No member fields were provided.', 'VALIDATION_ERROR');
		const [updated] = await db.update(courseMember).set({ ...values, updatedAt: new Date() })
			.where(eq(courseMember.id, record.id)).returning();
		return updated;
	},

	async remove(id, currentUser) {
		const record = await findMember(id);
		await courseService.requireCourseManager(record.courseId, currentUser);
		await db.delete(courseMember).where(eq(courseMember.id, record.id));
		return { id: record.id };
	}
};
