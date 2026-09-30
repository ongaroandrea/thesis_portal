-- Complete PostgreSQL schema for the teaching-support portal.
-- This is a clean baseline: it does not depend on any previous table or migration.

BEGIN;

CREATE TYPE "app_user_role" AS ENUM ('developer', 'professor', 'student');
CREATE TYPE "course_member_role" AS ENUM ('PROFESSOR', 'STUDENT');
CREATE TYPE "course_member_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'REMOVED');
CREATE TYPE "activity_kind" AS ENUM ('LESSON', 'EXAM');
CREATE TYPE "activity_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "image_view_type" AS ENUM ('FRONT', 'SIDE', 'TOP', 'ANGLED', 'OTHER');
CREATE TYPE "error_severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "result_status" AS ENUM ('DRAFT', 'READY', 'PUBLISHED');

-- Better Auth user. Numeric IDs require advanced.database.generateId = 'serial'.
CREATE TABLE "user" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"name" text NOT NULL,
	"surname" text NOT NULL DEFAULT '',
	"email" text NOT NULL,
	"emailVerified" boolean NOT NULL DEFAULT false,
	"image" text,
	"role" "app_user_role" NOT NULL DEFAULT 'student',
	"first_access" boolean NOT NULL DEFAULT true,
	"banned" boolean NOT NULL DEFAULT false,
	"banReason" text,
	"banExpires" timestamptz,
	"createdAt" timestamptz NOT NULL DEFAULT now(),
	"updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "user_email_unique" ON "user" (lower("email"));

CREATE TABLE "session" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"userId" bigint NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamptz NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"impersonatedBy" bigint,
	"createdAt" timestamptz NOT NULL DEFAULT now(),
	"updatedAt" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "session_user_fk"
		FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE,
	CONSTRAINT "session_impersonator_fk"
		FOREIGN KEY ("impersonatedBy") REFERENCES "user"("id") ON DELETE SET NULL,
	CONSTRAINT "session_token_unique" UNIQUE ("token")
);

CREATE TABLE "account" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"userId" bigint NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamptz,
	"refreshTokenExpiresAt" timestamptz,
	"scope" text,
	"password" text,
	"createdAt" timestamptz NOT NULL DEFAULT now(),
	"updatedAt" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "account_user_fk"
		FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE,
	CONSTRAINT "account_provider_unique" UNIQUE ("providerId", "accountId")
);

CREATE TABLE "verification" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamptz NOT NULL,
	"createdAt" timestamptz NOT NULL DEFAULT now(),
	"updatedAt" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "verification_identifier_value_unique" UNIQUE ("identifier", "value")
);

CREATE TABLE "course" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"name" text NOT NULL,
	"description" text NOT NULL DEFAULT '',
	"created_by_user_id" bigint NOT NULL,
	"starts_at" timestamptz,
	"ends_at" timestamptz,
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "course_creator_user_fk"
		FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT,
	CONSTRAINT "course_valid_availability"
		CHECK ("ends_at" IS NULL OR "starts_at" IS NULL OR "ends_at" > "starts_at")
);

-- A course has one historical creator but can be managed by many professors.
CREATE TABLE "course_member" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"course_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"role" "course_member_role" NOT NULL DEFAULT 'STUDENT',
	"status" "course_member_status" NOT NULL DEFAULT 'ACTIVE',
	"joined_at" timestamptz NOT NULL DEFAULT now(),
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "course_member_course_fk"
		FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE,
	CONSTRAINT "course_member_user_fk"
		FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE,
	CONSTRAINT "course_member_unique" UNIQUE ("course_id", "user_id")
);

CREATE FUNCTION "add_course_creator_as_professor"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	INSERT INTO "course_member" ("course_id", "user_id", "role", "status")
	VALUES (NEW."id", NEW."created_by_user_id", 'PROFESSOR', 'ACTIVE');
	RETURN NEW;
END;
$$;

CREATE TRIGGER "course_creator_membership_trigger"
AFTER INSERT ON "course"
FOR EACH ROW EXECUTE FUNCTION "add_course_creator_as_professor"();

CREATE TABLE "course_import" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"course_id" bigint NOT NULL,
	"uploaded_by_user_id" bigint NOT NULL,
	"original_filename" text NOT NULL,
	"storage_key" text,
	"total_rows" integer NOT NULL DEFAULT 0,
	"created_users" integer NOT NULL DEFAULT 0,
	"existing_users" integer NOT NULL DEFAULT 0,
	"rejected_rows" integer NOT NULL DEFAULT 0,
	"errors" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "course_import_course_fk"
		FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE,
	CONSTRAINT "course_import_uploader_fk"
		FOREIGN KEY ("uploaded_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT,
	CONSTRAINT "course_import_non_negative_counts"
		CHECK ("total_rows" >= 0 AND "created_users" >= 0 AND "existing_users" >= 0 AND "rejected_rows" >= 0)
);

-- Imported emails are allow-list records. Email verification proves ownership;
-- no separate invitation token is needed.
CREATE TABLE "course_invitation" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"course_id" bigint NOT NULL,
	"import_id" bigint,
	"email" text NOT NULL,
	"invited_by_user_id" bigint NOT NULL,
	"matched_user_id" bigint,
	"accepted_at" timestamptz,
	"expires_at" timestamptz,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "course_invitation_course_fk"
		FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE,
	CONSTRAINT "course_invitation_import_fk"
		FOREIGN KEY ("import_id") REFERENCES "course_import"("id") ON DELETE SET NULL,
	CONSTRAINT "course_invitation_inviter_fk"
		FOREIGN KEY ("invited_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT,
	CONSTRAINT "course_invitation_matched_user_fk"
		FOREIGN KEY ("matched_user_id") REFERENCES "user"("id") ON DELETE SET NULL,
	CONSTRAINT "course_invitation_polito_email"
		CHECK (lower("email") ~ '^[^@[:space:]]+@([a-z0-9-]+[.])*polito[.]it$')
);

CREATE UNIQUE INDEX "course_invitation_course_email_unique"
	ON "course_invitation" ("course_id", lower("email"));

CREATE TABLE "course_activity" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"course_id" bigint NOT NULL,
	"created_by_user_id" bigint NOT NULL,
	"kind" "activity_kind" NOT NULL,
	"status" "activity_status" NOT NULL DEFAULT 'DRAFT',
	"title" text NOT NULL,
	"description" text NOT NULL DEFAULT '',
	"objective" text NOT NULL,
	"duration_minutes" integer,
	"max_corrections_per_student" integer,
	"allowed_correction_focuses" jsonb NOT NULL DEFAULT '["LIGHT", "CAMERA", "MATERIAL", "TEXTURE", "GENERAL"]'::jsonb,
	"available_from" timestamptz,
	"available_until" timestamptz,
	"results_released_at" timestamptz,
	"display_order" integer NOT NULL DEFAULT 0,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "course_activity_course_fk"
		FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE,
	CONSTRAINT "course_activity_creator_fk"
		FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT,
	CONSTRAINT "course_activity_positive_duration"
		CHECK ("duration_minutes" IS NULL OR "duration_minutes" > 0),
	CONSTRAINT "course_activity_positive_limit"
		CHECK ("max_corrections_per_student" IS NULL OR "max_corrections_per_student" > 0),
	CONSTRAINT "course_activity_valid_availability"
		CHECK ("available_until" IS NULL OR "available_from" IS NULL OR "available_until" > "available_from"),
	CONSTRAINT "course_activity_results_only_for_exam"
		CHECK ("results_released_at" IS NULL OR "kind" = 'EXAM')
);

CREATE TABLE "activity_reference_image" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"activity_id" bigint NOT NULL,
	"uploaded_by_user_id" bigint NOT NULL,
	"storage_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"view_type" "image_view_type" NOT NULL,
	"custom_view_label" text,
	"alt_text" text NOT NULL DEFAULT '',
	"display_order" integer NOT NULL DEFAULT 0,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "activity_reference_image_activity_fk"
		FOREIGN KEY ("activity_id") REFERENCES "course_activity"("id") ON DELETE CASCADE,
	CONSTRAINT "activity_reference_image_uploader_fk"
		FOREIGN KEY ("uploaded_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT,
	CONSTRAINT "activity_reference_image_other_label"
		CHECK (
			("view_type" = 'OTHER' AND nullif(trim("custom_view_label"), '') IS NOT NULL)
			OR ("view_type" <> 'OTHER' AND "custom_view_label" IS NULL)
		)
);

-- Configurable correction choices such as CAMERA, LIGHTING and TEXTURE.
CREATE TABLE "correction_aspect" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"course_id" bigint NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL DEFAULT '',
	"is_active" boolean NOT NULL DEFAULT true,
	"display_order" integer NOT NULL DEFAULT 0,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "correction_aspect_course_fk"
		FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE,
	CONSTRAINT "correction_aspect_course_code_unique" UNIQUE ("course_id", "code")
);

-- The UI may present this as a chat, but it is a timeline of image attempts.
CREATE TABLE "correction_session" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"activity_id" bigint NOT NULL,
	"reference_image_id" bigint,
	"analysis_focus" text,
	"student_user_id" bigint,
	"anonymous_alias" text,
	"is_anonymous" boolean NOT NULL DEFAULT false,
	"opened_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "correction_session_activity_fk"
		FOREIGN KEY ("activity_id") REFERENCES "course_activity"("id") ON DELETE CASCADE,
	CONSTRAINT "correction_session_reference_image_fk"
		FOREIGN KEY ("reference_image_id") REFERENCES "activity_reference_image"("id") ON DELETE SET NULL,
	CONSTRAINT "correction_session_student_fk"
		FOREIGN KEY ("student_user_id") REFERENCES "user"("id") ON DELETE SET NULL,
	CONSTRAINT "correction_session_anonymous_alias_required"
		CHECK (NOT "is_anonymous" OR nullif(trim("anonymous_alias"), '') IS NOT NULL),
	CONSTRAINT "correction_session_analysis_focus"
		CHECK ("analysis_focus" IS NULL OR "analysis_focus" IN ('LIGHT', 'CAMERA', 'MATERIAL', 'TEXTURE', 'GENERAL'))
);

-- One attempt represents one submitted image and its analysis lifecycle.
CREATE TABLE "correction_attempt" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"session_id" bigint NOT NULL,
	"attempt_number" integer NOT NULL,
	"image_name" text NOT NULL,
	"focus" text NOT NULL,
	"view_type" "image_view_type" NOT NULL,
	"view_label" text NOT NULL,
	"reference_image_id" bigint,
	"job_id" text,
	"job_status" text,
	"cancelled_at" timestamptz,
	"provider" text,
	"model" text,
	"prompt_version" text,
	"summary" text,
	"raw_response" jsonb,
	"failure_reason" text,
	"detected_error" text,
	"score" numeric(5,2),
	"started_at" timestamptz,
	"completed_at" timestamptz,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "correction_attempt_session_fk"
		FOREIGN KEY ("session_id") REFERENCES "correction_session"("id") ON DELETE CASCADE,
	CONSTRAINT "correction_attempt_reference_image_fk"
		FOREIGN KEY ("reference_image_id") REFERENCES "activity_reference_image"("id") ON DELETE SET NULL,
	CONSTRAINT "correction_attempt_positive_number" CHECK ("attempt_number" > 0),
	CONSTRAINT "correction_attempt_unique_number" UNIQUE ("session_id", "attempt_number"),
	CONSTRAINT "correction_attempt_focus"
		CHECK ("focus" IN ('LIGHT', 'CAMERA', 'MATERIAL', 'TEXTURE', 'GENERAL')),
	CONSTRAINT "correction_attempt_job_status"
		CHECK ("job_status" IS NULL OR "job_status" IN ('queued', 'processing', 'completed', 'failed', 'unavailable')),
	CONSTRAINT "correction_attempt_score_range"
		CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= 30)),
	CONSTRAINT "correction_attempt_valid_times"
		CHECK ("completed_at" IS NULL OR "started_at" IS NULL OR "completed_at" >= "started_at"),
	CONSTRAINT "correction_attempt_required_text"
		CHECK (
			nullif(trim("image_name"), '') IS NOT NULL
			AND nullif(trim("view_label"), '') IS NOT NULL
		)
);

-- Errors may be global or course-specific and can be defined later.
CREATE TABLE "error_type" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"course_id" bigint,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL DEFAULT '',
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "error_type_course_fk"
		FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "error_type_global_code_unique"
	ON "error_type" ("code") WHERE "course_id" IS NULL;
CREATE UNIQUE INDEX "error_type_course_code_unique"
	ON "error_type" ("course_id", "code") WHERE "course_id" IS NOT NULL;

CREATE TABLE "analysis_error" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"attempt_id" bigint NOT NULL,
	"error_type_id" bigint NOT NULL,
	"severity" "error_severity" NOT NULL,
	"confidence" numeric(5,4),
	"title" text NOT NULL,
	"description" text NOT NULL,
	"suggestion" text,
	"coordinates" jsonb,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "analysis_error_attempt_fk"
		FOREIGN KEY ("attempt_id") REFERENCES "correction_attempt"("id") ON DELETE CASCADE,
	CONSTRAINT "analysis_error_type_fk"
		FOREIGN KEY ("error_type_id") REFERENCES "error_type"("id") ON DELETE RESTRICT,
	CONSTRAINT "analysis_error_confidence_range"
		CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1))
);

-- Exam uploads are versioned: replacing or removing a file never erases history.
CREATE TABLE "exam_submission" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"activity_id" bigint NOT NULL,
	"student_user_id" bigint NOT NULL,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "exam_submission_activity_fk" FOREIGN KEY ("activity_id") REFERENCES "course_activity"("id") ON DELETE CASCADE,
	CONSTRAINT "exam_submission_student_fk" FOREIGN KEY ("student_user_id") REFERENCES "user"("id") ON DELETE CASCADE,
	CONSTRAINT "exam_submission_activity_student_unique" UNIQUE ("activity_id", "student_user_id")
);

CREATE TABLE "exam_submission_file" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"submission_id" bigint NOT NULL,
	"reference_image_id" bigint NOT NULL,
	"revision" integer NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"is_current" boolean NOT NULL DEFAULT true,
	"replaced_at" timestamptz,
	"removed_at" timestamptz,
	"uploaded_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "exam_submission_file_submission_fk" FOREIGN KEY ("submission_id") REFERENCES "exam_submission"("id") ON DELETE CASCADE,
	CONSTRAINT "exam_submission_file_reference_fk" FOREIGN KEY ("reference_image_id") REFERENCES "activity_reference_image"("id") ON DELETE NO ACTION,
	CONSTRAINT "exam_submission_file_positive_revision" CHECK ("revision" > 0),
	CONSTRAINT "exam_submission_file_revision_unique" UNIQUE ("submission_id", "reference_image_id", "revision")
);

-- Official exam result, separate from the LLM's indicative score.
CREATE TABLE "exam_result" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"activity_id" bigint NOT NULL,
	"student_user_id" bigint NOT NULL,
	"graded_by_user_id" bigint NOT NULL,
	"status" "result_status" NOT NULL DEFAULT 'DRAFT',
	"score" numeric(5,2),
	"feedback" text,
	"published_at" timestamptz,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "exam_result_activity_fk"
		FOREIGN KEY ("activity_id") REFERENCES "course_activity"("id") ON DELETE CASCADE,
	CONSTRAINT "exam_result_student_fk"
		FOREIGN KEY ("student_user_id") REFERENCES "user"("id") ON DELETE CASCADE,
	CONSTRAINT "exam_result_grader_fk"
		FOREIGN KEY ("graded_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT,
	CONSTRAINT "exam_result_unique_student" UNIQUE ("activity_id", "student_user_id"),
	CONSTRAINT "exam_result_score_range"
		CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= 30)),
	CONSTRAINT "exam_result_publish_consistency"
		CHECK (("status" = 'PUBLISHED' AND "published_at" IS NOT NULL) OR "status" <> 'PUBLISHED')
);

-- Cross-table grading constraints. The service layer controls visibility, while
-- these triggers prevent direct database writes from grading outside scope.
CREATE FUNCTION "validate_exam_result_scope"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	result_course_id bigint;
	result_activity_kind "activity_kind";
	grader_role "app_user_role";
BEGIN
	SELECT "course_id", "kind"
	INTO result_course_id, result_activity_kind
	FROM "course_activity"
	WHERE "id" = NEW."activity_id";

	IF result_activity_kind IS DISTINCT FROM 'EXAM' THEN
		RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'exam results require an EXAM activity';
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM "course_member"
		WHERE "course_id" = result_course_id
			AND "user_id" = NEW."student_user_id"
			AND "role" = 'STUDENT'
			AND "status" = 'ACTIVE'
	) THEN
		RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'exam result student must be actively enrolled';
	END IF;

	SELECT "role" INTO grader_role FROM "user" WHERE "id" = NEW."graded_by_user_id";
	IF grader_role <> 'developer' AND NOT (
		grader_role = 'professor' AND EXISTS (
			SELECT 1 FROM "course_member"
			WHERE "course_id" = result_course_id
				AND "user_id" = NEW."graded_by_user_id"
				AND "role" = 'PROFESSOR'
				AND "status" = 'ACTIVE'
		)
	) THEN
		RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'grader does not manage the exam course';
	END IF;

	RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "exam_result_scope_constraint"
AFTER INSERT OR UPDATE ON "exam_result"
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION "validate_exam_result_scope"();

-- Keep audit timestamps correct even when rows are updated outside the application.
CREATE FUNCTION "set_updated_at_snake_case"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	NEW."updated_at" = now();
	RETURN NEW;
END;
$$;

CREATE FUNCTION "set_updated_at_camel_case"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	NEW."updatedAt" = now();
	RETURN NEW;
END;
$$;

CREATE TRIGGER "user_set_updated_at" BEFORE UPDATE ON "user"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_camel_case"();
CREATE TRIGGER "session_set_updated_at" BEFORE UPDATE ON "session"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_camel_case"();
CREATE TRIGGER "account_set_updated_at" BEFORE UPDATE ON "account"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_camel_case"();
CREATE TRIGGER "verification_set_updated_at" BEFORE UPDATE ON "verification"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_camel_case"();
CREATE TRIGGER "course_set_updated_at" BEFORE UPDATE ON "course"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_snake_case"();
CREATE TRIGGER "course_member_set_updated_at" BEFORE UPDATE ON "course_member"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_snake_case"();
CREATE TRIGGER "course_activity_set_updated_at" BEFORE UPDATE ON "course_activity"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_snake_case"();
CREATE TRIGGER "correction_session_set_updated_at" BEFORE UPDATE ON "correction_session"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_snake_case"();
CREATE TRIGGER "correction_attempt_set_updated_at" BEFORE UPDATE ON "correction_attempt"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_snake_case"();
CREATE TRIGGER "exam_submission_set_updated_at" BEFORE UPDATE ON "exam_submission"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_snake_case"();
CREATE TRIGGER "exam_result_set_updated_at" BEFORE UPDATE ON "exam_result"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_snake_case"();

CREATE INDEX "session_user_idx" ON "session" ("userId");
CREATE INDEX "account_user_idx" ON "account" ("userId");
CREATE INDEX "course_creator_idx" ON "course" ("created_by_user_id");
CREATE INDEX "course_availability_idx" ON "course" ("is_active", "starts_at", "ends_at");
CREATE INDEX "course_member_user_idx" ON "course_member" ("user_id", "status");
CREATE INDEX "course_invitation_email_idx" ON "course_invitation" (lower("email"));
CREATE INDEX "course_activity_course_idx" ON "course_activity" ("course_id", "status", "display_order");
CREATE INDEX "course_activity_availability_idx" ON "course_activity" ("available_from", "available_until");
CREATE INDEX "reference_image_activity_idx" ON "activity_reference_image" ("activity_id", "display_order");
CREATE INDEX "correction_aspect_course_idx" ON "correction_aspect" ("course_id", "display_order");
CREATE INDEX "correction_session_student_idx" ON "correction_session" ("student_user_id", "activity_id");
CREATE INDEX "correction_session_activity_idx" ON "correction_session" ("activity_id");
CREATE INDEX "correction_session_reference_image_idx" ON "correction_session" ("reference_image_id");
CREATE INDEX "correction_attempt_session_idx" ON "correction_attempt" ("session_id", "attempt_number");
CREATE INDEX "correction_attempt_job_idx" ON "correction_attempt" ("job_id");
CREATE INDEX "correction_attempt_status_idx" ON "correction_attempt" ("job_status");
CREATE INDEX "analysis_error_attempt_idx" ON "analysis_error" ("attempt_id");
CREATE INDEX "analysis_error_type_idx" ON "analysis_error" ("error_type_id", "severity");
CREATE INDEX "exam_submission_activity_idx" ON "exam_submission" ("activity_id");
CREATE INDEX "exam_submission_file_submission_idx" ON "exam_submission_file" ("submission_id", "uploaded_at");
CREATE UNIQUE INDEX "exam_submission_file_current_view_uidx" ON "exam_submission_file" ("submission_id", "reference_image_id") WHERE "is_current";
CREATE INDEX "exam_result_student_idx" ON "exam_result" ("student_user_id", "status");

-- Privacy-safe projection for professor-facing lists. The application must also
-- filter rows to courses managed by the authenticated professor.
CREATE VIEW "professor_correction_overview"
WITH (security_barrier = true) AS
SELECT
	cs."id",
	cs."activity_id",
	ca."course_id",
	CASE
		WHEN latest_attempt."job_status" IN ('queued', 'processing') THEN 'PROCESSING'
		WHEN latest_attempt."job_status" = 'completed' THEN 'ANSWERED'
		WHEN latest_attempt."job_status" IN ('failed', 'unavailable') THEN 'FAILED'
		ELSE 'OPEN'
	END AS "status",
	cs."is_anonymous",
	CASE WHEN cs."is_anonymous" THEN cs."anonymous_alias"
		 ELSE concat_ws(' ', u."name", u."surname") END AS "student_display_name",
	CASE WHEN cs."is_anonymous" THEN NULL ELSE u."email" END AS "student_email",
	cs."opened_at",
	cs."updated_at"
FROM "correction_session" cs
JOIN "course_activity" ca ON ca."id" = cs."activity_id"
LEFT JOIN "user" u ON u."id" = cs."student_user_id"
LEFT JOIN LATERAL (
	SELECT catt."job_status"
	FROM "correction_attempt" catt
	WHERE catt."session_id" = cs."id"
		AND catt."cancelled_at" IS NULL
	ORDER BY catt."attempt_number" DESC
	LIMIT 1
) latest_attempt ON true;

CREATE VIEW "activity_error_statistics"
WITH (security_barrier = true) AS
SELECT
	ca."course_id",
	ca."id" AS "activity_id",
	et."id" AS "error_type_id",
	et."code" AS "error_code",
	et."name" AS "error_name",
	count(ae."id") AS "occurrences",
	avg(catt."score") AS "average_attempt_score"
FROM "course_activity" ca
JOIN "correction_session" cs ON cs."activity_id" = ca."id"
JOIN "correction_attempt" catt ON catt."session_id" = cs."id" AND catt."job_status" = 'completed'
JOIN "analysis_error" ae ON ae."attempt_id" = catt."id"
JOIN "error_type" et ON et."id" = ae."error_type_id"
GROUP BY ca."course_id", ca."id", et."id", et."code", et."name";

COMMENT ON COLUMN "course"."created_by_user_id" IS
	'Historical creator. Current management permission comes from course_member role PROFESSOR.';
COMMENT ON COLUMN "correction_session"."student_user_id" IS
	'Sensitive: never expose it to professors when is_anonymous is true.';
COMMENT ON COLUMN "correction_attempt"."score" IS
	'Indicative assistant score, separate from the official exam result.';

COMMIT;
