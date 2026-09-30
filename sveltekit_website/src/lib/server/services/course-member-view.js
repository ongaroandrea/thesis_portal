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
