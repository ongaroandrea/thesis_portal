import { n as readJson, t as apiResponse } from "../../../../../chunks/handler.js";
import { b as user, d as courseMember, l as courseImport, t as db, u as courseInvitation } from "../../../../../chunks/db.js";
import { c as requiredText, r as numericId, s as requireUser, t as ApiError } from "../../../../../chunks/api.service.js";
import { t as courseService } from "../../../../../chunks/course.service.js";
import { and, eq, sql } from "drizzle-orm";
// src/lib/server/services/course-import.service.js
var POLITO_EMAIL = /^[^@\s]+@(?:[a-z0-9-]+\.)*polito\.it$/i;
function normalizeEmails(emails) {
	if (!Array.isArray(emails) || emails.length === 0) throw new ApiError(400, "emails must be a non-empty array.", "VALIDATION_ERROR");
	if (emails.length > 2e3) throw new ApiError(400, "A maximum of 2000 rows can be imported at once.", "VALIDATION_ERROR");
	return emails.map((email, row) => ({
		row: row + 1,
		email: String(email ?? "").trim().toLowerCase()
	}));
}
var courseImportService = { async importMembers(input, currentUser) {
	requireUser(currentUser);
	if (!["professor", "admin"].includes(currentUser.role)) throw new ApiError(403, "Only a professor or admin can import course members.", "COURSE_IMPORT_DENIED");
	const courseId = numericId(input.courseId, "courseId");
	await courseService.requireCourseManager(courseId, currentUser);
	const rows = normalizeEmails(input.emails);
	const originalFilename = requiredText(input.originalFilename ?? "api-import.json", "originalFilename", 255);
	const actorId = numericId(currentUser.id, "userId");
	return db.transaction(async (tx) => {
		const [importRecord] = await tx.insert(courseImport).values({
			courseId,
			uploadedByUserId: actorId,
			originalFilename,
			storageKey: input.storageKey ? String(input.storageKey) : null,
			totalRows: rows.length
		}).returning();
		let createdUsers = 0;
		let existingUsers = 0;
		let rejectedRows = 0;
		const errors = [];
		const seen = /* @__PURE__ */ new Set();
		for (const row of rows) {
			if (!POLITO_EMAIL.test(row.email) || seen.has(row.email)) {
				rejectedRows += 1;
				errors.push({
					row: row.row,
					email: row.email,
					message: seen.has(row.email) ? "Duplicate email." : "A valid @polito.it email is required."
				});
				continue;
			}
			seen.add(row.email);
			const [existingInvitation] = await tx.select().from(courseInvitation).where(and(eq(courseInvitation.courseId, courseId), sql`lower(${courseInvitation.email}) = ${row.email}`)).limit(1);
			const [matchedUser] = await tx.select().from(user).where(sql`lower(${user.email}) = ${row.email}`).limit(1);
			let invitation = existingInvitation;
			if (!invitation) {
				[invitation] = await tx.insert(courseInvitation).values({
					courseId,
					importId: importRecord.id,
					email: row.email,
					invitedByUserId: actorId,
					matchedUserId: matchedUser?.id ?? null,
					acceptedAt: matchedUser?.emailVerified ? /* @__PURE__ */ new Date() : null
				}).returning();
				createdUsers += 1;
			} else existingUsers += 1;
			if (matchedUser?.emailVerified) {
				const [membership] = await tx.select().from(courseMember).where(and(eq(courseMember.courseId, courseId), eq(courseMember.userId, matchedUser.id))).limit(1);
				if (!membership) await tx.insert(courseMember).values({
					courseId,
					userId: matchedUser.id,
					role: "STUDENT",
					status: "ACTIVE"
				});
				else if (membership.status !== "ACTIVE") await tx.update(courseMember).set({
					status: "ACTIVE",
					updatedAt: /* @__PURE__ */ new Date()
				}).where(eq(courseMember.id, membership.id));
				if (!invitation.acceptedAt) await tx.update(courseInvitation).set({
					matchedUserId: matchedUser.id,
					acceptedAt: /* @__PURE__ */ new Date()
				}).where(eq(courseInvitation.id, invitation.id));
			}
		}
		const [completed] = await tx.update(courseImport).set({
			createdUsers,
			existingUsers,
			rejectedRows,
			errors
		}).where(eq(courseImport.id, importRecord.id)).returning();
		return completed;
	});
} };
// src/routes/api/corsi/import/+server.js
var POST = ({ request, locals }) => apiResponse(async () => {
	const input = await readJson(request);
	return courseImportService.importMembers(input, locals.user);
}, 201);
export { POST };
