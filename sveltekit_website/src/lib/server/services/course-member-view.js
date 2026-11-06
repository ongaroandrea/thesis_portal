/**
 * Merge real course members with still-pending invitations into one list for
 * the members table.
 *
 * An invitation is dropped when its email (case-insensitive) or its matched
 * user already appears among the members, so an accepted invite is never
 * shown twice. Pending invitations become pseudo-member rows with a string
 * id (`invitation-<id>`), role STUDENT and status PENDING, sorted by email
 * and appended after the members (whose order is preserved).
 *
 * @param {Array<{email: string, userId?: number}>} members
 * @param {Array<{id: number, courseId: number, email: string, matchedUserId?: number|null,
 *   name?: string|null, surname?: string|null, createdAt: Date}>} invitations
 * @returns {object[]} Members followed by pending-invitation rows.
 */
export function combineCourseAuthorizations(members, invitations) {
	const memberEmails = new Set(members.map((member) => member.email.trim().toLowerCase()));
	const memberUserIds = new Set(members.map((member) => member.userId).filter(Boolean));
	const pending = invitations
		.filter((invitation) =>
			!memberEmails.has(invitation.email.trim().toLowerCase())
			&& (!invitation.matchedUserId || !memberUserIds.has(invitation.matchedUserId))
		)
		.map((invitation) => ({
			id: `invitation-${invitation.id}`,
			invitationId: invitation.id,
			courseId: invitation.courseId,
			userId: invitation.matchedUserId,
			name: invitation.name ?? '',
			surname: invitation.surname ?? '',
			email: invitation.email,
			role: 'STUDENT',
			status: 'PENDING',
			joinedAt: null,
			createdAt: invitation.createdAt,
			updatedAt: invitation.createdAt,
			isPendingInvitation: true
		}))
		.sort((left, right) => left.email.localeCompare(right.email, undefined, { sensitivity: 'base' }));
	return [...members, ...pending];
}
