import fs from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
	throw new Error('TEST_DATABASE_URL is required for integration tests. It must point to a disposable test database.');
}

const databaseName = decodeURIComponent(new URL(testDatabaseUrl).pathname.replace(/^\//, ''));
if (!databaseName || !/test/i.test(databaseName)) {
	throw new Error('Refusing to reset TEST_DATABASE_URL because its database name does not contain "test".');
}

process.env.DATABASE_URL = testDatabaseUrl;

const setupSql = postgres(testDatabaseUrl, { max: 1, prepare: false, onnotice: () => {} });
const fixedNow = new Date('2030-06-15T12:00:00.000Z');
let services;
let databaseClient;
let ids;

function actor(id, role) {
	return { id: Number(id), role };
}

async function expectDenied(operation, code) {
	await expect(operation()).rejects.toMatchObject({ status: expect.any(Number), code });
}

beforeAll(async () => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(fixedNow);
	await setupSql.unsafe('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
	const baseline = await fs.readFile(new URL('../../drizzle/0000_initial_schema.sql', import.meta.url), 'utf8');
	await setupSql.unsafe(baseline);

	const users = await setupSql`
		insert into "user" (name, surname, email, role, "emailVerified") values
		('Initial', 'Admin', 'admin@test.polito.it', 'admin', true),
		('Paola', 'Owner', 'prof-owner@test.polito.it', 'professor', true),
		('Piero', 'Other', 'prof-other@test.polito.it', 'professor', true),
		('Sara', 'Owner', 'student-owner@test.polito.it', 'student', true),
		('Stefano', 'Peer', 'student-peer@test.polito.it', 'student', true),
		('Olivia', 'Outside', 'student-outside@test.polito.it', 'student', true)
		returning id, email
	`;
	const userId = Object.fromEntries(users.map((row) => [row.email, Number(row.id)]));
	const [course] = await setupSql`
		insert into course (name, description, created_by_user_id)
		values ('Integration course', 'Role matrix', ${userId['prof-owner@test.polito.it']}) returning id
	`;
	const [otherCourse] = await setupSql`
		insert into course (name, description, created_by_user_id)
		values ('Other course', 'Isolation', ${userId['prof-other@test.polito.it']}) returning id
	`;
	const members = await setupSql`
		insert into course_member (course_id, user_id, role, status) values
		(${course.id}, ${userId['student-owner@test.polito.it']}, 'STUDENT', 'ACTIVE'),
		(${course.id}, ${userId['student-peer@test.polito.it']}, 'STUDENT', 'ACTIVE')
		returning id, user_id
	`;
	const memberId = Object.fromEntries(members.map((row) => [Number(row.user_id), Number(row.id)]));

	const activities = await setupSql`
		insert into course_activity
			(course_id, created_by_user_id, kind, status, title, objective, available_from, available_until, display_order)
		values
			(${course.id}, ${userId['prof-owner@test.polito.it']}, 'LESSON', 'PUBLISHED', 'Available', 'Test', ${new Date('2020-01-01T00:00:00Z')}, ${new Date('2040-12-31T00:00:00Z')}, 1),
			(${course.id}, ${userId['prof-owner@test.polito.it']}, 'LESSON', 'DRAFT', 'Draft', 'Test', null, null, 2),
			(${course.id}, ${userId['prof-owner@test.polito.it']}, 'LESSON', 'PUBLISHED', 'Future', 'Test', ${new Date(fixedNow.getTime() + 1)}, null, 3),
			(${course.id}, ${userId['prof-owner@test.polito.it']}, 'LESSON', 'PUBLISHED', 'Expired', 'Test', null, ${new Date(fixedNow.getTime() - 1)}, 4),
			(${course.id}, ${userId['prof-owner@test.polito.it']}, 'LESSON', 'PUBLISHED', 'Starts now', 'Test', ${fixedNow}, null, 5),
			(${course.id}, ${userId['prof-owner@test.polito.it']}, 'LESSON', 'PUBLISHED', 'Ends now', 'Test', null, ${fixedNow}, 6),
			(${course.id}, ${userId['prof-owner@test.polito.it']}, 'EXAM', 'PUBLISHED', 'Released exam', 'Test', null, null, 7),
			(${course.id}, ${userId['prof-owner@test.polito.it']}, 'EXAM', 'PUBLISHED', 'Future results exam', 'Test', null, null, 8),
			(${course.id}, ${userId['prof-owner@test.polito.it']}, 'EXAM', 'PUBLISHED', 'Draft result exam', 'Test', null, null, 9)
		returning id, title
	`;
	const activityId = Object.fromEntries(activities.map((row) => [row.title, Number(row.id)]));
	await setupSql`update course_activity set results_released_at = ${new Date(fixedNow.getTime() - 1)} where id = ${activityId['Released exam']}`;
	await setupSql`update course_activity set results_released_at = ${new Date(fixedNow.getTime() + 1)} where id = ${activityId['Future results exam']}`;
	const [image] = await setupSql`
		insert into activity_reference_image
			(activity_id, uploaded_by_user_id, storage_key, original_filename, mime_type, view_type)
		values (${activityId.Available}, ${userId['prof-owner@test.polito.it']}, 'data:image/png;base64,AA==', 'reference.png', 'image/png', 'FRONT')
		returning id
	`;
	const [session] = await setupSql`
		insert into correction_session
			(activity_id, reference_image_id, analysis_focus, student_user_id)
		values (${activityId.Available}, ${image.id}, 'LIGHT', ${userId['student-owner@test.polito.it']})
		returning id
	`;
	const [attempt] = await setupSql`
		insert into correction_attempt
			(session_id, attempt_number, image_name, focus, view_type, view_label, reference_image_id, job_status)
		values (${session.id}, 1, 'student.png', 'LIGHT', 'FRONT', 'Front', ${image.id}, 'queued')
		returning id
	`;
	const [peerSession] = await setupSql`
		insert into correction_session
			(activity_id, reference_image_id, analysis_focus, student_user_id)
		values (${activityId.Available}, ${image.id}, 'CAMERA', ${userId['student-peer@test.polito.it']})
		returning id
	`;
	const [peerAttempt] = await setupSql`
		insert into correction_attempt
			(session_id, attempt_number, image_name, focus, view_type, view_label, reference_image_id, job_status)
		values (${peerSession.id}, 1, 'peer.png', 'CAMERA', 'FRONT', 'Front', ${image.id}, 'queued')
		returning id
	`;
	const results = await setupSql`
		insert into exam_result
			(activity_id, student_user_id, graded_by_user_id, status, score, published_at)
		values
			(${activityId['Released exam']}, ${userId['student-owner@test.polito.it']}, ${userId['prof-owner@test.polito.it']}, 'PUBLISHED', 27, ${new Date(fixedNow.getTime() - 1)}),
			(${activityId['Released exam']}, ${userId['student-peer@test.polito.it']}, ${userId['prof-owner@test.polito.it']}, 'PUBLISHED', 25, ${new Date(fixedNow.getTime() - 1)}),
			(${activityId['Future results exam']}, ${userId['student-owner@test.polito.it']}, ${userId['prof-owner@test.polito.it']}, 'PUBLISHED', 26, ${new Date(fixedNow.getTime() - 1)}),
			(${activityId['Draft result exam']}, ${userId['student-owner@test.polito.it']}, ${userId['prof-owner@test.polito.it']}, 'DRAFT', 24, null)
		returning id, activity_id, student_user_id
	`;
	const resultId = Object.fromEntries(results.map((row) => [`${Number(row.activity_id)}:${Number(row.student_user_id)}`, Number(row.id)]));

	ids = {
		userId,
		course: Number(course.id),
		otherCourse: Number(otherCourse.id),
		memberId,
		activityId,
		image: Number(image.id),
		session: Number(session.id),
		attempt: Number(attempt.id),
		peerSession: Number(peerSession.id),
		peerAttempt: Number(peerAttempt.id),
		resultId
	};

	const modules = await Promise.all([
		import('../../src/lib/server/services/users.service.js'),
		import('../../src/lib/server/services/course.service.js'),
		import('../../src/lib/server/services/course-member.service.js'),
		import('../../src/lib/server/services/activity.service.js'),
		import('../../src/lib/server/services/activity-reference-image.service.js'),
		import('../../src/lib/server/services/correction-session.service.js'),
		import('../../src/lib/server/services/correction-attempt.service.js'),
		import('../../src/lib/server/services/correction-feedback.service.js'),
		import('../../src/lib/server/services/prompt-template.service.js'),
		import('../../src/lib/server/services/exam-result.service.js'),
		import('../../src/lib/server/api/handler.js'),
		import('../../src/lib/server/db/index.js')
	]);
	services = {
		user: modules[0].userService,
		course: modules[1].courseService,
		member: modules[2].courseMemberService,
		activity: modules[3].activityService,
		image: modules[4].activityReferenceImageService,
		session: modules[5].correctionSessionService,
		attempt: modules[6].correctionAttemptService,
		feedback: modules[7].correctionFeedbackService,
		prompt: modules[8].promptTemplateService,
		result: modules[9].examResultService,
		apiResponse: modules[10].apiResponse
	};
	databaseClient = modules[11].databaseClient;
}, 30_000);

afterAll(async () => {
	vi.useRealTimers();
	await Promise.all([databaseClient?.end(), setupSql.end()]);
});

describe('role/resource authorization matrix', () => {
	it('covers admin, managing professor, owner/member student, peer student, and outsiders', async () => {
		const adminUser = actor(ids.userId['admin@test.polito.it'], 'admin');
		const professor = actor(ids.userId['prof-owner@test.polito.it'], 'professor');
		const otherProfessor = actor(ids.userId['prof-other@test.polito.it'], 'professor');
		const owner = actor(ids.userId['student-owner@test.polito.it'], 'student');
		const peer = actor(ids.userId['student-peer@test.polito.it'], 'student');
		const outsider = actor(ids.userId['student-outside@test.polito.it'], 'student');
		const page = new URLSearchParams('page=1&pageSize=10');
		const resources = [
			['users', () => services.user.get(owner.id, adminUser), () => services.user.get(owner.id, professor), () => services.user.get(owner.id, owner), () => services.user.get(owner.id, peer), () => services.user.get(owner.id, otherProfessor)],
			['courses', () => services.course.get(ids.course, adminUser), () => services.course.get(ids.course, professor), () => services.course.get(ids.course, owner), () => services.course.get(ids.course, peer), () => services.course.get(ids.course, outsider)],
			['members', () => services.member.get(ids.memberId[owner.id], adminUser), () => services.member.get(ids.memberId[owner.id], professor), () => services.member.get(ids.memberId[owner.id], owner), () => services.member.get(ids.memberId[owner.id], peer), () => services.member.get(ids.memberId[owner.id], outsider)],
			['activities', () => services.activity.get(ids.activityId.Available, adminUser), () => services.activity.get(ids.activityId.Available, professor), () => services.activity.get(ids.activityId.Available, owner), () => services.activity.get(ids.activityId.Available, peer), () => services.activity.get(ids.activityId.Available, outsider)],
			['reference images', () => services.image.list(ids.activityId.Available, adminUser), () => services.image.list(ids.activityId.Available, professor), () => services.image.list(ids.activityId.Available, owner), () => services.image.list(ids.activityId.Available, peer), () => services.image.list(ids.activityId.Available, outsider)],
			['correction sessions', () => services.session.get(ids.session, adminUser), () => services.session.get(ids.session, professor), () => services.session.get(ids.session, owner), () => services.session.get(ids.session, peer), () => services.session.get(ids.session, outsider)],
			['correction attempts', () => services.attempt.get(ids.attempt, adminUser), () => services.attempt.get(ids.attempt, professor), () => services.attempt.get(ids.attempt, owner), () => services.attempt.get(ids.attempt, peer), () => services.attempt.get(ids.attempt, outsider)],
			['exam results', () => services.result.get(ids.resultId[`${ids.activityId['Released exam']}:${owner.id}`], adminUser), () => services.result.get(ids.resultId[`${ids.activityId['Released exam']}:${owner.id}`], professor), () => services.result.get(ids.resultId[`${ids.activityId['Released exam']}:${owner.id}`], owner), () => services.result.get(ids.resultId[`${ids.activityId['Released exam']}:${owner.id}`], peer), () => services.result.get(ids.resultId[`${ids.activityId['Released exam']}:${owner.id}`], outsider)]
		];

		for (const [resource, asAdmin, asManager, asOwner, asPeer, asOutsider] of resources) {
			await expect(asAdmin(), `${resource}: admin`).resolves.toBeTruthy();
			await expect(asManager(), `${resource}: managing professor`).resolves.toBeTruthy();
			await expect(asOwner(), `${resource}: owning/member student`).resolves.toBeTruthy();
			if (['courses', 'activities', 'reference images'].includes(resource)) {
				await expect(asPeer(), `${resource}: peer course member`).resolves.toBeTruthy();
			} else {
				await expect(asPeer(), `${resource}: peer student`).rejects.toMatchObject({ status: 403 });
			}
			await expect(asOutsider(), `${resource}: outsider`).rejects.toMatchObject({ status: 403 });
		}

		await expect(services.user.list(adminUser, page)).resolves.toMatchObject({ items: expect.any(Array) });
		await expect(services.user.list(professor, page)).resolves.toMatchObject({ items: expect.any(Array) });
		await expectDenied(() => services.user.list(owner, page), 'USER_LIST_DENIED');
		await expect(services.member.list(ids.course, adminUser, page)).resolves.toMatchObject({ items: expect.any(Array) });
		await expect(services.member.list(ids.course, professor, page)).resolves.toMatchObject({ items: expect.any(Array) });
		await expectDenied(() => services.member.list(ids.course, owner, page), 'COURSE_MANAGEMENT_DENIED');
	});

	it('requires authentication for every top-level resource', async () => {
		const page = new URLSearchParams();
		await expectDenied(() => services.user.get(ids.userId['admin@test.polito.it'], null), 'UNAUTHORIZED');
		await expectDenied(() => services.course.get(ids.course, null), 'UNAUTHORIZED');
		await expectDenied(() => services.member.get(ids.memberId[ids.userId['student-owner@test.polito.it']], null), 'UNAUTHORIZED');
		await expectDenied(() => services.activity.get(ids.activityId.Available, null), 'UNAUTHORIZED');
		await expectDenied(() => services.image.list(ids.activityId.Available, null), 'UNAUTHORIZED');
		await expectDenied(() => services.session.list(ids.activityId.Available, null, page), 'UNAUTHORIZED');
		await expectDenied(() => services.attempt.list(ids.session, null, page), 'UNAUTHORIZED');
		await expectDenied(() => services.result.list(ids.activityId['Released exam'], null, page), 'UNAUTHORIZED');
	});

	it('covers mutation authority for every implemented resource', async () => {
		const adminUser = actor(ids.userId['admin@test.polito.it'], 'admin');
		const professor = actor(ids.userId['prof-owner@test.polito.it'], 'professor');
		const owner = actor(ids.userId['student-owner@test.polito.it'], 'student');
		const peer = actor(ids.userId['student-peer@test.polito.it'], 'student');

		await expect(services.user.update(owner.id, { image: null }, adminUser)).resolves.toMatchObject({ id: owner.id });
		await expect(services.user.update(owner.id, { image: null }, owner)).resolves.toMatchObject({ id: owner.id });
		await expectDenied(() => services.user.update(owner.id, { image: null }, professor), 'USER_UPDATE_DENIED');

		await expect(services.course.update(ids.course, { description: 'Admin update' }, adminUser)).resolves.toBeTruthy();
		await expect(services.course.update(ids.course, { description: 'Professor update' }, professor)).resolves.toBeTruthy();
		await expectDenied(() => services.course.update(ids.course, { description: 'Denied' }, owner), 'COURSE_MANAGEMENT_DENIED');

		await expect(services.member.update(ids.memberId[owner.id], { status: 'ACTIVE' }, adminUser)).resolves.toBeTruthy();
		await expect(services.member.update(ids.memberId[owner.id], { status: 'ACTIVE' }, professor)).resolves.toBeTruthy();
		await expectDenied(() => services.member.update(ids.memberId[owner.id], { status: 'ACTIVE' }, owner), 'COURSE_MANAGEMENT_DENIED');

		await expect(services.activity.update(ids.activityId.Available, { description: 'Admin update' }, adminUser)).resolves.toBeTruthy();
		await expect(services.activity.update(ids.activityId.Available, { description: 'Professor update' }, professor)).resolves.toBeTruthy();
		await expectDenied(() => services.activity.update(ids.activityId.Available, { description: 'Denied' }, owner), 'COURSE_MANAGEMENT_DENIED');

		const imageValues = { viewType: 'FRONT', customViewLabel: '', altText: '', displayOrder: 0 };
		await expect(services.image.update(ids.activityId.Available, ids.image, imageValues, adminUser)).resolves.toBeTruthy();
		await expect(services.image.update(ids.activityId.Available, ids.image, imageValues, professor)).resolves.toBeTruthy();
		await expectDenied(() => services.image.update(ids.activityId.Available, ids.image, imageValues, owner), 'COURSE_MANAGEMENT_DENIED');

		await expect(services.attempt.update(ids.attempt, { jobStatus: 'queued' }, adminUser)).resolves.toBeTruthy();
		await expect(services.attempt.update(ids.attempt, { jobStatus: 'queued' }, professor)).resolves.toBeTruthy();
		await expect(services.attempt.update(ids.attempt, { jobStatus: 'queued' }, owner)).resolves.toBeTruthy();
		await expectDenied(() => services.attempt.update(ids.attempt, { jobStatus: 'queued' }, peer), 'CORRECTION_SESSION_ACCESS_DENIED');
		const unchangedAttempt = await services.attempt.update(ids.attempt, {
			jobStatus: 'completed',
			score: 30,
			summary: 'Forged client result',
			rawResponse: { result: { score: 30 } },
			completedAt: fixedNow
		}, owner);
		expect(unchangedAttempt).toMatchObject({
			jobStatus: 'queued',
			score: null,
			summary: null,
			rawResponse: null,
			completedAt: null
		});

		const resultId = ids.resultId[`${ids.activityId['Released exam']}:${owner.id}`];
		await expect(services.result.update(resultId, { feedback: 'Admin grade' }, adminUser)).resolves.toBeTruthy();
		await expect(services.result.update(resultId, { feedback: 'Professor grade' }, professor)).resolves.toBeTruthy();
		await expectDenied(() => services.result.update(resultId, { feedback: 'Denied' }, owner), 'COURSE_MANAGEMENT_DENIED');
	});
});

describe('student correction privacy', () => {
	it('lists and opens only the current student’s correction sessions and attempts', async () => {
		const owner = actor(ids.userId['student-owner@test.polito.it'], 'student');
		const peer = actor(ids.userId['student-peer@test.polito.it'], 'student');
		const professor = actor(ids.userId['prof-owner@test.polito.it'], 'professor');
		const page = new URLSearchParams('page=1&pageSize=20');

		const ownerSessions = await services.session.list(ids.activityId.Available, owner, page);
		const peerSessions = await services.session.list(ids.activityId.Available, peer, page);
		const managerSessions = await services.session.list(ids.activityId.Available, professor, page);

		expect(ownerSessions.items.map(({ id }) => id)).toEqual([ids.session]);
		expect(peerSessions.items.map(({ id }) => id)).toEqual([ids.peerSession]);
		expect(managerSessions.items.map(({ id }) => id).sort((a, b) => a - b)).toEqual(
			[ids.session, ids.peerSession].sort((a, b) => a - b)
		);
		await expect(services.attempt.list(ids.session, owner, page)).resolves.toMatchObject({
			items: [{ id: ids.attempt }]
		});
		await expectDenied(() => services.session.get(ids.peerSession, owner), 'CORRECTION_SESSION_ACCESS_DENIED');
		await expectDenied(() => services.attempt.get(ids.peerAttempt, owner), 'CORRECTION_SESSION_ACCESS_DENIED');
		await expectDenied(() => services.attempt.list(ids.peerSession, owner, page), 'CORRECTION_SESSION_ACCESS_DENIED');
	});
});

describe('course creator management', () => {
	it('lets a professor manage legacy courses they created and enrolls them in new courses', async () => {
		const professor = actor(ids.userId['prof-owner@test.polito.it'], 'professor');
		const page = new URLSearchParams('page=1&pageSize=100');
		await expect(services.course.get(ids.course, professor)).resolves.toMatchObject({ canManage: true });
		const listed = await services.course.list(professor, page);
		expect(listed.items.some((item) => item.id === ids.course && item.canManage)).toBe(true);

		const created = await services.course.create({ name: 'Professor-created course' }, professor);
		await expect(setupSql`
			select role, status from course_member
			where course_id = ${created.id} and user_id = ${professor.id}
		`).resolves.toMatchObject([{ role: 'PROFESSOR', status: 'ACTIVE' }]);
	});
});

describe('exam-result restrictions', () => {
	it('shows students only their own published results after release', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(fixedNow);
		const owner = actor(ids.userId['student-owner@test.polito.it'], 'student');
		const peer = actor(ids.userId['student-peer@test.polito.it'], 'student');
		const page = new URLSearchParams('page=1&pageSize=20');
		const released = await services.result.list(ids.activityId['Released exam'], owner, page);
		expect(released.items).toHaveLength(1);
		expect(released.items[0].studentUserId).toBe(owner.id);
		await expectDenied(
			() => services.result.get(ids.resultId[`${ids.activityId['Released exam']}:${peer.id}`], owner),
			'EXAM_RESULT_ACCESS_DENIED'
		);
		await expectDenied(
			() => services.result.get(ids.resultId[`${ids.activityId['Future results exam']}:${owner.id}`], owner),
			'EXAM_RESULT_NOT_RELEASED'
		);
		await expectDenied(
			() => services.result.get(ids.resultId[`${ids.activityId['Draft result exam']}:${owner.id}`], owner),
			'EXAM_RESULT_NOT_RELEASED'
		);
		vi.useRealTimers();
	});

	it('rejects grading by a professor who does not manage the course', async () => {
		const otherProfessor = actor(ids.userId['prof-other@test.polito.it'], 'professor');
		await expectDenied(() => services.result.create({
			activityId: ids.activityId['Released exam'],
			studentUserId: ids.userId['student-owner@test.polito.it'],
			status: 'READY',
			score: 28
		}, otherProfessor), 'COURSE_MANAGEMENT_DENIED');

		await expect(setupSql`
			insert into exam_result
				(activity_id, student_user_id, graded_by_user_id, status, score)
			values (
				${ids.activityId['Draft result exam']},
				${ids.userId['student-peer@test.polito.it']},
				${otherProfessor.id},
				'READY',
				28
			)
		`).rejects.toMatchObject({ code: '23514' });
	});

	it('does not block changing an exam activity kind merely because results exist', async () => {
		const professor = actor(ids.userId['prof-owner@test.polito.it'], 'professor');
		await expect(services.activity.update(
			ids.activityId['Draft result exam'],
			{ kind: 'LESSON' },
			professor
		)).resolves.toMatchObject({ kind: 'LESSON' });
	});
});

describe('activity availability boundaries', () => {
	it('uses inclusive start and end boundaries and rejects adjacent instants', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(fixedNow);
		const student = actor(ids.userId['student-owner@test.polito.it'], 'student');
		await expect(services.activity.get(ids.activityId['Starts now'], student)).resolves.toBeTruthy();
		await expect(services.activity.get(ids.activityId['Ends now'], student)).resolves.toBeTruthy();
		await expectDenied(() => services.activity.get(ids.activityId.Future, student), 'ACTIVITY_NOT_AVAILABLE');
		await expectDenied(() => services.activity.get(ids.activityId.Expired, student), 'ACTIVITY_NOT_AVAILABLE');
		await expectDenied(() => services.activity.get(ids.activityId.Draft, student), 'ACTIVITY_NOT_AVAILABLE');
		vi.useRealTimers();
	});

	it('lets course managers access activities outside publication windows', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(fixedNow);
		const professor = actor(ids.userId['prof-owner@test.polito.it'], 'professor');
		for (const title of ['Draft', 'Future', 'Expired']) {
			await expect(services.activity.get(ids.activityId[title], professor)).resolves.toBeTruthy();
		}
		vi.useRealTimers();
	});
});

describe('correction-session derived status', () => {
	it('derives status from the latest non-cancelled attempt', async () => {
		const owner = actor(ids.userId['student-owner@test.polito.it'], 'student');
		await expect(services.session.get(ids.session, owner)).resolves.toMatchObject({ status: 'PROCESSING' });
		await setupSql`update correction_attempt set job_status = 'completed' where id = ${ids.attempt}`;
		await expect(services.session.get(ids.session, owner)).resolves.toMatchObject({ status: 'ANSWERED' });
		await setupSql`update correction_attempt set job_status = 'failed' where id = ${ids.attempt}`;
		await expect(services.session.get(ids.session, owner)).resolves.toMatchObject({ status: 'FAILED' });
	});
});

describe('correction feedback authorization and statistics', () => {
	it('keeps student usefulness and professor review independent and rejects peer access', async () => {
		const owner = actor(ids.userId['student-owner@test.polito.it'], 'student');
		const peer = actor(ids.userId['student-peer@test.polito.it'], 'student');
		const professor = actor(ids.userId['prof-owner@test.polito.it'], 'professor');
		await setupSql`update correction_attempt set job_status = 'completed' where id = ${ids.attempt}`;

		await expect(services.feedback.save(ids.attempt, {
			isUseful: true,
			studentComment: 'Utile'
		}, owner)).resolves.toMatchObject({ isUseful: true, verdict: null });
		await expectDenied(() => services.feedback.get(ids.attempt, peer), 'CORRECTION_SESSION_ACCESS_DENIED');
		await expect(services.feedback.save(ids.attempt, {
			verdict: 'CORRECT',
			professorComment: 'Valutazione confermata'
		}, professor)).resolves.toMatchObject({
			isUseful: true,
			studentComment: 'Utile',
			verdict: 'CORRECT'
		});

		await expect(services.feedback.statistics(ids.activityId.Available, professor)).resolves.toMatchObject({
			completedAttempts: 1,
			studentResponses: 1,
			usefulResponses: 1,
			reviewedResponses: 1,
			correct: 1
		});
	});
});

describe('prompt ownership and privacy', () => {
	it('keeps activity prompt data private and limits template scopes', async () => {
		const adminUser = actor(ids.userId['admin@test.polito.it'], 'admin');
		const professor = actor(ids.userId['prof-owner@test.polito.it'], 'professor');
		const otherProfessor = actor(ids.userId['prof-other@test.polito.it'], 'professor');
		const student = actor(ids.userId['student-owner@test.polito.it'], 'student');

		await expect(services.activity.update(ids.activityId.Available, {
			promptAddendum: 'Concentrati sul soggetto principale.'
		}, professor)).resolves.toMatchObject({ promptRevision: 2 });
		await expect(services.activity.get(ids.activityId.Available, professor))
			.resolves.toMatchObject({ promptAddendum: 'Concentrati sul soggetto principale.' });
		const visible = await services.activity.get(ids.activityId.Available, student);
		expect(visible).not.toHaveProperty('promptAddendum');
		expect(visible).not.toHaveProperty('frozenPromptConfig');

		await expect(services.prompt.list(ids.course, professor)).resolves.toHaveLength(5);
		await expectDenied(() => services.prompt.list(ids.course, otherProfessor), 'COURSE_MANAGEMENT_DENIED');
		await expectDenied(() => services.prompt.createRevision({
			analysisType: 'camera', model: 'qwen3.8:27b', systemPrompt: 'System',
			userPrompt: 'User', outputSchema: { type: 'object' }
		}, professor), 'PROMPT_GLOBAL_ACCESS_DENIED');
		await expect(services.prompt.createRevision({
			courseId: ids.course, analysisType: 'camera', model: 'qwen3.8:27b',
			systemPrompt: 'Course camera system', userPrompt: 'Course camera evaluation',
			outputSchema: { type: 'object' }
		}, professor)).resolves.toMatchObject({ scope: 'COURSE', inherited: false });
		const { promptBuilderService } = await import('../../src/lib/server/services/prompt-builder.service.js');
		await expect(promptBuilderService.build(ids.activityId.Available, 'camera')).resolves.toMatchObject({
			analysisType: 'camera',
			templateScope: 'COURSE',
			activityPromptRevision: 2,
			model: 'qwen3.8:27b',
			systemPrompt: 'Course camera system',
			userPrompt: expect.stringContaining('Concentrati sul soggetto principale.'),
			promptHash: expect.stringMatching(/^[0-9a-f]{64}$/)
		});
		await expect(services.prompt.list(null, adminUser)).resolves.toHaveLength(5);
	});
});

describe('database conflict integration', () => {
	it('turns a real unique-constraint race into the shared 409 contract', async () => {
		const ownerId = ids.userId['student-owner@test.polito.it'];
		const response = await services.apiResponse(() => setupSql`
			insert into course_member (course_id, user_id, role, status)
			values (${ids.course}, ${ownerId}, 'STUDENT', 'ACTIVE')
		`);
		expect(response.status).toBe(409);
		expect(await response.json()).toMatchObject({ error: { code: 'RESOURCE_ALREADY_EXISTS' } });
	});
});

describe('membership-dependent access', () => {
	async function setMemberStatus(userId, status) {
		await setupSql`
			update course_member set status = ${status}
			where course_id = ${ids.course} and user_id = ${userId}
		`;
	}

	it('refuses old sessions and attempts to a suspended owner', async () => {
		const owner = actor(ids.userId['student-owner@test.polito.it'], 'student');
		await setMemberStatus(owner.id, 'SUSPENDED');
		try {
			await expectDenied(() => services.session.get(ids.session, owner), 'CORRECTION_SESSION_ACCESS_DENIED');
			await expectDenied(() => services.attempt.get(ids.attempt, owner), 'CORRECTION_SESSION_ACCESS_DENIED');
			await expectDenied(() => services.session.remove(ids.session, owner), 'CORRECTION_SESSION_ACCESS_DENIED');
		} finally {
			await setMemberStatus(owner.id, 'ACTIVE');
		}
		await expect(services.session.get(ids.session, owner)).resolves.toMatchObject({ id: ids.session });
	});

	it('lets owners delete only empty sessions and keeps counted attempts', async () => {
		const owner = actor(ids.userId['student-owner@test.polito.it'], 'student');
		await expectDenied(() => services.session.remove(ids.session, owner), 'CORRECTION_SESSION_EDIT_DENIED');
		await expectDenied(() => services.attempt.remove(ids.attempt, owner), 'COURSE_MANAGEMENT_DENIED');
		const [empty] = await setupSql`
			insert into correction_session (activity_id, reference_image_id, analysis_focus, student_user_id)
			values (${ids.activityId.Available}, ${ids.image}, 'LIGHT', ${owner.id})
			returning id
		`;
		await expect(services.session.remove(Number(empty.id), owner)).resolves.toEqual({ id: Number(empty.id) });
	});

	it('takes manager rights from a creator whose membership is suspended', async () => {
		const professor = actor(ids.userId['prof-owner@test.polito.it'], 'professor');
		const page = new URLSearchParams('page=1&pageSize=100');
		await setMemberStatus(professor.id, 'SUSPENDED');
		try {
			await expectDenied(() => services.course.update(ids.course, { description: 'Denied' }, professor), 'COURSE_MANAGEMENT_DENIED');
			// Same rule in the user endpoints: the course's students are no longer visible.
			await expectDenied(() => services.user.get(ids.userId['student-owner@test.polito.it'], professor), 'USER_ACCESS_DENIED');
			const listed = await services.course.list(professor, page);
			expect(listed.items.some((item) => item.id === ids.course)).toBe(false);
		} finally {
			await setMemberStatus(professor.id, 'ACTIVE');
		}
		await expect(services.course.get(ids.course, professor)).resolves.toMatchObject({ canManage: true });
	});

	it('lists only active course members to professors', async () => {
		const professor = actor(ids.userId['prof-owner@test.polito.it'], 'professor');
		const peerId = ids.userId['student-peer@test.polito.it'];
		const page = new URLSearchParams('page=1&pageSize=100');
		await setMemberStatus(peerId, 'REMOVED');
		try {
			const listed = await services.user.list(professor, page);
			expect(listed.items.map(({ id }) => id)).not.toContain(peerId);
			await expectDenied(() => services.user.get(peerId, professor), 'USER_ACCESS_DENIED');
			await expect(services.member.list(ids.course, professor, page)).resolves.toMatchObject({
				items: expect.arrayContaining([expect.objectContaining({ userId: peerId, status: 'REMOVED' })])
			});
		} finally {
			await setMemberStatus(peerId, 'ACTIVE');
		}
	});
});
