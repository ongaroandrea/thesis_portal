import { t as __exportAll } from "./rolldown-runtime.js";
import { t as private_env } from "./shared-server.js";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { bigint, boolean, index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
//#region src/lib/server/db/schema.js
var schema_exports = /* @__PURE__ */ __exportAll({
	account: () => account,
	activity: () => activity,
	activityKindEnum: () => activityKindEnum,
	activityReferenceImage: () => activityReferenceImage,
	activityStatusEnum: () => activityStatusEnum,
	appUserRoleEnum: () => appUserRoleEnum,
	correctionAttempt: () => correctionAttempt,
	correctionSession: () => correctionSession,
	course: () => course,
	courseImport: () => courseImport,
	courseInvitation: () => courseInvitation,
	courseMember: () => courseMember,
	courseMemberRoleEnum: () => courseMemberRoleEnum,
	courseMemberStatusEnum: () => courseMemberStatusEnum,
	examResult: () => examResult,
	examSubmission: () => examSubmission,
	examSubmissionFile: () => examSubmissionFile,
	imageViewTypeEnum: () => imageViewTypeEnum,
	resultStatusEnum: () => resultStatusEnum,
	session: () => session,
	user: () => user,
	verification: () => verification
});
var identity = (name) => bigint(name, { mode: "number" }).primaryKey().generatedAlwaysAsIdentity();
var dateTime = (name) => timestamp(name, { withTimezone: true });
var appUserRoleEnum = pgEnum("app_user_role", [
	"developer",
	"professor",
	"student"
]);
var courseMemberRoleEnum = pgEnum("course_member_role", ["PROFESSOR", "STUDENT"]);
var courseMemberStatusEnum = pgEnum("course_member_status", [
	"ACTIVE",
	"SUSPENDED",
	"REMOVED"
]);
var activityKindEnum = pgEnum("activity_kind", ["LESSON", "EXAM"]);
var activityStatusEnum = pgEnum("activity_status", [
	"DRAFT",
	"PUBLISHED",
	"ARCHIVED"
]);
var imageViewTypeEnum = pgEnum("image_view_type", [
	"FRONT",
	"SIDE",
	"TOP",
	"ANGLED",
	"OTHER"
]);
var resultStatusEnum = pgEnum("result_status", [
	"DRAFT",
	"READY",
	"PUBLISHED"
]);
var user = pgTable("user", {
	id: identity("id"),
	name: text("name").notNull(),
	surname: text("surname").notNull().default(""),
	email: text("email").notNull().unique(),
	emailVerified: boolean("emailVerified").notNull().default(false),
	image: text("image"),
	role: appUserRoleEnum("role").notNull().default("student"),
	first_access: boolean("first_access").notNull().default(true),
	banned: boolean("banned").notNull().default(false),
	banReason: text("banReason"),
	banExpires: dateTime("banExpires"),
	createdAt: dateTime("createdAt").notNull().defaultNow(),
	updatedAt: dateTime("updatedAt").notNull().defaultNow()
});
var session = pgTable("session", {
	id: identity("id"),
	userId: bigint("userId", { mode: "number" }).notNull().references(() => user.id, { onDelete: "cascade" }),
	token: text("token").notNull().unique(),
	expiresAt: dateTime("expiresAt").notNull(),
	ipAddress: text("ipAddress"),
	userAgent: text("userAgent"),
	impersonatedBy: bigint("impersonatedBy", { mode: "number" }).references(() => user.id, { onDelete: "set null" }),
	createdAt: dateTime("createdAt").notNull().defaultNow(),
	updatedAt: dateTime("updatedAt").notNull().defaultNow()
});
var account = pgTable("account", {
	id: identity("id"),
	userId: bigint("userId", { mode: "number" }).notNull().references(() => user.id, { onDelete: "cascade" }),
	accountId: text("accountId").notNull(),
	providerId: text("providerId").notNull(),
	accessToken: text("accessToken"),
	refreshToken: text("refreshToken"),
	idToken: text("idToken"),
	accessTokenExpiresAt: dateTime("accessTokenExpiresAt"),
	refreshTokenExpiresAt: dateTime("refreshTokenExpiresAt"),
	scope: text("scope"),
	password: text("password"),
	createdAt: dateTime("createdAt").notNull().defaultNow(),
	updatedAt: dateTime("updatedAt").notNull().defaultNow()
});
var verification = pgTable("verification", {
	id: identity("id"),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: dateTime("expiresAt").notNull(),
	createdAt: dateTime("createdAt").notNull().defaultNow(),
	updatedAt: dateTime("updatedAt").notNull().defaultNow()
});
var course = pgTable("course", {
	id: identity("id"),
	name: text("name").notNull(),
	description: text("description").notNull().default(""),
	createdByUserId: bigint("created_by_user_id", { mode: "number" }).notNull().references(() => user.id, { onDelete: "restrict" }),
	startsAt: dateTime("starts_at"),
	endsAt: dateTime("ends_at"),
	isActive: boolean("is_active").notNull().default(true),
	createdAt: dateTime("created_at").notNull().defaultNow(),
	updatedAt: dateTime("updated_at").notNull().defaultNow()
}, (table) => [index("course_creator_idx").on(table.createdByUserId)]);
var courseMember = pgTable("course_member", {
	id: identity("id"),
	courseId: bigint("course_id", { mode: "number" }).notNull().references(() => course.id, { onDelete: "cascade" }),
	userId: bigint("user_id", { mode: "number" }).notNull().references(() => user.id, { onDelete: "cascade" }),
	role: courseMemberRoleEnum("role").notNull().default("STUDENT"),
	status: courseMemberStatusEnum("status").notNull().default("ACTIVE"),
	joinedAt: dateTime("joined_at").notNull().defaultNow(),
	createdAt: dateTime("created_at").notNull().defaultNow(),
	updatedAt: dateTime("updated_at").notNull().defaultNow()
}, (table) => [uniqueIndex("course_member_course_user_uidx").on(table.courseId, table.userId), index("course_member_user_idx").on(table.userId)]);
var courseImport = pgTable("course_import", {
	id: identity("id"),
	courseId: bigint("course_id", { mode: "number" }).notNull().references(() => course.id, { onDelete: "cascade" }),
	uploadedByUserId: bigint("uploaded_by_user_id", { mode: "number" }).notNull().references(() => user.id, { onDelete: "restrict" }),
	originalFilename: text("original_filename").notNull(),
	storageKey: text("storage_key"),
	totalRows: integer("total_rows").notNull().default(0),
	createdUsers: integer("created_users").notNull().default(0),
	existingUsers: integer("existing_users").notNull().default(0),
	rejectedRows: integer("rejected_rows").notNull().default(0),
	errors: jsonb("errors").notNull().default([]),
	createdAt: dateTime("created_at").notNull().defaultNow()
});
var courseInvitation = pgTable("course_invitation", {
	id: identity("id"),
	courseId: bigint("course_id", { mode: "number" }).notNull().references(() => course.id, { onDelete: "cascade" }),
	importId: bigint("import_id", { mode: "number" }).references(() => courseImport.id, { onDelete: "set null" }),
	email: text("email").notNull(),
	invitedByUserId: bigint("invited_by_user_id", { mode: "number" }).notNull().references(() => user.id, { onDelete: "restrict" }),
	matchedUserId: bigint("matched_user_id", { mode: "number" }).references(() => user.id, { onDelete: "set null" }),
	acceptedAt: dateTime("accepted_at"),
	expiresAt: dateTime("expires_at"),
	createdAt: dateTime("created_at").notNull().defaultNow()
});
var activity = pgTable("course_activity", {
	id: identity("id"),
	courseId: bigint("course_id", { mode: "number" }).notNull().references(() => course.id, { onDelete: "cascade" }),
	createdByUserId: bigint("created_by_user_id", { mode: "number" }).notNull().references(() => user.id, { onDelete: "restrict" }),
	kind: activityKindEnum("kind").notNull(),
	status: activityStatusEnum("status").notNull().default("DRAFT"),
	title: text("title").notNull(),
	description: text("description").notNull().default(""),
	objective: text("objective").notNull(),
	durationMinutes: integer("duration_minutes"),
	maxCorrectionsPerStudent: integer("max_corrections_per_student"),
	allowedCorrectionFocuses: jsonb("allowed_correction_focuses").notNull().default([
		"LIGHT",
		"CAMERA",
		"MATERIAL",
		"TEXTURE",
		"GENERAL"
	]),
	availableFrom: dateTime("available_from"),
	availableUntil: dateTime("available_until"),
	resultsReleasedAt: dateTime("results_released_at"),
	displayOrder: integer("display_order").notNull().default(0),
	createdAt: dateTime("created_at").notNull().defaultNow(),
	updatedAt: dateTime("updated_at").notNull().defaultNow()
}, (table) => [index("activity_course_idx").on(table.courseId)]);
var activityReferenceImage = pgTable("activity_reference_image", {
	id: identity("id"),
	activityId: bigint("activity_id", { mode: "number" }).notNull().references(() => activity.id, { onDelete: "cascade" }),
	uploadedByUserId: bigint("uploaded_by_user_id", { mode: "number" }).notNull().references(() => user.id, { onDelete: "restrict" }),
	storageKey: text("storage_key").notNull(),
	originalFilename: text("original_filename").notNull(),
	mimeType: text("mime_type").notNull(),
	viewType: imageViewTypeEnum("view_type").notNull(),
	customViewLabel: text("custom_view_label"),
	altText: text("alt_text").notNull().default(""),
	displayOrder: integer("display_order").notNull().default(0),
	createdAt: dateTime("created_at").notNull().defaultNow()
}, (table) => [index("reference_image_activity_idx").on(table.activityId, table.displayOrder)]);
var correctionSession = pgTable("correction_session", {
	id: identity("id"),
	activityId: bigint("activity_id", { mode: "number" }).notNull().references(() => activity.id, { onDelete: "cascade" }),
	referenceImageId: bigint("reference_image_id", { mode: "number" }).references(() => activityReferenceImage.id, { onDelete: "set null" }),
	analysisFocus: text("analysis_focus"),
	studentUserId: bigint("student_user_id", { mode: "number" }).references(() => user.id, { onDelete: "set null" }),
	anonymousAlias: text("anonymous_alias"),
	isAnonymous: boolean("is_anonymous").notNull().default(false),
	openedAt: dateTime("opened_at").notNull().defaultNow(),
	updatedAt: dateTime("updated_at").notNull().defaultNow()
}, (table) => [index("correction_session_activity_idx").on(table.activityId), index("correction_session_student_idx").on(table.studentUserId)]);
var correctionAttempt = pgTable("correction_attempt", {
	id: identity("id"),
	sessionId: bigint("session_id", { mode: "number" }).notNull().references(() => correctionSession.id, { onDelete: "cascade" }),
	attemptNumber: integer("attempt_number").notNull(),
	imageName: text("image_name").notNull(),
	focus: text("focus").notNull(),
	viewType: imageViewTypeEnum("view_type").notNull(),
	viewLabel: text("view_label").notNull(),
	referenceImageId: bigint("reference_image_id", { mode: "number" }).references(() => activityReferenceImage.id, { onDelete: "set null" }),
	jobId: text("job_id"),
	jobStatus: text("job_status"),
	cancelledAt: dateTime("cancelled_at"),
	provider: text("provider"),
	model: text("model"),
	promptVersion: text("prompt_version"),
	summary: text("summary"),
	rawResponse: jsonb("raw_response"),
	failureReason: text("failure_reason"),
	detectedError: text("detected_error"),
	score: numeric("score", {
		precision: 5,
		scale: 2
	}),
	startedAt: dateTime("started_at"),
	completedAt: dateTime("completed_at"),
	createdAt: dateTime("created_at").notNull().defaultNow(),
	updatedAt: dateTime("updated_at").notNull().defaultNow()
}, (table) => [
	uniqueIndex("correction_attempt_session_number_uidx").on(table.sessionId, table.attemptNumber),
	index("correction_attempt_job_idx").on(table.jobId),
	index("correction_attempt_status_idx").on(table.jobStatus)
]);
var examSubmission = pgTable("exam_submission", {
	id: identity("id"),
	activityId: bigint("activity_id", { mode: "number" }).notNull().references(() => activity.id, { onDelete: "cascade" }),
	studentUserId: bigint("student_user_id", { mode: "number" }).notNull().references(() => user.id, { onDelete: "cascade" }),
	createdAt: dateTime("created_at").notNull().defaultNow(),
	updatedAt: dateTime("updated_at").notNull().defaultNow()
}, (table) => [uniqueIndex("exam_submission_activity_student_unique").on(table.activityId, table.studentUserId), index("exam_submission_activity_idx").on(table.activityId)]);
var examSubmissionFile = pgTable("exam_submission_file", {
	id: identity("id"),
	submissionId: bigint("submission_id", { mode: "number" }).notNull().references(() => examSubmission.id, { onDelete: "cascade" }),
	referenceImageId: bigint("reference_image_id", { mode: "number" }).notNull().references(() => activityReferenceImage.id),
	revision: integer("revision").notNull(),
	originalFilename: text("original_filename").notNull(),
	mimeType: text("mime_type").notNull(),
	storageKey: text("storage_key").notNull(),
	isCurrent: boolean("is_current").notNull().default(true),
	replacedAt: dateTime("replaced_at"),
	removedAt: dateTime("removed_at"),
	uploadedAt: dateTime("uploaded_at").notNull().defaultNow()
}, (table) => [
	uniqueIndex("exam_submission_file_revision_unique").on(table.submissionId, table.referenceImageId, table.revision),
	uniqueIndex("exam_submission_file_current_view_uidx").on(table.submissionId, table.referenceImageId).where(sql`${table.isCurrent}`),
	index("exam_submission_file_submission_idx").on(table.submissionId, table.uploadedAt)
]);
var examResult = pgTable("exam_result", {
	id: identity("id"),
	activityId: bigint("activity_id", { mode: "number" }).notNull().references(() => activity.id, { onDelete: "cascade" }),
	studentUserId: bigint("student_user_id", { mode: "number" }).notNull().references(() => user.id, { onDelete: "cascade" }),
	gradedByUserId: bigint("graded_by_user_id", { mode: "number" }).notNull().references(() => user.id, { onDelete: "restrict" }),
	status: resultStatusEnum("status").notNull().default("DRAFT"),
	score: numeric("score", {
		precision: 5,
		scale: 2
	}),
	feedback: text("feedback"),
	publishedAt: dateTime("published_at"),
	createdAt: dateTime("created_at").notNull().defaultNow(),
	updatedAt: dateTime("updated_at").notNull().defaultNow()
}, (table) => [uniqueIndex("exam_result_activity_student_uidx").on(table.activityId, table.studentUserId), index("exam_result_student_idx").on(table.studentUserId, table.status)]);
//#endregion
//#region src/lib/server/db/index.js
if (!private_env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
console.log("Using postgres client for database connection");
var client = postgres(private_env.DATABASE_URL, { prepare: false });
var db = drizzle(client, { schema: schema_exports });
//#endregion
export { correctionSession as a, courseInvitation as c, examSubmission as d, examSubmissionFile as f, user as h, correctionAttempt as i, courseMember as l, session as m, activity as n, course as o, schema_exports as p, activityReferenceImage as r, courseImport as s, db as t, examResult as u };
