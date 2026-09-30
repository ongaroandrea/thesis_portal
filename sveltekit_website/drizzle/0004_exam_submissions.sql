BEGIN;

CREATE TABLE "exam_submission" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"activity_id" bigint NOT NULL REFERENCES "course_activity"("id") ON DELETE CASCADE,
	"student_user_id" bigint NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "exam_submission_activity_student_unique" UNIQUE ("activity_id", "student_user_id")
);

CREATE TABLE "exam_submission_file" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"submission_id" bigint NOT NULL REFERENCES "exam_submission"("id") ON DELETE CASCADE,
	"reference_image_id" bigint NOT NULL REFERENCES "activity_reference_image"("id") ON DELETE NO ACTION,
	"revision" integer NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"is_current" boolean NOT NULL DEFAULT true,
	"replaced_at" timestamptz,
	"removed_at" timestamptz,
	"uploaded_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "exam_submission_file_positive_revision" CHECK ("revision" > 0),
	CONSTRAINT "exam_submission_file_revision_unique" UNIQUE ("submission_id", "reference_image_id", "revision")
);

CREATE UNIQUE INDEX "exam_submission_file_current_view_uidx"
	ON "exam_submission_file" ("submission_id", "reference_image_id")
	WHERE "is_current";
CREATE INDEX "exam_submission_activity_idx" ON "exam_submission" ("activity_id");
CREATE INDEX "exam_submission_file_submission_idx" ON "exam_submission_file" ("submission_id", "uploaded_at");

CREATE TRIGGER "exam_submission_set_updated_at"
	BEFORE UPDATE ON "exam_submission"
	FOR EACH ROW EXECUTE FUNCTION "set_updated_at_snake_case"();

COMMIT;
