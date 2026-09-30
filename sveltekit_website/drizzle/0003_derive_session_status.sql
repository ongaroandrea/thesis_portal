BEGIN;

-- This view and index depend on correction_session.status in existing databases.
-- Recreate them without persisted session state before dropping the column.
DROP VIEW IF EXISTS "professor_correction_overview";
DROP INDEX IF EXISTS "correction_session_activity_status_idx";

ALTER TABLE "correction_session"
	DROP COLUMN IF EXISTS "closed_at",
	DROP COLUMN IF EXISTS "status";

DROP TYPE IF EXISTS "correction_session_status";

CREATE INDEX IF NOT EXISTS "correction_session_activity_idx"
	ON "correction_session" ("activity_id");

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

COMMIT;
