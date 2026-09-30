import { describe, expect, it } from 'vitest';
import { combineCourseAuthorizations } from '../../src/lib/server/services/course-member-view.js';

describe('combineCourseAuthorizations', () => {
	it('shows invitations without an account as pending authorizations', () => {
		const result = combineCourseAuthorizations([], [{
			id: 7, courseId: 3, matchedUserId: null, name: null, surname: null,
			email: 'new.student@polito.it', createdAt: new Date('2026-09-25T10:00:00Z')
		}]);
		expect(result).toMatchObject([{
			id: 'invitation-7', email: 'new.student@polito.it', status: 'PENDING',
			role: 'STUDENT', isPendingInvitation: true
		}]);
	});

	it('does not duplicate an invitation once a membership exists', () => {
		const member = { id: 2, userId: 12, email: 'student@polito.it', status: 'ACTIVE' };
		const result = combineCourseAuthorizations([member], [{
			id: 7, courseId: 3, email: 'STUDENT@POLITO.IT', createdAt: new Date()
		}]);
		expect(result).toEqual([member]);
	});

	it('matches an existing membership by user id after an email change', () => {
		const member = { id: 2, userId: 12, email: 'new-address@polito.it', status: 'ACTIVE' };
		const result = combineCourseAuthorizations([member], [{
			id: 7, courseId: 3, matchedUserId: 12, email: 'old-address@polito.it', createdAt: new Date()
		}]);
		expect(result).toEqual([member]);
	});
});
