ALTER TABLE "course_activity"
ADD COLUMN "allowed_correction_focuses" jsonb NOT NULL
DEFAULT '["LIGHT", "CAMERA", "MATERIAL", "TEXTURE", "GENERAL"]'::jsonb;
