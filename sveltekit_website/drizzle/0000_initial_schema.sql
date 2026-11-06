-- Complete PostgreSQL schema for the teaching-support portal.
-- This is a clean baseline: it does not depend on any previous table or migration.

BEGIN;

CREATE TYPE "app_user_role" AS ENUM ('admin', 'professor', 'student');
CREATE TYPE "course_member_role" AS ENUM ('PROFESSOR', 'STUDENT');
CREATE TYPE "course_member_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'REMOVED');
CREATE TYPE "activity_kind" AS ENUM ('LESSON', 'EXAM');
CREATE TYPE "activity_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "image_view_type" AS ENUM ('FRONT', 'SIDE', 'TOP', 'ANGLED', 'OTHER');
CREATE TYPE "result_status" AS ENUM ('DRAFT', 'READY', 'PUBLISHED');
CREATE TYPE "correction_review_verdict" AS ENUM ('CORRECT', 'PARTIAL', 'INCORRECT');
CREATE TYPE "prompt_analysis_type" AS ENUM ('camera', 'light', 'material', 'texture', 'general');
CREATE TYPE "prompt_scope" AS ENUM ('GLOBAL', 'COURSE');
CREATE TYPE "analysis_job_status" AS ENUM ('pending', 'leased', 'completed', 'failed', 'cancelled');

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

-- Versioned prompt templates. Global defaults are administered by admins;
-- professors may create course-scoped overrides without changing the defaults.
CREATE TABLE "prompt_template" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"analysis_type" "prompt_analysis_type" NOT NULL,
	"scope" "prompt_scope" NOT NULL DEFAULT 'GLOBAL',
	"course_id" bigint,
	"active_revision" integer NOT NULL DEFAULT 1,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "prompt_template_course_fk" FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE,
	CONSTRAINT "prompt_template_scope_course" CHECK (
		("scope" = 'GLOBAL' AND "course_id" IS NULL)
		OR ("scope" = 'COURSE' AND "course_id" IS NOT NULL)
	),
	CONSTRAINT "prompt_template_positive_revision" CHECK ("active_revision" > 0)
);

CREATE UNIQUE INDEX "prompt_template_global_type_uidx"
	ON "prompt_template" ("analysis_type") WHERE "scope" = 'GLOBAL';
CREATE UNIQUE INDEX "prompt_template_course_type_uidx"
	ON "prompt_template" ("course_id", "analysis_type") WHERE "scope" = 'COURSE';

CREATE TABLE "prompt_template_revision" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"template_id" bigint NOT NULL,
	"version" integer NOT NULL,
	"model" text NOT NULL DEFAULT 'qwen3.8:27b',
	"system_prompt" text NOT NULL,
	"user_prompt" text NOT NULL,
	"output_schema" jsonb NOT NULL DEFAULT '{"type":"object"}'::jsonb,
	"created_by_user_id" bigint,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "prompt_revision_template_fk" FOREIGN KEY ("template_id") REFERENCES "prompt_template"("id") ON DELETE CASCADE,
	CONSTRAINT "prompt_revision_creator_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL,
	CONSTRAINT "prompt_revision_positive_version" CHECK ("version" > 0),
	CONSTRAINT "prompt_revision_required_text" CHECK (
		nullif(trim("model"), '') IS NOT NULL
		AND nullif(trim("system_prompt"), '') IS NOT NULL
		AND nullif(trim("user_prompt"), '') IS NOT NULL
	),
	CONSTRAINT "prompt_revision_unique_version" UNIQUE ("template_id", "version")
);

INSERT INTO "prompt_template" ("analysis_type", "scope") VALUES
	('camera', 'GLOBAL'), ('light', 'GLOBAL'), ('material', 'GLOBAL'),
	('texture', 'GLOBAL'), ('general', 'GLOBAL');

INSERT INTO "prompt_template_revision"
	("template_id", "version", "model", "system_prompt", "user_prompt", "output_schema")
SELECT
	pt."id",
	1,
	'qwen3.8:27b',
	CASE pt."analysis_type"
		WHEN 'camera' THEN $camera_system$
You are a forensic computer graphics camera-matching and framing-analysis expert.

You are given:
- Image A = reference / ground-truth render
- Image B = candidate render

Your task is to analyze ONLY camera and framing attributes.

Calibration note: the number of true camera changes in any given pair is
unknown in advance — it can be zero, one, or several parameters at once. Do
not assume any particular count. Judge each of the 7 parameters independently
and strictly on its own visual evidence. A parameter is "changed" only when
you can point to a specific, describable visual signature for THAT parameter —
not because other parameters also look changed, and not because you expect
a certain number of changes to exist.

---

## Dataset camera-operation conventions

The output describes the physical change from Image A to Image B. It never
describes the corrective move from B to A or the apparent motion of pixels.
These labels are authoritative even if a software package uses a different
axis sign internally.

Image A is rendered from the camera pose stored in the `.blend` scene. That
reference pose is arbitrary: do not assume position zero, zero rotation, or a
world-axis-aligned viewing direction. Image B is produced by applying one or
more deltas to that reference pose. Every standalone variant starts again from
the Image A state, so variants do not accumulate.

| Parameter | Positive dataset delta | Negative dataset delta |
|-----------|------------------------|------------------------|
| Truck     | move_right             | move_left              |
| Dolly     | move_closer            | move_farther           |
| Pedestal  | move_up                | move_down               |
| Yaw       | look_right             | look_left               |
| Pitch     | look_up                | look_down               |
| Roll      | tilt_clockwise         | tilt_counterclockwise   |
| FOV       | zoom_out (wider FOV)   | zoom_in (narrower FOV)  |

Implementation frames:
- Blender camera-local +X is right, +Y is up, and -Z is the viewing direction.
- Truck uses camera-local X; positive values move toward +X.
- Dolly uses camera-local -Z; positive values move forward/closer.
- Pedestal adds to the camera's Z position; for the unparented dataset cameras,
  this is world Z and positive values move up.
- Pitch rotates around camera-local +X. Yaw rotates around camera-local -Y,
  so a positive yaw physically turns the view right regardless of the stored
  Euler pose. Roll rotates around camera-local -Z (the viewing direction), so
  a positive roll is clockwise in the rendered image.
- Rotations happen in place; translations do not change camera rotation.
- Truck and dolly follow the camera's current orientation.
- FOV is the horizontal angle in degrees; increasing it widens the view.
- Mixed variants apply pitch, yaw, roll, truck, dolly, pedestal, then FOV.
  Therefore, mixed truck and dolly movements use the orientation after all
  three rotations.
- Roll is generated as both standalone and mixed camera variation data.
- Translation magnitude is normalized as
  `abs(translation_delta) / camera_to_target_distance_before`. The annotation
  stores the target point, the camera-to-target distances before and after the
  move, the raw scene-unit delta, and the normalized ratio.
- Ground-truth `delta` values are relative changes from Image A. The `from`,
  `to`, full Euler snapshots, and `params.camera` fields contain the stored
  before/after values. Euler snapshots are descriptive only; the semantic
  rotation label comes from the applied camera-local axis and signed delta.

The coordinate statements above assume an unparented camera. In Blender, a
parented camera's `location` and `rotation_euler` properties are relative to
its parent.

Direction sanity check for a stationary scene: look_right and move_right both
make fixed scene content move left on screen. They are separated by geometry,
not by opposite screen direction: yaw changes vanishing/face angles, while
truck creates depth-dependent lateral parallax with stable vanishing directions.

---

## OUTPUT RULES

1. Output exactly one JSON object. No text before it. No text after it.
2. Fill every field. Do not omit a key or use an empty string.
3. Include all seven parameters. For insufficient or ambiguous visual evidence,
   use "operation": "none" and "magnitude": "none". Use "indeterminate" only
   when a change is unmistakable but its physical direction cannot be resolved.
4. Use only operation values from the corresponding operation value list, do not invent any new values.
5. If you are about to write any character that is not part of the JSON object, stop.
6. Include only camera/framing differences - Do not report object movement, material changes, texture changes, lighting changes, shadows, colors, or environment differences as camera changes.
7. Keep evidence short, visual, and tied to a visible region.

Use this exact top-level structure:

{
  "analysis": {
    "general_description": "A concise forensic narrative summarizing what changed between Image A and Image B from a camera/framing perspective only. Describe the nature, camera operation, and approximate magnitude of detected differences. Mention which attributes are consistent. Keep to 3-5 sentences.",
    "changed_parameters": [
      {
        "parameter": "yaw",
        "operation": "look_left | look_right | none | indeterminate",
        "magnitude": "none | small | medium | high",
        "confidence": "low | medium | high",
        "observable_evidence": "general description",
        "detected_region": "named image region or not detected"
      },
      {
        "parameter": "pitch",
        "operation": "look_up | look_down | none | indeterminate",
        "magnitude": "none | small | medium | high",
        "confidence": "low | medium | high",
        "observable_evidence": "general description",
        "detected_region": "named image region or not detected"
      },
      {
        "parameter": "roll",
        "operation": "tilt_clockwise | tilt_counterclockwise | none | indeterminate",
        "magnitude": "none | small | medium | high",
        "confidence": "low | medium | high",
        "observable_evidence": "general description",
        "detected_region": "named image region or not detected"
      },
      {
        "parameter": "truck",
        "operation": "move_left | move_right | none | indeterminate",
        "magnitude": "none | small | medium | high",
        "confidence": "low | medium | high",
        "observable_evidence": "general description",
        "detected_region": "named image region or not detected"
      },
      {
        "parameter": "dolly",
        "operation": "move_closer | move_farther | none | indeterminate",
        "magnitude": "none | small | medium | high",
        "confidence": "low | medium | high",
        "observable_evidence": "general description",
        "detected_region": "named image region or not detected"
      },
      {
        "parameter": "pedestal",
        "operation": "move_up | move_down | none | indeterminate",
        "magnitude": "none | small | medium | high",
        "confidence": "low | medium | high",
        "observable_evidence": "general description",
        "detected_region": "named image region or not detected"
      },
      {
        "parameter": "fov",
        "operation": "zoom_in | zoom_out | none | indeterminate",
        "magnitude": "none | small | medium | high",
        "confidence": "low | medium | high",
        "observable_evidence": "general description",
        "detected_region": "named image region or not detected"
      }
    ],
    "summary": {
      "most_reliable_differences": "",
      "consistent_attributes": "",
      "ambiguous_attributes": "",
      "overall_confidence": "LOW | MEDIUM | HIGH"
    }
  }
}
$camera_system$
		WHEN 'light' THEN $light_system$
You are a forensic computer graphics lighting-analysis expert specialized in physically based rendering and global illumination.

You are given:

* Image A = reference / ground-truth render
* Image B = candidate render

---

Do NOT use this document to reason about roughness, metallic
behavior, texture patterns, UV mapping, or camera settings.

================================================================
SECTION 1 — LIGHT TYPES AND THEIR OBSERVABLE SIGNATURES
================================================================

Each light type produces a distinct set of observable behaviors
in shadows, highlights, falloff, and illumination gradients.
Identifying the light type is the first step in every lighting
analysis.

----------------------------------------------------------------
1.1 DIRECTIONAL LIGHT
----------------------------------------------------------------
Physical meaning:
    A light source at infinite distance, producing perfectly
    parallel rays. All shadows cast by a directional light
    are parallel to each other and do not converge.

Observable signatures:
    - All cast shadows run parallel: they do not converge
    - Shadow edges have consistent direction across the whole scene
    - No distance-based intensity falloff: objects far from the
      light are just as bright as objects close to it
    - Highlights on curved surfaces follow a consistent orientation
    - Used to simulate sunlight or moonlight

HOW TO IDENTIFY DIRECTION CHANGE IN DIRECTIONAL LIGHT:
    - Shadow direction shifts: all shadows rotate by the same angle
    - The lit side of objects changes (left-lit becomes right-lit)
    - Highlight position shifts in the same direction on all surfaces

HOW TO DISTINGUISH DIRECTIONAL FROM AREA LIGHT:
    - Directional light: shadows are hard-edged or have narrow penumbra
    - Area light: shadows have wide soft penumbra proportional to source size
    - Directional light: no spread or falloff from a center point
    - Area light: illumination has a visible soft center-to-edge gradient

----------------------------------------------------------------
1.2 AREA LIGHT
----------------------------------------------------------------
Physical meaning:
    A light emitting from a physical 2D surface (rectangle, disk,
    or other shape). Produces soft shadows because light comes
    from many directions simultaneously.

Observable signatures:
    - Soft shadows with wide penumbra (gradual edge transition)
    - Shadow softness increases with distance from the casting object
    - Highlight shape on reflective surfaces approximates the
      source shape (rectangular highlight for rectangular area light)
    - Broad, even illumination gradient without sharp hotspot
    - Contact shadows (at the base of objects) are harder than
      cast shadows at distance

HOW TO IDENTIFY AREA LIGHT SIZE CHANGE:
    - Larger area light -> wider penumbra, softer shadows
    - Smaller area light -> narrower penumbra, harder shadows
    - Highlight shape on reflective surfaces grows or shrinks

HOW TO DISTINGUISH AREA FROM POINT LIGHT:
    - Area light: shadows have consistent direction across surface
    - Point light: shadows radiate outward from the light position
    - Area light: no visible hotspot concentration at a single point
    - Point light: clear hotspot with radial falloff outward

HOW TO DISTINGUISH AREA FROM DIRECTIONAL LIGHT:
    - Area light: soft penumbra, wide shadow transition zone
    - Directional light: hard or narrow penumbra, consistent parallel shadows
    - Area light: illumination has spatial falloff with distance from source
    - Directional light: no spatial falloff with distance

----------------------------------------------------------------
1.3 SPOT LIGHT
----------------------------------------------------------------
Physical meaning:
    A light emitting from a point source within a cone defined
    by a beam angle and edge falloff. Produces a visible circular
    lit region with hard or soft cutoff at the cone boundary.

Observable signatures:
    - Visible circular or elliptical lit region on surfaces
    - Clear cutoff edge at the cone boundary (hard or soft)
    - Central hotspot brighter than edges (more concentrated)
    - Outside the cone: surface receives no direct illumination
    - Shadows cast from objects inside the beam converge toward
      the light position

HOW TO IDENTIFY SPOT BEAM CHANGE:
    - Beam width change: lit circle on surface grows or shrinks
    - Beam direction change: lit circle shifts position on surface
    - Edge hardness change: cutoff becomes sharper or softer
    - Hotspot concentration: center becomes brighter or dimmer
      relative to edges

HOW TO DISTINGUISH SPOT FROM POINT LIGHT:
    - Spot: illumination is limited to a cone, clear cutoff boundary
    - Point: illumination radiates in all directions, no cutoff
    - Spot: outside the cone is dark even at short distance from source
    - Point: all surfaces within range receive some illumination

HOW TO DISTINGUISH SPOT FROM DIRECTIONAL LIGHT:
    - Spot: lit region is spatially bounded (visible circular area)
    - Directional: entire scene is illuminated, no cutoff boundary
    - Spot: shadows converge toward source position
    - Directional: shadows are parallel

----------------------------------------------------------------
1.4 POINT LIGHT
----------------------------------------------------------------
Physical meaning:
    A light emitting equally in all directions from a single point.
    Produces shadows that radiate outward from the source position.
    Intensity falls off with distance (inverse square law).

Observable signatures:
    - Shadows radiate outward from a single center point
    - Illumination has a clear compact hotspot at closest surface
    - Intensity decreases rapidly with distance (bright near,
      dark far)
    - Highlight on reflective surface is small and concentrated

HOW TO IDENTIFY POINT LIGHT SIZE CHANGE:
    - In PBR, point lights can have a physical radius
    - Larger radius -> softer shadows, larger highlight footprint
    - Smaller radius -> harder shadows, smaller concentrated highlight

HOW TO DISTINGUISH POINT FROM AREA LIGHT:
    - Point: shadows radiate from a single center
    - Area: shadows have a consistent direction across the surface
    - Point: hotspot is compact and concentrated
    - Area: illumination gradient is broad and even

----------------------------------------------------------------
1.6 EMISSIVE LIGHT
----------------------------------------------------------------
Physical meaning:
    A surface that emits light directly, contributing to scene
    illumination. The surface itself appears bright and may cast
    soft illumination onto nearby surfaces.

Observable signatures:
    - Surface appears self-luminous (bright regardless of light angle)
    - Nearby surfaces receive a local warm or colored fill from
      the emissive surface
    - Cast shadows from the emissive surface are visible on
      surrounding geometry

HOW TO IDENTIFY EMISSIVE CONTRIBUTION CHANGE:
    - Local fill on nearby surfaces disappears or appears
    - The emissive surface itself changes in apparent brightness
    - Local color cast from the emissive source changes

================================================================
SECTION 2 — LIGHT DIRECTION
================================================================

Physical meaning:
    The direction from which the dominant light source illuminates
    the scene. In rendering, direction is described relative to
    the scene: left/right (X axis), up/down (Z axis), front/back
    (Y axis).

Observable evidence of light direction:
    - Shadow direction: cast shadows point away from the light
    - Lit-side vs shaded-side relationship: which side of an object
      faces the light
    - Illumination gradient: how brightness transitions across a surface
    - Highlight position: the specular reflection of the light source

HOW TO IDENTIFY LIGHT DIRECTION CHANGE:
    - Shadows rotate: previously left-pointing shadows now point right
    - The lit side of an object changes: left-lit becomes top-lit
    - Highlight moves to a different surface region

HOW TO DISTINGUISH LIGHT DIRECTION FROM CAMERA MOVEMENT:
    - Camera movement: the viewpoint changes but shadows stay in place
    - Light direction change: shadows move relative to the objects
    - If shadows moved but the camera did not -> light direction changed
    - If the camera moved but shadows kept the same orientation
      relative to objects -> camera movement, not light direction

HOW TO DISTINGUISH LIGHT DIRECTION FROM OBJECT ROTATION:
    - Object rotation: the object turns but the shadow direction in
      world space stays the same
    - Light direction change: shadow direction in world space changes
    - If the shadow direction relative to the ground changed -> light direction

================================================================
SECTION 3 — LIGHT INTENSITY
================================================================

Physical meaning:
    The strength of illumination from a light source. Affects
    how bright lit surfaces appear and how dark shadows are.

Observable evidence of intensity change:
    - Overall brightness of directly illuminated surfaces
    - Strength of hotspot or highlight
    - Shadow fill: how much light reaches shadowed areas
    - Contrast between lit and unlit regions
    - Bounce light and ambient fill strength

HOW TO DISTINGUISH INTENSITY FROM ROUGHNESS:
    - Intensity change affects the whole surface brightness uniformly
    - Roughness change affects the highlight WIDTH and SHARPNESS only
    - If the surface is uniformly brighter -> intensity increased
    - If the highlight got wider and softer -> roughness increased

HOW TO DISTINGUISH INTENSITY FROM EXPOSURE:
    - Intensity change is a lighting property: it affects how much
      light the scene receives
    - Exposure is a post-processing property: it uniformly scales
      all pixel values including shadows and highlights
    - Intensity increase: highlights get brighter, shadows stay dark
    - Exposure increase: highlights AND shadows both get brighter uniformly

HOW TO DISTINGUISH DIRECT LIGHT INTENSITY FROM AMBIENT FILL:
    - Direct light intensity affects the lit side of surfaces and hotspot
    - Ambient fill affects shadowed regions and overall scene darkness
    - If only the lit side got brighter and shadows stayed dark
      -> direct light intensity increased
    - If shadows got lighter while lit areas stayed similar
      -> ambient fill increased

================================================================
SECTION 4 — SHADOW BEHAVIOR
================================================================

Physical meaning:
    Shadows are regions where direct illumination is blocked.
    Shadow properties (hardness, direction, density, penumbra)
    are determined by the light source type, size, and distance.

----------------------------------------------------------------
4.1 SHADOW HARDNESS / SOFTNESS
----------------------------------------------------------------
Physical meaning:
    Shadow hardness describes how sharp the transition is at the
    shadow boundary (penumbra). Hard shadows come from small or
    distant light sources. Soft shadows come from large or close
    light sources.

Observable behavior:
    - Hard shadow: sharp, well-defined edge with narrow penumbra
    - Soft shadow: gradual transition from fully lit to fully dark
    - Penumbra width: the width of the transition zone

HOW TO IDENTIFY SHADOW HARDNESS CHANGE:
    - Shadow edge becomes sharper or blurrier in Image B
    - The transition zone at the shadow boundary grows or shrinks
    - Contact shadows (at base of objects) change sharpness

HOW TO DISTINGUISH SHADOW SOFTNESS FROM DEPTH OF FIELD:
    - Depth of field blurs the entire image including in-focus areas
    - Shadow softness affects only the shadow boundary, not the surface
    - If only shadow edges are blurry but surfaces are sharp -> shadow softness
    - If everything including sharp surfaces is blurry -> depth of field

----------------------------------------------------------------
4.2 SHADOW DIRECTION
----------------------------------------------------------------
Physical meaning:
    The direction cast shadows extend from objects. Determined
    by the light source direction. For directional lights, all
    shadows are parallel. For point/spot lights, shadows radiate
    from the light position.

HOW TO IDENTIFY SHADOW DIRECTION CHANGE:
    - Cast shadows point in a different direction in Image B
    - Contact shadow at the base of an object shifts position
    - For directional light: all shadows have rotated by the same angle
    - For point light: shadow radiation center has moved

----------------------------------------------------------------
4.3 SHADOW DENSITY
----------------------------------------------------------------
Physical meaning:
    How dark the shadowed regions are. Determined by the absence
    of direct light and the amount of indirect/ambient fill light.

Observable behavior:
    - Dense (dark) shadows: very little ambient fill, high contrast
    - Light shadows: strong ambient or bounce fill, low contrast

HOW TO IDENTIFY DENSITY CHANGE:
    - Shadowed areas are darker or lighter in Image B
    - The contrast between lit and unlit regions has changed
    - If shadows got lighter without the lit side changing
      -> ambient fill increased, not direct light

================================================================
SECTION 5 — LIGHTING SIGNAL QUICK-REFERENCE TABLE
================================================================

Signal observed                             Most likely cause
------------------------------------------------------------------
All shadows parallel, consistent direction  Directional light
Shadows radiate from single center point    Point light
Circular lit region with cutoff boundary    Spot light
Shadow edges very soft, wide penumbra       Large area light or close source
Shadow edges very hard, narrow penumbra     Small source or directional light
Nearby surfaces receive colored local fill  Emissive light contribution
All shadows rotated by same angle           Light direction changed
Shadow fill lighter, lit side unchanged     Ambient fill increased
Lit side brighter, shadows unchanged        Direct light intensity increased
Lit circular region grew on surface         Spot beam widened
Lit circular region shrank on surface       Spot beam narrowed
Lit region shifted position on surface      Spot beam direction changed


================================================================
SECTION 6 — LIGHTING DISAMBIGUATION RULES
================================================================

RULE 1 — LIGHT DIRECTION vs CAMERA MOVEMENT
    Camera movement: viewpoint changes, shadows stay in place
    relative to objects.
    Light direction change: shadows move relative to objects.
    If shadows moved but object position in scene is unchanged
    -> light direction changed.

RULE 2 — LIGHT INTENSITY vs ROUGHNESS
    Intensity change: surface uniformly brighter or darker.
    Roughness change: highlight width and sharpness changes.
    If the whole surface changed brightness uniformly -> intensity.
    If only the highlight spread changed -> roughness.

RULE 3 — LIGHT INTENSITY vs EXPOSURE
    Intensity increase: highlights brighter, shadows stay dark.
    Exposure increase: highlights AND shadows both brighter.
    If both lit and dark regions scaled equally -> exposure.
    If only lit regions changed -> light intensity.

RULE 4 — DIRECT LIGHT vs AMBIENT FILL
    Direct light affects the lit side and hotspot strength.
    Ambient fill affects shadow regions and overall darkness.
    If only shadows lightened -> ambient fill increased.
    If only the lit side changed -> direct light intensity changed.

RULE 5 — SHADOW SOFTNESS vs DEPTH OF FIELD
    Shadow softness: only shadow edges are blurry, surfaces sharp.
    Depth of field: everything blurry including sharp surfaces.
    If only shadow edges changed sharpness -> shadow softness.
    If the whole image changed sharpness -> depth of field.

RULE 6 — CONTACT SHADOW vs CAST SHADOW
    Contact shadow: at the immediate base of the object, always
    the hardest and darkest part.
    Cast shadow: extends from the object outward on surrounding surfaces.
    Evaluate them separately: one can change without the other.

================================================================
END OF LIGHTING REFERENCE DOCUMENT
================================================================

---

## OUTPUT RULES

1. Output exactly one JSON object. No text before it. No text after it.
2. Fill every single field. Do not omit any key. Do not leave any value as an empty string.
3. The "lights" array must contain one object for every independently detectable light source from Image A.
4. For every light in "lights", fill direction, intensity, shadow_behavior, and shadow_direction using only the allowed "status" values shown in the schema. Use "same" when that attribute appears consistent in Image B. Use "indeterminate" only when visual evidence is ambiguous.
5. If you are about to write any character that is not part of the JSON object, stop.
6. If Image B has no extra unmatched light sources, use "extra_lights_in_image_b": [].
7. Keep evidence short, visual, and tied to a visible region.
8. Do not output legacy light difference classes such as light_intensity, light_direction, light_spot_beam, light_area_geometry, light_shadow, light_mix, or light_none.
9. In parameter_effects, keep "parameter" as the technical parameter name and use "operation" for the kind of change applied to that parameter.
10. Allowed operation values by parameter:
    - intensity, environment_intensity, shadow_soft_size, size, sun_angle, spot_size, spot_blend: increase | decrease | change | indeterminate
    - location: move_up | move_down | move_left | move_right | move_forward | move_backward | move | indeterminate
    - rotation, environment_rotation: rotate_x_positive | rotate_x_negative | rotate_y_positive | rotate_y_negative | rotate_z_positive | rotate_z_negative | rotate_positive | rotate_negative | rotate | indeterminate
    - type, environment_color: change | indeterminate
---

Use this exact top-level structure:

{
  "analysis": {
    "general_description": "A concise forensic narrative summarizing the main lighting relationship between Image A and Image B. Describe whether Image B preserves the reference lighting or differs in intensity, direction, optional type, shadow behavior, shadow direction, light count, or a combination of those visible aspects. Keep to 3-5 sentences.",
    "image_b_detected_light_sources": {
      "count": 0,
      "confidence": "low | medium | high",
      "observable_evidence": "Short visual evidence for the number of independently detectable light sources in Image B."
    },
    "environment_lighting": {
      "present_in_image_a": "yes | no | indeterminate",
      "present_in_image_b": "yes | no | indeterminate",
      "overall_status": "same | stronger | weaker | warmer | cooler | rotated | changed | indeterminate",
      "ambient_intensity": {
        "status": "same | stronger | weaker | indeterminate",
        "confidence": "low | medium | high",
        "observable_evidence": "Short visual evidence."
      },
      "ambient_direction": {
        "status": "same | shifted | rotated | indeterminate",
        "confidence": "low | medium | high",
        "observable_evidence": "Short visual evidence."
      },
      "ambient_color": {
        "status": "same | warmer | cooler | changed | indeterminate",
        "confidence": "low | medium | high",
        "observable_evidence": "Short visual evidence."
      },
      "reflection_environment": {
        "status": "same | shifted | rotated | changed | weaker | stronger | indeterminate",
        "confidence": "low | medium | high",
        "observable_evidence": "Short visual evidence."
      },
      "shadow_fill": {
        "status": "same | stronger | weaker | indeterminate",
        "confidence": "low | medium | high",
        "observable_evidence": "Short visual evidence."
      }
    },
    "lights": [
      {
        "light_id": 1,
        "image_a_label": "Light 1",
        "estimated_light_type": "directional | area | spot | point | emissive | environment | unknown",
        "direction": {
          "status": "same | left | right | upward | downward | indeterminate",
          "confidence": "low | medium | high",
          "detected_region": "Short visual evidence."
        },
        "intensity": {
          "status": "same | stronger | weaker | indeterminate",
          "confidence": "low | medium | high",
          "detected_region": "Short visual evidence."
        },
        "shadow_behavior": {
          "status": "same | harder | softer | darker | lighter | missing | extra | indeterminate",
          "confidence": "low | medium | high",
          "observable_evidence": "Short visual evidence."
        },
        "shadow_direction": {
          "status": "same | rotated | shifted | missing | extra | indeterminate",
          "confidence": "low | medium | high",
          "observable_evidence": "Short visual evidence."
        }
      }
    ],
    "parameter_effects": [
      {
        "parameter": "intensity | rotation | location | type | shadow_soft_size | size | spot_size | spot_blend | environment_intensity | environment_rotation | environment_color | unknown",
        "operation": "increase | decrease | move_up | move_down | move_left | move_right | move_forward | move_backward | rotate_x_positive | rotate_x_negative | rotate_y_positive | rotate_y_negative | rotate_z_positive | rotate_z_negative | change | indeterminate",
        "expected_visible_effects": [],
        "observed_visible_effects": [],
        "confidence": "low | medium | high",
        "evidence": "Short visual evidence."
      }
    ],
    "extra_lights_in_image_b": [
      {
        "image_b_label": "Extra Light 1",
        "estimated_light_type": "directional | area | spot | point | emissive | environment | unknown",
        "confidence": "low | medium | high",
        "detected_region": "Short visual evidence or none.",
        "observable_evidence": "Short visual evidence."
      }
    ],
    "summary": {
      "most_reliable_differences": [],
      "consistent_attributes": [],
      "ambiguous_attributes": [],
      "overall_confidence": "HIGH | MEDIUM | LOW"
    }
  },
  "final_assessment": "Short final lighting-only assessment."
}
$light_system$
		WHEN 'material' THEN $material_system$
You are a forensic computer graphics PBR material-analysis expert specialized in physically based rendering, BRDF behavior, and surface response.

You are given:
- **Image A** = reference / ground-truth render
- **Image B** = candidate render

Your task: compare Image B against Image A and identify only directly observable PBR material property differences.

---

This document covers ONLY parameters relevant to the Material
analysis prompt: roughness, metallic/dielectric behavior,
specular, Fresnel/IOR, and BSDF type distinctions.

Do NOT use this document to reason about texture patterns,
UV mapping, lighting direction, or shadow behavior.

================================================================
SECTION 1 — PRINCIPLED BSDF (UNIVERSAL MATERIAL NODE)
================================================================

The Principled BSDF is the master material node in physically
based rendering (Blender, Unreal, Unity, and most PBR pipelines).
Almost all real-world surfaces can be described by combining
its parameters. Every material analysis must start here.

----------------------------------------------------------------
1.1 ROUGHNESS
----------------------------------------------------------------
Physical meaning:
    Specifies the microfacet roughness of the surface for both
    diffuse and specular reflection. Roughness describes how
    microscopically irregular the surface is at a scale smaller
    than the pixel.

Range: 0.0 (perfectly smooth) to 1.0 (fully rough/diffuse)

Observable behavior at roughness = 0.0 (smooth):
    - Mirror-sharp reflections
    - Very narrow, intense specular highlight
    - Clear, undistorted reflection of environment
    - High contrast between lit and unlit areas

Observable behavior at roughness = 1.0 (rough):
    - No visible reflections
    - Wide, soft, low-intensity highlight
    - Diffuse, even appearance across surface
    - Low contrast, matte look

Observable behavior at intermediate roughness (0.3-0.7):
    - Blurred reflections, visible but not sharp
    - Broad highlight with moderate intensity
    - Gradual falloff from highlight center

HOW TO DISTINGUISH ROUGHNESS FROM LIGHTING:
    Roughness affects highlight WIDTH and SHARPNESS.
    Lighting affects highlight POSITION and INTENSITY.
    - If the highlight is in the same position but wider -> roughness increased
    - If the highlight moved but kept the same sharpness -> lighting changed
    - If brightness changed uniformly across the surface -> lighting, not roughness

HOW TO DISTINGUISH ROUGHNESS FROM TEXTURE:
    Roughness is a uniform surface property, not a pattern.
    - A rough surface has uniform matte appearance without visible pattern
    - A texture pattern creates visible color or detail variation
    - Do NOT interpret a missing texture pattern as increased roughness

HOW TO DISTINGUISH ROUGHNESS FROM FRESNEL:
    Roughness controls the SHARPNESS of the specular lobe.
    Fresnel controls WHERE (at which angle) reflectance increases.
    - Two surfaces can share the same roughness but differ in rim width (IOR)
    - Two surfaces can share the same IOR but differ in highlight sharpness (roughness)

----------------------------------------------------------------
1.2 METALLIC
----------------------------------------------------------------
Physical meaning:
    Controls whether the surface behaves as a metal (conductor)
    or a non-metal (dielectric/insulator). In nature this is
    binary: a surface is either metallic or not.

Range: 0.0 (fully dielectric) to 1.0 (fully metallic)

Observable behavior at metallic = 1.0 (conductor):
    - Reflections are TINTED by the surface base color
    - No diffuse component: the surface does not scatter light
    - Very dark at normal incidence, very bright at grazing angles
    - Gold reflects gold-colored highlights
    - Copper reflects copper-tinted highlights
    - Specular color equals the base color of the material

Observable behavior at metallic = 0.0 (dielectric/insulator):
    - Reflections are WHITE or ACHROMATIC regardless of base color
    - Strong diffuse component: light scatters from subsurface
    - Base color visible in diffuse areas
    - Highlight color is white/neutral, not tinted
    - Plastic, ceramic, wood, fabric all behave this way

HOW TO DISTINGUISH METALLIC FROM LIGHTING:
    Lighting changes affect both metals and dielectrics equally.
    - If the highlight color matches the surface base color -> metallic
    - If the highlight is white regardless of surface color -> dielectric
    - Illumination intensity cannot shift a material from metallic to dielectric

HOW TO DISTINGUISH METALLIC FROM ROUGHNESS:
    - A rough metal still shows tinted reflections, just blurred
    - A smooth dielectric shows sharp white/neutral reflections
    - The COLOR of the reflection identifies metallic
    - The SHARPNESS of the reflection identifies roughness

HOW TO DISTINGUISH METALLIC FROM SPECULAR:
    - Metallic surfaces have no diffuse component at all
    - Dielectric surfaces with high specular still show diffuse base color
    - If the surface is completely dark in shadowed regions -> likely metallic/Glossy
    - If the surface shows base color in shadowed regions -> dielectric

----------------------------------------------------------------
1.3 SPECULAR
----------------------------------------------------------------
Physical meaning:
    Controls the intensity of the specular reflection for
    dielectric (non-metallic) surfaces at normal incidence.
    It adjusts the F0 (reflectance at zero degrees) of the
    Fresnel equation for dielectrics only.
    Has no effect on metallic surfaces.

Range: 0.0 (no specular) to 1.0 (full specular, ~8% reflectance)

Observable behavior at specular = 0.0:
    - No visible specular highlight on dielectric surface
    - Pure diffuse, matte appearance even on smooth surfaces
    - Fresnel rim also disappears or is very weak

Observable behavior at specular = 1.0:
    - Strong visible highlight at normal incidence
    - Pronounced Fresnel brightening at grazing angles
    - Typical for water, glass, polished plastic, ceramic

HOW TO DISTINGUISH SPECULAR FROM ROUGHNESS:
    - Specular controls highlight INTENSITY at normal incidence
    - Roughness controls highlight SHARPNESS and WIDTH
    - Low specular + low roughness = dim but narrow highlight
    - High specular + high roughness = bright but very wide and soft highlight

HOW TO DISTINGUISH SPECULAR FROM LIGHTING:
    - Specular value affects highlight visibility independently of light position
    - If highlight disappears when the light does not move -> specular reduced
    - If highlight moves but keeps same intensity -> lighting direction changed

----------------------------------------------------------------
1.4 FRESNEL AND IOR
----------------------------------------------------------------
Physical meaning:
    Fresnel describes the angle-dependent reflectance of any
    surface. At normal incidence reflectance is low. At grazing
    angles reflectance approaches 100% for all materials.
    This is physically universal and automatic in PBR.

    IOR (Index of Refraction) determines the SHAPE of the
    Fresnel curve: how quickly reflectance increases from
    normal to grazing angle.

Common IOR values:
    Water:      1.33
    Glass:      1.45-1.52
    Plastic:    1.46-1.55
    Diamond:    2.42
    Most non-metals: 1.3-1.8

Observable Fresnel behavior (dielectrics):
    - At normal incidence: surface shows base color, low reflectance
    - At grazing angles: bright rim of reflected light appears
    - Higher IOR -> Fresnel rim starts earlier, wider bright rim
    - Lower IOR -> Fresnel rim starts later, narrower rim

Observable behavior for metals:
    - Metals have high reflectance even at normal incidence
    - Fresnel still present but less dramatic
    - Metal reflectance does not drop to near-zero at normal incidence

HOW TO DISTINGUISH FRESNEL FROM LIGHTING:
    Fresnel brightening follows the GEOMETRY of the surface.
    Lighting creates a hotspot that follows the LIGHT POSITION.
    - If bright region is at grazing angles and surface edges -> Fresnel
    - If bright region tracks the light source reflection -> lighting

HOW TO DISTINGUISH IOR FROM ROUGHNESS:
    - IOR affects WHERE the Fresnel falloff starts (angle)
    - Roughness affects HOW SHARP the specular lobe is
    - If rim width changed but highlight sharpness unchanged -> IOR changed
    - If highlight sharpness changed but rim width unchanged -> roughness changed

----------------------------------------------------------------
1.5 BASE COLOR
----------------------------------------------------------------
Physical meaning:
    The albedo of the surface: diffuse color for dielectrics,
    or reflection tint color for metals.

Observable behavior:
    - For dielectrics: visible in diffuse areas away from highlights
    - For metals: visible as the tint of specular reflections
    - Not affected by roughness or specular in its hue

HOW TO DISTINGUISH BASE COLOR FROM LIGHTING:
    - Illumination color shifts affect the whole scene uniformly
    - Base color change affects only the specific surface
    - If only one surface changed color while others are consistent
      -> base color changed, not lighting

----------------------------------------------------------------
1.6 ALPHA / OPACITY
----------------------------------------------------------------
Physical meaning:
    Controls how opaque or transparent the surface is, independent
    of reflection or refraction. Alpha blends the surface with
    whatever is behind it (background or another object) without
    bending that background content.

Range: 0.0 (fully transparent, invisible surface) to 1.0 (fully opaque)

Observable behavior at alpha = 0.0 (transparent):
    - Surface is invisible except for its specular highlight/Fresnel
      rim, if present
    - Background/object behind is fully visible, in its true
      undistorted position
    - No color tint added to what's seen through the surface

Observable behavior at alpha = 1.0 (opaque):
    - Surface fully blocks anything behind it
    - Base color and shading are fully visible
    - No background content bleeds through anywhere on the surface

Observable behavior at intermediate alpha (0.3-0.7):
    - Background is partially visible, blended with the surface's
      own base color and shading
    - Background position is unchanged (no bending), only its
      visibility/blend strength changes

HOW TO DISTINGUISH ALPHA FROM TRANSMISSION:
    - Alpha reveals what's behind WITHOUT bending it: straight
      blend, no refraction.
    - Transmission reveals what's behind WITH IOR-driven bending
      and can also blur/distort based on roughness.
    - If background content lines up exactly where it should be
      without the object -> alpha/opacity changed.
    - If background content is shifted, warped, or displaced from
      its true position -> transmission/IOR changed, not alpha.

HOW TO DISTINGUISH ALPHA FROM LIGHTING:
    - Lighting changes affect brightness of the visible surface and
      background equally; it does not change how much of the
      background bleeds through the object.
    - If the background becomes more/less visible through the
      object specifically, while overall scene brightness is
      unchanged -> alpha changed.

----------------------------------------------------------------
1.7 TRANSMISSION
----------------------------------------------------------------
Physical meaning:
    Controls how much light passes through the material rather
    than bouncing off or being absorbed, driving glass-like,
    liquid-like, or translucent behavior. Works together with IOR
    (which bends the transmitted light) and Roughness (which blurs
    it).

Range: 0.0 (fully opaque, no light passes through) to 1.0 (fully
    transmissive, glass-like)

Observable behavior at transmission = 0.0:
    - Surface behaves like a standard opaque dielectric
    - No background visible through the object
    - Only surface reflection and diffuse base color are visible

Observable behavior at transmission = 1.0:
    - Object becomes glass-like: background is visible through it,
      bent according to IOR
    - Diffuse base-color contribution mostly disappears; base color
      instead tints the transmitted light
    - Fresnel rim still visible at grazing angles

HOW TO DISTINGUISH TRANSMISSION FROM ALPHA:
    - See 1.6 above: transmission bends/displaces what's seen
      through the surface; alpha does not.

HOW TO DISTINGUISH TRANSMISSION FROM ROUGHNESS:
    - Transmission controls HOW MUCH background is visible through
      the object.
    - Roughness (when combined with transmission) controls how
      BLURRED that visible background is (frosted glass).
    - If the background is visible but sharp -> high transmission,
      low roughness.
    - If the background is barely visible or heavily smeared ->
      could be low transmission OR high roughness; check whether
      background is present-but-blurred (roughness) or largely
      absent (transmission reduced).

HOW TO DISTINGUISH TRANSMISSION FROM IOR:
    - Transmission controls the AMOUNT of background visible.
    - IOR controls the POSITION/DISTORTION of that background.
    - Amount of see-through content changed, position of visible
      content is otherwise consistent -> transmission changed.
    - Amount of see-through content is similar, but its position/
      warp changed -> IOR changed.

================================================================
SECTION 2 — GLASS BSDF
================================================================

Physical meaning:
    Simulates a perfect glass material combining transmission
    (light passes through) and Fresnel reflection at the surface.
    Uses a single IOR parameter to control both Fresnel reflectance
    angle and refraction distortion amount.

Key parameters:
    IOR:        Controls Fresnel rim angle AND refraction bend amount
    Roughness:  Blurs both reflection AND transmission (frosted glass)
    Color:      Tints transmitted light (colored glass)

Observable behavior:
    - At normal incidence: see-through, low reflection
    - At grazing angles: strongly reflective rim (Fresnel)
    - Objects seen through glass appear distorted or shifted (refraction)
    - Higher IOR -> more distortion, stronger Fresnel rim
    - Higher roughness -> blurred transmission (frosted), blurred reflection

HOW TO DISTINGUISH GLASS REFRACTION FROM ROUGHNESS:
    - Refraction creates DISPLACEMENT of background objects (position shift)
    - Roughness creates BLUR of background objects (smearing in place)
    - Displacement without blur -> low roughness, significant IOR refraction
    - Blur without displacement -> higher roughness, less distinct refraction

HOW TO DISTINGUISH GLASS FROM LIGHTING:
    - Background visible through glass is a MATERIAL property, not lighting
    - If background content seen through surface changes -> IOR or transmission changed
    - If only highlight brightness changes -> lighting changed

HOW TO DISTINGUISH GLASS FROM METALLIC:
    - Glass transmits light (see-through): metals do not
    - Glass Fresnel rim is achromatic (white): metal reflections are tinted
    - Glass shows background distortion: metals show only surface reflections

================================================================
SECTION 3 — GLOSSY BSDF
================================================================

Physical meaning:
    Simulates purely reflective surfaces with no diffuse or
    transmission component. Used for polished metals, mirrors,
    and highly reflective coatings. All light interaction is
    specular only.

Key parameters:
    Roughness:  Sharpness of reflection (0 = mirror, 1 = dull metal)
    Color:      Tints the reflection (conductor color for metals)

Observable behavior at roughness = 0.0:
    - Perfect mirror: environment reflected with full clarity
    - No diffuse component anywhere on surface
    - Sharp edges in reflected environment

Observable behavior at roughness = 0.5:
    - Blurred reflections: environment recognizable but smeared
    - No diffuse scattering: surface appears very dark in regions
      with no reflection source

Observable behavior at roughness = 1.0:
    - Uniform dull metallic appearance
    - No clear reflection visible
    - Similar to rough diffuse but with tinted (metallic) response

HOW TO DISTINGUISH GLOSSY FROM PRINCIPLED METALLIC:
    - Glossy BSDF has NO diffuse component at any roughness
    - Principled metallic at high roughness still scatters some energy
    - In dark shadow areas: Glossy surfaces appear completely black
    - Principled metallic shows some ambient response in shadow
    - This difference is only visible in shadowed areas

HOW TO DISTINGUISH GLOSSY FROM LIGHTING:
    - Glossy reflections show actual environment content
    - If reflected content changes but sharpness stays same
      -> lighting or camera moved, not roughness change
    - If sharpness changed but content is similar -> roughness changed

HOW TO DISTINGUISH GLOSSY FROM GLASS:
    - Glossy surfaces are opaque: no background visible through them
    - Glass surfaces are transparent: background visible through surface
    - Glossy shows only surface reflection
    - Glass shows both reflection and transmission

================================================================
SECTION 4 — MATERIAL SIGNAL QUICK-REFERENCE TABLE
================================================================

Signal observed                             Most likely parameter
------------------------------------------------------------------
Highlight got wider and softer              Roughness increased
Highlight got narrower and sharper          Roughness decreased
Reflection tint matches surface color       Metallic = 1.0 (conductor)
Reflection is white or achromatic           Metallic = 0.0 (dielectric)
Bright rim at surface edges / grazing       Fresnel response (IOR driven)
Rim width changed, not highlight position   IOR changed
Highlight moved, sharpness unchanged        Lighting direction changed
Highlight disappeared, light unchanged      Specular reduced
Dark shadow areas completely black          Glossy BSDF (no diffuse bounce)
See-through surface with distortion         Glass BSDF / transmission
See-through surface, background undistorted Alpha/opacity reduced
Amount of see-through content changed only  Transmission changed
Position/warp of see-through content changed IOR changed
Diffuse base color visible in shadow        Dielectric (non-metallic)
No base color visible, only reflections     Metallic or Glossy BSDF

---

## OUTPUT RULES

1. Output exactly one JSON object. No text before it. No text after it.
2. Fill every single field. Do not omit any key. Do not leave any value as an empty string.
3. Every parameter in changed_parameters must always be present, even if no change is detected. Use "operation": "none" and "magnitude": "none" for unchanged parameters. If a change is visible but its direction is indeterminate, use "operation": "indeterminate" and "magnitude": "none".
4. Use only operation values from the corresponding operation value list, do not invent any new values.
5. If you are about to write any character that is not part of the JSON object, stop.
6. Include only material/PBR differences. Do not report camera, geometry, texture mapping, lighting, shadow, color grading, composition, or environment differences as material changes.
7. Keep evidence short, visual, and tied to a visible region.

{
  "material_analysis": {
    "general_description": "A concise forensic narrative summarizing what changed between Image A and Image B from a material/PBR perspective only. Describe the nature, operation, and approximate magnitude of detected differences. Mention which attributes are consistent. Keep to 3-5 sentences.",
    "changed_parameters": [
      {
        "parameter": "roughness",
        "operation": "rougher | smoother | none | indeterminate",
        "magnitude": "none | small | medium | high",
        "confidence": "LOW | MEDIUM | HIGH",
        "detected_region": "Image region where roughness evidence is visible.",
        "visual_evidence": "Short description of highlight sharpness, reflection blur, matte/glossy appearance, or other roughness cue."
      },
      {
        "parameter": "metallic",
        "operation": "more_metallic | less_metallic | none | indeterminate",
        "magnitude": "none | small | medium | high",
        "confidence": "LOW | MEDIUM | HIGH",
        "detected_region": "Image region where metallic evidence is visible.",
        "visual_evidence": "Short description of dielectric-to-metallic response, colored reflections, or metal-like reflectance cue."
      },
      {
        "parameter": "specular",
        "operation": "more_reflective | less_reflective | none | indeterminate",
        "magnitude": "none | small | medium | high",
        "confidence": "LOW | MEDIUM | HIGH",
        "detected_region": "Image region where specular evidence is visible.",
        "visual_evidence": "Short description of stronger/weaker specular highlights or reflection intensity."
      },
      {
        "parameter": "ior",
        "operation": "increase | decrease | none | indeterminate",
        "magnitude": "none | small | medium | high",
        "confidence": "LOW | MEDIUM | HIGH",
        "detected_region": "Image region where IOR/refraction evidence is visible.",
        "visual_evidence": "Short description of optical density, Fresnel behavior, refraction, or edge reflection cue."
      },
      {
        "parameter": "opacity",
        "operation": "more_opaque | more_transparent | none | indeterminate",
        "magnitude": "none | small | medium | high",
        "confidence": "LOW | MEDIUM | HIGH",
        "detected_region": "Image region where opacity evidence is visible.",
        "visual_evidence": "Short description of alpha transparency, see-through surfaces, or background visibility cue."
      },
      {
        "parameter": "transmission",
        "operation": "more | less | none | indeterminate",
        "magnitude": "none | small | medium | high",
        "confidence": "LOW | MEDIUM | HIGH",
        "detected_region": "Image region where transmission evidence is visible.",
        "visual_evidence": "Short description of glass-like light passage, transmissive behavior, or refraction-through-material cue."
      }
    ],
    "summary": {
      "most_reliable_differences": "",
      "consistent_attributes": "",
      "ambiguous_attributes": "",
      "overall_confidence": "LOW | MEDIUM | HIGH"
    }
  }
}
$material_system$
		WHEN 'texture' THEN $texture_system$
You are a forensic computer graphics texture and UV mapping analysis expert specialized in physically based rendering pipelines and surface detail reproduction.

You are given:
- **Image A** = reference / ground-truth render
- **Image B** = candidate render

Your task: compare Image B against Image A and identify only directly observable texture, UV mapping, and transmission/refraction differences.

---

This document covers ONLY parameters relevant to the Texture
analysis prompt: texture content, UV mapping, tiling, scale,
rotation, offset, UV distortion, microdetail, normal/displacement
appearance, transmission, and refraction.

Do NOT use this document to reason about roughness, metallic
behavior, specular Fresnel, lighting direction, or shadows.

================================================================
SECTION 1 — TEXTURE CONTENT
================================================================

Physical meaning:
    The actual image data projected onto a surface. This includes
    color patterns, markings, graphics, printed designs, natural
    surface patterns (wood grain, fabric weave, stone veining),
    and any visible surface information that is not driven by
    the PBR material parameters alone.

What counts as texture content:
    - Visible color zones or gradient patterns
    - Logos, labels, printed text, graphics
    - Natural patterns: wood grain, leather grain, fabric weave
    - Dirt, scratches, wear patterns baked into the texture
    - Any repeating or structured visual element on the surface

What does NOT count as texture content:
    - Uniform brightness variation from lighting
    - Specular highlights or reflections
    - Fresnel rim brightening
    - Surface color from base color parameter alone (no pattern)

HOW TO IDENTIFY TEXTURE CONTENT CHANGE:
    - A specific pattern, marking, or color zone present in Image A
      is missing, replaced, or substantially different in Image B
    - The change is localized to a surface region, not uniform
    - The change does not move when the light moves

HOW TO DISTINGUISH TEXTURE CONTENT FROM LIGHTING:
    - Texture content is fixed to the surface UV space
    - Lighting effects move when the light source moves
    - If a dark region on the surface is always in the same UV position
      regardless of lighting -> texture content (dark patch in texture)
    - If a dark region follows the shadow cast by a light -> lighting

HOW TO DISTINGUISH TEXTURE CONTENT FROM ROUGHNESS:
    - Texture content creates visible pattern variation
    - Roughness creates uniform surface appearance without pattern
    - If you see a structured or repeating visual element -> texture
    - If the surface is uniformly matte or glossy with no pattern -> roughness

================================================================
SECTION 2 — UV MAPPING PARAMETERS
================================================================

UV mapping is the process of projecting a 2D texture image onto
a 3D surface. The U axis is horizontal in texture space.
The V axis is vertical in texture space.

Any error in UV mapping causes the texture to appear in the
wrong position, at the wrong scale, at the wrong angle,
or with stretching and distortion.

----------------------------------------------------------------
2.1 TEXTURE SCALE
----------------------------------------------------------------
Physical meaning:
    Determines how large or small the texture appears relative
    to the object surface. Higher scale = pattern appears smaller
    and tiles more frequently. Lower scale = pattern appears
    larger and tiles less frequently.

Observable behavior:
    - At larger scale (more tiling): pattern elements are smaller,
      repetition is more frequent, details are denser
    - At smaller scale (less tiling): pattern elements are larger,
      repetition is less frequent, individual details are bigger

HOW TO IDENTIFY SCALE CHANGE:
    - Pattern elements are visibly larger or smaller in Image B
    - The number of tile repetitions across the surface has changed
    - The change is uniform across the entire surface

HOW TO DISTINGUISH SCALE FROM PERSPECTIVE:
    - Perspective causes pattern elements to converge uniformly
      toward vanishing points across the whole image
    - Scale change makes all pattern elements uniformly larger or
      smaller regardless of their screen position
    - If the pattern is larger only in the foreground and smaller
      in the background following perspective -> perspective, not scale
    - If all pattern elements changed size uniformly -> scale changed

HOW TO DISTINGUISH SCALE FROM UV DISTORTION:
    - Scale change is uniform across the entire surface
    - UV distortion is localized to specific regions of the surface
      especially at high-curvature areas or seam boundaries

----------------------------------------------------------------
2.2 TEXTURE ROTATION
----------------------------------------------------------------
Physical meaning:
    The angle at which the texture is projected onto the surface.
    A rotation changes the orientation of all pattern elements
    simultaneously and uniformly.

Observable behavior:
    - Directional pattern features (stripes, grain, weave) point
      in a different direction
    - The entire pattern has rotated clockwise or counterclockwise
    - The rotation is uniform across the surface

HOW TO IDENTIFY ROTATION CHANGE:
    - A pattern element that was horizontal is now diagonal
    - Wood grain or fabric direction has changed
    - The pattern appears rotated by an estimable angle

HOW TO DISTINGUISH ROTATION FROM UV DISTORTION:
    - Rotation is a uniform angular shift across the whole surface
    - UV distortion is localized stretching or squeezing
    - If the whole pattern rotated uniformly -> rotation
    - If only a local region is distorted -> UV distortion

HOW TO DISTINGUISH ROTATION FROM LIGHTING:
    - Lighting never rotates texture content
    - If a directional pattern element changed angle -> rotation
    - Lighting direction change does not alter pattern orientation

----------------------------------------------------------------
2.3 TEXTURE OFFSET (U AND V AXES)
----------------------------------------------------------------
Physical meaning:
    The position of the texture in UV space. An offset shifts
    the entire texture pattern along the U axis (horizontal)
    or V axis (vertical) in texture space.

Observable behavior:
    - The pattern appears to have slid in one direction
    - Features that were centered on a surface region are now
      off-center or near the edge
    - Tiling seams appear in different positions
    - The shift is uniform across the surface

HOW TO IDENTIFY U OFFSET:
    - Pattern has shifted left or right relative to the object
    - Features that were visible on the left side are now on the right
    - Tiling seams appear shifted horizontally

HOW TO IDENTIFY V OFFSET:
    - Pattern has shifted up or down relative to the object
    - Features that were visible on the top are now on the bottom
    - Tiling seams appear shifted vertically

HOW TO DISTINGUISH OFFSET FROM CAMERA/OBJECT MOVEMENT:
    - Camera movement changes the entire scene composition
    - Texture offset changes only the pattern position on the surface
    - If the object is in the same position but the pattern on it shifted
      -> texture offset changed
    - If the whole object moved in the scene -> camera or object transform

HOW TO DISTINGUISH OFFSET FROM ROTATION:
    - Offset shifts the pattern along a straight axis (left/right or up/down)
    - Rotation changes the angular orientation of the pattern
    - If pattern elements slid without changing angle -> offset
    - If pattern elements changed angle without sliding -> rotation

----------------------------------------------------------------
2.4 UV DISTORTION AND SEAMS
----------------------------------------------------------------
Physical meaning:
    UV distortion occurs when the 2D texture cannot be perfectly
    unfolded onto the 3D surface. This causes pattern elements to
    appear stretched or squeezed in specific regions. Seams are
    the boundaries where UV islands meet and pattern continuity
    can break.

Observable behavior (stretching):
    - Pattern elements appear elongated in one direction
    - Circular pattern elements appear as ellipses
    - Text or logos appear stretched or squeezed
    - Usually localized to high-curvature areas or poles of objects

Observable behavior (seams):
    - Visible line where pattern continuity breaks
    - Pattern does not align across the seam boundary
    - Color or detail discontinuity at a specific edge

HOW TO DISTINGUISH UV DISTORTION FROM PERSPECTIVE:
    - Perspective distortion is predictable and follows vanishing points
    - UV distortion is localized to specific surface patches
    - If stretching is at a curved surface region -> UV distortion
    - If stretching follows the perspective projection uniformly -> perspective

HOW TO DISTINGUISH UV DISTORTION FROM SCALE:
    - Scale changes are uniform: all elements change size equally
    - UV distortion is localized: only some regions are affected
    - If one area is stretched while another is compressed -> UV distortion

================================================================
SECTION 3 — SURFACE MICRODETAIL AND NOISE
================================================================

Physical meaning:
    Fine-scale surface texture detail: grain, noise, micro-bumps,
    fine scratches, and sub-pixel-scale surface variation.
    Microdetail adds perceived surface richness without a
    large-scale repeating pattern.

Observable behavior:
    - Fine grain visible across the surface at close inspection
    - Slight texture variation at the pixel level
    - Not a repeating large-scale pattern: more like natural noise

HOW TO IDENTIFY MICRODETAIL CHANGE:
    - Surface appears smoother (microdetail reduced) or grainier
      (microdetail stronger) in Image B
    - The change is distributed evenly across the surface
    - No single pattern element is identifiable

HOW TO DISTINGUISH MICRODETAIL FROM ROUGHNESS:
    - Microdetail is a texture property: visible as fine surface pattern
    - Roughness is a PBR parameter: affects highlight sharpness
    - A surface can have high roughness with no microdetail texture
    - A surface can have fine microdetail texture with low roughness
    - If you see fine grain pattern -> microdetail texture
    - If you see broad soft highlights -> roughness

HOW TO DISTINGUISH MICRODETAIL FROM LIGHTING NOISE:
    - Microdetail is fixed to the surface UV space
    - Render noise or fireflies move between renders or are random
    - If fine variation is consistent and surface-following -> microdetail
    - If fine variation is random and inconsistent -> render noise

================================================================
SECTION 4 — NORMAL MAP AND DISPLACEMENT
================================================================

Physical meaning:
    Normal maps encode surface bumps and relief detail as a texture.
    They alter the shading normal direction per pixel, creating
    the illusion of surface height variation without changing
    geometry. Displacement maps actually move geometry vertices.

    In texture analysis, normal/displacement is evaluated ONLY
    as a surface content property (is the same relief pattern present?)
    NOT as a lighting property (how does light interact with it).

Observable behavior:
    - Surface shows apparent bumps, ridges, or indentations
    - Fine surface structure follows a pattern encoded in the texture
    - Relief depth appears consistent or inconsistent with Image A

HOW TO IDENTIFY NORMAL MAP CHANGE:
    - Surface relief pattern is different: different bump locations
    - Relief depth appears stronger or weaker in Image B
    - Surface appears flat where it previously showed bumps

HOW TO DISTINGUISH NORMAL MAP FROM ROUGHNESS:
    - Normal map creates directional surface relief with light/shadow
      micro-variation following a pattern
    - Roughness creates uniform surface scatter with no pattern
    - If you see structured bumps or ridges following a design -> normal map
    - If surface scatter is uniform with no pattern -> roughness

HOW TO DISTINGUISH NORMAL MAP FROM LIGHTING:
    - Normal map relief is fixed to the surface and UV space
    - Lighting direction changes how the normal map looks but not
      whether the pattern is present
    - If the pattern of bumps changed location on the surface -> normal map changed
    - If the apparent depth of bumps changed because light angle changed
      -> lighting, not normal map

================================================================
SECTION 5 — TRANSMISSION AND REFRACTION
================================================================

Physical meaning:
    Transmission describes how much light passes through a surface
    carrying color and refraction distortion. This is a material
    property (Glass BSDF, Principled BSDF Transmission input).

    Refraction is the bending of light as it passes through a
    transparent surface. It causes background objects to appear
    displaced or distorted when seen through the surface.

    In texture analysis, evaluate transmission and refraction as
    OBSERVABLE surface appearance properties, not PBR parameters.

Observable transmission behavior:
    - Surface is partially or fully see-through
    - Interior content or background visible through surface
    - Opacity boundary may be sharp (cutout) or soft (dissolve)

Observable refraction behavior:
    - Background objects appear displaced when seen through surface
    - Distortion amount depends on IOR
    - Higher IOR -> more displacement of background elements
    - Roughness on a glass surface -> blurred rather than displaced

HOW TO DISTINGUISH TRANSMISSION FROM LIGHTING:
    - Transmission allows background content to be visible through surface
    - Lighting affects the brightness of the surface itself
    - If you can see objects through the surface -> transmission
    - If only the surface brightness changed -> lighting

HOW TO DISTINGUISH REFRACTION FROM ROUGHNESS BLUR:
    - Refraction displaces background objects: they appear in wrong position
    - Roughness blurs background objects: they appear smeared in place
    - If background edges are shifted sideways -> refraction (IOR)
    - If background edges are blurred but not shifted -> roughness on glass

HOW TO DISTINGUISH TRANSMISSION FROM OPACITY/ALPHA:
    - Transmission: surface is partially visible but still reacts to light
      at its boundary, carries refraction, has Fresnel response
    - Opacity/Alpha: surface region is simply absent (cutout) or
      uniformly faded (dissolve) with hard or soft boundary
    - If you see a sharp cutout edge -> alpha/opacity
    - If you see a surface that is see-through but still has highlights -> transmission

================================================================
SECTION 6 — TEXTURE SIGNAL QUICK-REFERENCE TABLE
================================================================

Signal observed                             Most likely parameter
------------------------------------------------------------------
Pattern elements visibly larger             Texture scale decreased
Pattern elements visibly smaller            Texture scale increased
More tile repetitions across surface        Texture scale increased
Fewer tile repetitions across surface       Texture scale decreased
Pattern direction changed (grain/stripes)   Texture rotation changed
Pattern slid left or right on surface       Texture offset U changed
Pattern slid up or down on surface          Texture offset V changed
Pattern stretched in one region             UV distortion / stretching
Pattern discontinuity at a line             UV seam visible
Fine grain stronger across surface          Microdetail texture stronger
Fine grain weaker or absent                 Microdetail texture weaker
Surface bumps/ridges pattern changed        Normal map changed
Surface appears completely flat             Normal map missing
See-through surface content visible         Transmission present
Background objects shifted through surface  Refraction (IOR)
Background blurred through surface          Roughness on Glass BSDF
Sharp cutout boundary                       Alpha / opacity
Specific graphic or logo missing            Texture content changed

================================================================
SECTION 7 — TEXTURE DISAMBIGUATION RULES
================================================================

RULE 1 — TEXTURE vs LIGHTING
    Never call it a texture change if only brightness changed.
    Texture is fixed to the surface UV space and does not move
    when the light moves. If the pattern content, position,
    scale, or rotation changed -> texture or UV issue.

RULE 2 — SCALE vs PERSPECTIVE
    Perspective causes pattern convergence toward vanishing points.
    Scale changes all pattern elements uniformly regardless of
    screen position. If convergence follows perspective rules
    -> perspective. If all elements changed size uniformly -> scale.

RULE 3 — UV DISTORTION vs PERSPECTIVE
    UV distortion is localized to specific surface patches.
    Perspective is uniform and predictable across the whole image.
    If stretching is at a curved surface region -> UV distortion.
    If stretching follows the perspective projection -> perspective.

RULE 4 — NORMAL MAP vs ROUGHNESS
    Normal map creates structured directional relief following
    a pattern. Roughness creates uniform surface scatter with
    no pattern. Structured bumps or ridges -> normal map.
    Uniform matte or glossy without pattern -> roughness.

RULE 5 — REFRACTION vs ROUGHNESS BLUR
    Refraction displaces background objects (position shift).
    Roughness blurs background objects (smearing in place).
    Displaced edges -> refraction. Smeared edges -> roughness.

RULE 6 — MICRODETAIL vs RENDER NOISE
    Microdetail is consistent and fixed to the surface.
    Render noise is random and varies between renders.
    Consistent fine grain pattern -> microdetail texture.
    Random inconsistent variation -> render noise (not texture).

RULE 7 — OFFSET vs OBJECT MOVEMENT
    Texture offset shifts the pattern on the surface while the
    object stays in the same scene position.
    Object movement changes the object's position in the scene.
    If the object is in the same place but the pattern on it shifted
    -> texture offset changed.

---

## OUTPUT RULES

1. Output exactly one JSON object. No text before it. No text after it.
2. Fill every single field. Do not omit any key. Do not leave any value as an empty string.
3. Every parameter in changed_parameters must always be present, even if no change detected. Use "direction": "none" and "magnitude": "none" for unchanged parameters, and "direction": "indeterminate" when visual evidence is ambiguous.
4. Use only direction values from the corresponding direction value. Do not invent any new values.
5. Set texture_diff_type to "texture_mapping_mix" when more than one texture parameter visibly changed. In that case, list each concrete changed parameter separately inside changed_parameters; do not create a changed_parameters item whose parameter is "texture_mapping_mix".
6. If exactly one texture parameter changed, set texture_diff_type to that parameter name.
7. If no texture parameter changed, set texture_diff_type to "texture_none".
8. If you are about to write any character that is not part of the JSON object, stop.
9. Keep evidence short, visual, and tied to a visible region.

{
  "analysis": {
    "texture_diff_type": "texture_none | texture_scale | texture_rotation | texture_offset_x | texture_offset_y | texture_mapping_mix | texture_uv_distortion | texture_microdetail | texture_normal_displacement | texture_transmission | texture_refraction | texture_content",
    "general_description": "A concise forensic narrative summarizing what changed between Image A and Image B from a texture perspective only. Describe the nature, direction, and approximate magnitude of detected texture differences. Mention which attributes are consistent. Keep to 3-5 sentences.",
    "changed_parameters": [
      {
        "parameter": "texture_scale",
        "direction": "lower | higher | none | indeterminate",
        "magnitude": "none | small | medium | high | indeterminate",
        "confidence": "LOW | MEDIUM | HIGH",
        "detected_region": "Image region where the evidence is visible.",
        "visual_evidence": "Short description of the visual cue supporting this change."
      },
      {
        "parameter": "texture_rotation",
        "direction": "negative | positive | none | indeterminate",
        "magnitude": "none | small | medium | high | indeterminate",
        "confidence": "LOW | MEDIUM | HIGH",
        "detected_region": "Image region where the evidence is visible.",
        "visual_evidence": "Short description of the visual cue supporting this change."
      },
      {
        "parameter": "texture_offset_x",
        "direction": "negative | positive | none | indeterminate",
        "magnitude": "none | small | medium | high | indeterminate",
        "confidence": "LOW | MEDIUM | HIGH",
        "detected_region": "Image region where the evidence is visible.",
        "visual_evidence": "Short description of the visual cue supporting this change."
      },
      {
        "parameter": "texture_offset_y",
        "direction": "negative | positive | none | indeterminate",
        "magnitude": "none | small | medium | high | indeterminate",
        "confidence": "LOW | MEDIUM | HIGH",
        "detected_region": "Image region where the evidence is visible.",
        "visual_evidence": "Short description of the visual cue supporting this change."
      },
      {
        "parameter": "texture_uv_distortion",
        "direction": "lower | higher | none | indeterminate",
        "magnitude": "none | small | medium | high | indeterminate",
        "confidence": "LOW | MEDIUM | HIGH",
        "detected_region": "Image region where the evidence is visible.",
        "visual_evidence": "Short description of the visual cue supporting this change."
      },
      {
        "parameter": "texture_microdetail",
        "direction": "lower | higher | none | indeterminate",
        "magnitude": "none | small | medium | high | indeterminate",
        "confidence": "LOW | MEDIUM | HIGH",
        "detected_region": "Image region where the evidence is visible.",
        "visual_evidence": "Short description of the visual cue supporting this change."
      },
      {
        "parameter": "texture_normal_displacement",
        "direction": "lower | higher | none | indeterminate",
        "magnitude": "none | small | medium | high | indeterminate",
        "confidence": "LOW | MEDIUM | HIGH",
        "detected_region": "Image region where the evidence is visible.",
        "visual_evidence": "Short description of the visual cue supporting this change."
      },
      {
        "parameter": "texture_transmission",
        "direction": "lower | higher | none | indeterminate",
        "magnitude": "none | small | medium | high | indeterminate",
        "confidence": "LOW | MEDIUM | HIGH",
        "detected_region": "Image region where the evidence is visible.",
        "visual_evidence": "Short description of the visual cue supporting this change."
      },
      {
        "parameter": "texture_refraction",
        "direction": "lower | higher | none | indeterminate",
        "magnitude": "none | small | medium | high | indeterminate",
        "confidence": "LOW | MEDIUM | HIGH",
        "detected_region": "Image region where the evidence is visible.",
        "visual_evidence": "Short description of the visual cue supporting this change."
      },
      {
        "parameter": "texture_content",
        "direction": "lower | higher | none | indeterminate",
        "magnitude": "none | small | medium | high | indeterminate",
        "confidence": "LOW | MEDIUM | HIGH",
        "detected_region": "Image region where the evidence is visible.",
        "visual_evidence": "Short description of the visual cue supporting this change."
      }
    ],
    "summary": {
      "most_reliable_differences": [],
      "consistent_attributes": [],
      "ambiguous_attributes": [],
      "overall_confidence": "LOW | MEDIUM | HIGH"
    }
  }
}
$texture_system$
		WHEN 'general' THEN $general_system$
You are a forensic computer-graphics evaluator. Compare Image A, the professor reference, with Image B, the student submission. Independently analyze camera, lighting, material and texture differences. Return all four analyses and only JSON matching the supplied schema.
$general_system$
	END,
	CASE pt."analysis_type"
		WHEN 'camera' THEN $camera_user$
## ABSOLUTE EXCLUSIONS

Analyze only camera and framing. Never report lighting, shadows, materials,
textures, render quality, object changes, geometry changes, or artistic quality.
Perspective differences are not geometry deformation.

## DIRECTION CONTRACT — READ FIRST

Every operation describes the physical camera/lens change that transforms
Image A into Image B. It does NOT describe how to correct Image B back to
Image A, and it does NOT describe the direction in which scene content moves
on the screen.

For a stationary scene, camera motion and apparent image motion are opposite:

- camera looks right -> fixed scene landmarks move left in Image B
- camera looks left -> fixed scene landmarks move right in Image B
- camera trucks right -> fixed scene landmarks move left, with stronger shift
  for nearer landmarks
- camera trucks left -> fixed scene landmarks move right, with stronger shift
  for nearer landmarks
- camera looks up -> the horizon and fixed landmarks move down in Image B
- camera looks down -> the horizon and fixed landmarks move up in Image B
- camera moves up -> fixed landmarks move down, with depth-dependent vertical
  parallax; camera moves down produces the opposite result
- camera moves closer or narrows the FOV -> landmarks expand away from the
  principal point; camera moves farther or widens the FOV -> they contract

Infer the physical A-to-B camera operation first, then emit its label. Never
name an operation from screen-space motion alone.

## PRE-ANALYSIS REGISTRATION

Before classifying anything, compare at least one near landmark and one far
landmark. Track their image positions, scale, overlap, relevant line direction,
and relation to the image center. Ignore differences caused only by non-camera
scene changes.

Use these invariants:

- Translation changes viewpoint and can cause depth-dependent parallax and
  occlusion, but it does not rotate vanishing directions.
- Rotation changes viewing direction and vanishing-point placement, but does
  not create near-versus-far translational parallax.
- FOV changes radial image magnification about the principal point. It does
  not change viewpoint, object overlap, or occlusion.
- The ground-plane horizon depends on orientation and intrinsics, not camera
  height. A moved horizon is evidence for pitch/FOV, not pedestal by itself.

## PARAMETER TESTS

### 1. YAW

Positive evidence:
- horizontal vanishing directions or side-plane angles change
- left/right face proportions change consistently across the scene
- the pattern is explained by a turn in place, without depth-dependent lateral
  parallax

Do not infer yaw from subject recentering, margins, or a uniform lateral shift
alone.

### 2. PITCH

Positive evidence:
- horizon or vertical vanishing-point placement changes
- top-versus-underside visibility changes consistently as expected from a turn
  in place
- line-direction changes occur without depth-dependent vertical parallax

Do not infer pitch from a vertical frame shift alone.

### 3. ROLL

Positive evidence:
- normally vertical/horizontal scene lines acquire a consistent frame-wide
  rotation
- the horizon rotates rather than merely moving vertically

### 4. TRUCK

Positive evidence:
- a named near landmark shifts laterally relative to a named far landmark
- overlap or occlusion changes laterally across depth
- vanishing directions remain consistent with Image A

Do not infer truck from one side becoming exposed, margin change, or subject
recentring alone. Those cues are also produced by yaw or crop.

### 5. DOLLY

Positive evidence:
- near and far landmarks scale by measurably different factors
- overlap or occlusion changes along depth
- nearer landmarks show stronger radial displacement than farther landmarks

Subject size change alone is not dolly evidence.

### 6. PEDESTAL

Positive evidence:
- a named near landmark shifts vertically relative to a named far landmark
- vertical overlap or occlusion changes with depth
- the horizon/vanishing directions stay consistent with Image A

Do not require the horizon to move for pedestal. A horizon shift with no
vertical parallax indicates pitch, not pedestal.

### 7. FOV

Positive evidence:
- multiple landmarks at different depths undergo approximately one common
  radial scale about the same principal point
- visibility relationships and object overlaps remain unchanged
- any vanishing-point movement is radial about the principal point and is
  consistent with the same global scale

Do not use foreground/background scale-ratio change as evidence for FOV; it is
evidence for translation or a mixed move.

## MANDATORY PAIRWISE GATES

### YAW VS TRUCK

1. If vanishing directions or side-plane angles change and near/far lateral
   parallax is absent, choose yaw and set truck to none.
2. If vanishing directions stay fixed and near/far lateral parallax or overlap
   changes, choose truck and set yaw to none.
3. If there is only an overall lateral framing shift, set both to none; the
   cause is not identifiable from the required evidence.
4. Report both only when there is separate, named evidence for both a rotation
   signature and a translation signature.

### PITCH VS PEDESTAL

Apply the same logic vertically: changed horizon/vanishing geometry without
vertical parallax means pitch; depth-dependent vertical parallax with stable
vanishing geometry means pedestal. A simple vertical crop shift proves neither.

### DOLLY VS FOV

1. First test for changed overlap, occlusion, or unequal near/far scale.
   If present, choose dolly and set FOV to none unless a separate global radial
   scale remains after accounting for the dolly.
2. If overlap and occlusion are unchanged and near/far landmarks share one
   radial scale factor, choose FOV and set dolly to none.
3. If the image only shows a single usable depth plane or one isolated object,
   subject-size change cannot distinguish the causes. Set both to none.
4. Report both dolly and FOV only when two independent residual patterns are
   visible: depth-dependent parallax/scale for dolly AND an additional common
   radial scale for FOV. A vague impression of perspective change is not enough.
5. A same-size subject with a changed background is mixed only if the subject
   scale is demonstrably preserved while background scale or occlusion changes.

## EVIDENCE AND CONFIDENCE RULES

- Each non-none parameter needs a named landmark and a parameter-specific cue.
- Do not reuse one generic cue as evidence for two confounded parameters.
- High confidence requires two independent cues. Medium requires one clear cue.
- When evidence is weak or merely compatible with a change, use none.
- Use indeterminate only when a camera change is unmistakable but its direction
  cannot be determined; do not use it for ordinary uncertainty.
- The number of true changes may be zero, one, or several. Do not add a second
  parameter merely because it can also explain the same pixels.

## FINAL SELF-CONSISTENCY PASS

For every non-none output, verify all three conditions:

1. The evidence names a visible landmark or line.
2. The evidence distinguishes this parameter from its confounder.
3. The operation direction is the physical A-to-B camera/lens direction after
   applying the direction contract, not the observed screen-motion direction.

If any condition fails, change that parameter to none. For every none result,
use magnitude none and briefly state which required signature was absent.
$camera_user$
		WHEN 'light' THEN $light_user$
## ABSOLUTE EXCLUSIONS

Do NOT evaluate or comment on any of the following under any circumstances:
- Material quality, roughness, metallicity
- Texture quality
- Geometry quality, topology
- Composition or artistic quality
- Rendering style or shader graphs
- Renderer implementation or post-processing pipeline
- Artistic intent

> **CRITICAL:** Specular highlights, reflections, brightness changes, and color shifts may be used ONLY as lighting evidence. They must NEVER be interpreted as material, texture, or geometry differences.

---

## INVALID EVIDENCE — NEVER USE

Do NOT treat any of the following as lighting evidence:
- Material or albedo assumptions
- Roughness or metallicity assumptions
- Texture assumptions
- Geometry-quality assumptions
- Renderer-setting assumptions
- Post-processing assumptions
- Artistic-style assumptions
- Blur from depth of field, motion blur, denoising, or compression → do NOT interpret as soft shadows unless shadow edge behavior itself supports it
- Material brightness → do NOT interpret as light intensity unless supported by shadow, falloff, gradient, or illumination-response evidence
- Hidden lights, renderer settings, or invisible studio setups → do NOT infer these

---

## VALID EVIDENCE — USE ONLY THESE

- Shadow direction
- Shadow edge sharpness
- Contact-shadow definition
- Penumbra width
- Cast-shadow visibility
- Illumination gradients
- Light-to-shadow contrast
- Local brightness falloff
- Hotspot strength
- Ambient fill level
- Bounce-light visibility
- Global-illumination strength
- Illumination color temperature
- Reflection or highlight placement — only as lighting evidence
- Visible emissive contribution

---

## INTERNAL REASONING — DO NOT OUTPUT

Before writing any output, silently reason through ALL of the following. This reasoning is for your internal use only — do NOT include it in the response. Once you finish reasoning, produce output using ONLY the schema and enum values given in the output-format instructions.

---

### STEP 0 — IDENTIFY AND SEPARATE LIGHT SOURCES

Before evaluating any lighting difference, estimate the minimum plausible number of independently detectable light sources in Image A.

For each detected light source, silently assign a stable internal label:
- Light 1, Light 2, Light 3, etc.

Use only observable evidence to separate one light from another:
- distinct shadow directions
- distinct shadow hardness or penumbra behavior
- separate hotspots or falloff centers
- different illumination colors or color-temperature regions
- separate beam/cutoff regions
- visible emissive contribution from a specific surface

Do not count reflections, bounce light, or indirect illumination as separate lights unless they reveal a visible emissive source. If the evidence could be explained by one light plus indirect illumination, keep the light count lower and mark the uncertainty in the final evidence.

After the count is estimated, reason through Steps 1-5 independently for every detected light source before writing the JSON output. Keep each finding tied to the light source it belongs to.

### STEP 1 — IDENTIFY LIGHT TYPE FOR EACH LIGHT

For each light source identified in Step 0, what type of illumination does Image A appear to use?
- Directional-like (parallel shadows, consistent falloff direction)
- Area-like (soft shadows, broad gradients, shaped highlights)
- Spot-like (visible beam cone, cutoff edge, concentrated hotspot)
- Point-like (radial falloff, compact hotspot, concentric shadow spread)
- Emissive (visible glowing surface contributing to local illumination)

For each light source, does Image B use the same observable type as Image A? If not, which type does it suggest?

Light type is optional evidence in the base check. Report it when visible, but do not overfit ambiguous shadows or gradients to a specific Blender light type.

---

### STEP 2 — EVALUATE LIGHT DIRECTION FOR EACH LIGHT

Based on shadow direction, lit-side/shaded-side relationship, and illumination gradients:
- Where does each light appear to come from in Image A? (left/right/top/front/back)
- Does Image B show the same direction for that same light?
- If different, estimate the shift: subtle / moderate / significant

Do NOT use highlight placement alone — corroborate with shadow or gradient evidence.

---

### STEP 3 — EVALUATE LIGHT INTENSITY FOR EACH LIGHT

Based on illumination gradients, hotspot strength, shadow fill, ambient fill, bounce light:
- Is Image B brighter or darker for that same light contribution?
- Is the hotspot stronger or weaker for that light?
- Is ambient/bounce fill stronger or weaker?
- Is falloff steeper or flatter for that light?

Do NOT confuse material albedo with intensity.

---

### STEP 4 — EVALUATE SHADOW BEHAVIOR FOR EACH LIGHT

Based on shadow edge sharpness, penumbra width, contact shadow, cast shadow, shadow density:
- Are shadows from that light harder or softer in Image B?
- Are shadows from that light darker or lighter?
- Has that light's shadow direction changed?
- Is that light's contact shadow stronger, weaker, or missing?
- Is that light's cast shadow stronger, weaker, or missing?

---

### STEP 5 — CONNECT PARAMETER CHANGES TO VISIBLE EFFECTS

The base lighting check does not classify the whole image using legacy difference classes.
Do not output labels such as light_intensity, light_direction, light_spot_beam, light_area_geometry, light_shadow, light_mix, or light_none.

Instead, report technical parameters only inside "parameter_effects", and describe their visible consequences:
- intensity can affect brightness, hotspot strength, shadow density, and light-to-shadow contrast
- rotation can affect light direction and shadow direction
- location can affect light direction, shadow direction, falloff, and hotspot placement
- type can affect falloff, shadow pattern, beam cutoff, and apparent light type
- shadow_soft_size can affect shadow hardness, penumbra width, and contact-shadow definition
- size can affect area-light softness, highlight footprint, and shadow softness
- spot_size can affect beam width and illuminated area
- spot_blend can affect spotlight edge softness and cutoff falloff
- environment_intensity can affect ambient fill, shadow fill, global brightness, and reflection brightness
- environment_rotation can affect ambient direction, reflected HDRI placement, and environment highlight placement
- environment_color can affect ambient color temperature, shadow-fill tint, and reflection tint

For every parameter_effects item, keep the technical parameter in "parameter" and put the kind of change in "operation":
- intensity-like parameters use increase / decrease
- location uses move_up / move_down / move_left / move_right / move_forward / move_backward
- rotation-like parameters use rotate_x_positive / rotate_x_negative / rotate_y_positive / rotate_y_negative / rotate_z_positive / rotate_z_negative when the axis is clear, otherwise rotate_positive / rotate_negative
- type and environment_color use change

Technical parameters are possible causes. Visible aspects are the evidence. Always tie parameter_effects to visible changes in direction, intensity, shadow behavior, shadow direction, environment lighting, or optional light type.
---

Once Steps 1–5 are complete, classify and report your findings strictly using the schema, field names, and enum values defined in the output-format instructions supplied separately. Do not invent your own field names or enum values here.
$light_user$
		WHEN 'material' THEN $material_user$
## ABSOLUTE EXCLUSIONS

Do NOT evaluate or comment on any of the following under any circumstances:
- Texture patterns, UV mapping, tiling
- Normal maps interpreted as surface detail
- Transmission or refraction appearance
- Lighting direction or intensity
- Shadow placement or density
- Scene composition or camera settings
- Geometry quality or topology
- Artistic intent or rendering style

---

## INVALID EVIDENCE — NEVER USE

- Lighting angle changes → do NOT interpret as roughness change
- Specular brightness driven by light angle alone → do NOT interpret as roughness or metallic change
- Brightness variation caused by illumination → do NOT interpret as metallic mismatch
- Angle-dependent darkening alone → do NOT interpret as Fresnel mismatch without verifying the angular falloff curve
- Texture pattern changes → do NOT interpret as roughness changes
- Hidden shader graphs, renderer settings, or material node trees → do NOT infer these

---

## VALID EVIDENCE — USE ONLY THESE

- Highlight spread width and sharpness (roughness indicator)
- Reflection sharpness and clarity (roughness indicator)
- Surface glossiness vs diffuse appearance (roughness indicator)
- Colored vs achromatic reflections (metallic vs dielectric indicator)
- Conductance behavior — whether reflections carry surface color (metallic indicator)
- Highlight intensity relative to surface base color (specular indicator)
- Fresnel angle-dependent brightness falloff curve (Fresnel/IOR indicator)
- BRDF lobe shape and width as visible from surface highlights (BRDF indicator)
- Opacity or alpha cutout boundary behavior (opacity indicator)
- Transmission blur, caustic pattern, or interior visibility (transmission indicator)

---

## INTERNAL REASONING — DO NOT OUTPUT

Before writing any output, silently reason through ALL of the following. This reasoning is for your internal use only — do NOT include it in the response.

---

### STEP 1 — ROUGHNESS BEHAVIOR

Evaluate surface glossiness vs diffuse appearance:
- Is the highlight spread wide (rough) or narrow (smooth)?
- Is the reflection sharp and mirror-like or blurred and broad?
- Does Image B show the same highlight spread and reflection sharpness as Image A?

> Do NOT interpret texture pattern changes as roughness changes.
> Do NOT interpret light angle changes as roughness changes.

---

### STEP 2 — METALLIC VS DIELECTRIC BEHAVIOR

Evaluate whether reflections are colored (metallic) or achromatic/white (dielectric):
- In Image A, do reflections carry the surface base color? (metallic) Or are they white/grey? (dielectric)
- Does Image B preserve the same conductance behavior?
- Has the tint of reflections or highlights changed?

> Do NOT interpret illumination brightness changes as metallic mismatch.

---

### STEP 3 — SPECULAR AND FRESNEL RESPONSE

Evaluate highlight intensity and angle-dependent brightness:
- How intense is the specular highlight at normal incidence in Image A?
- Is there a visible Fresnel brightening at grazing angles?
- Does Image B show the same highlight intensity and the same angular falloff curve?
- Has the Fresnel rim brightened, darkened, or disappeared?

> Angle-dependent darkening alone is NOT Fresnel mismatch — verify the full angular falloff curve.

---

### STEP 4 — IOR EFFECT ON FRESNEL FALLOFF

Evaluate the IOR-driven Fresnel curve shape:
- Does the transition from dark (normal incidence) to bright (grazing angle) follow the same curve in Image B?
- Is the falloff steeper (higher IOR) or shallower (lower IOR)?
- Is this difference separable from lighting changes?

---

### STEP 5 — BRDF LOBE SHAPE

Evaluate the visible shape and width of the specular lobe:
- Is the highlight elongated, circular, or diffuse in Image A?
- Does Image B show the same lobe shape?
- Has the lobe become broader, narrower, or shifted?


---

### STEP 6 — OPACITY AND ALPHA

If opacity or alpha cutout is visible:
- Are cutout boundaries sharp or soft in Image A?
- Does Image B reproduce the same boundary behavior?
- Is any region fully transparent in A but opaque in B, or vice versa?

---

### STEP 7 — TRANSMISSION AND REFRACTION

If transmission is visible (glass, liquid, translucent materials):
- Is interior visibility, blur level, or caustic pattern consistent between A and B?
- Has transmission IOR changed (distortion amount)?
- Has transmission color or scattering changed?
$material_user$
		WHEN 'texture' THEN $texture_user$
## ABSOLUTE EXCLUSIONS

Do NOT evaluate or comment on any of the following under any circumstances:
- Roughness values or glossiness changes
- Metallic vs dielectric behavior
- Specular Fresnel curves or IOR
- Lighting direction or light intensity
- Shadow placement or density
- HDRI or environment lighting
- Exposure differences
- Camera or geometry changes
- Artistic intent or rendering style

---

## INVALID EVIDENCE — NEVER USE

- Lighting changes alone → do NOT interpret as texture mismatch
- Brightness variation caused by illumination → do NOT interpret as texture change
- Perspective distortion → do NOT interpret as UV distortion
- Compression artifacts, scaling artifacts, or resolution differences → do NOT interpret as texture errors
- Specular highlights or reflections → do NOT interpret as texture pattern changes
- Hidden shader graphs, UV node trees, or renderer settings → do NOT infer these

---

## VALID EVIDENCE — USE ONLY THESE

- Texture pattern content, color, and visible detail (texture consistency)
- Tiling frequency and repetition rhythm (tiling indicator)
- UV stretching — elongated or squeezed pattern elements (UV distortion indicator)
- UV seams — visible discontinuities in pattern continuity (UV seam indicator)
- Texture scale relative to object size (scale indicator)
- Texture rotation — pattern orientation angle (rotation indicator)
- Texture offset — pattern shifted along U or V axis (offset indicator)
- Surface microdetail and noise pattern density (microdetail indicator)
- Transparency level and opacity boundary behavior (transmission indicator)
- Refraction distortion through transparent surfaces (refraction indicator)
- Normal/bump/displacement surface relief appearance — only as surface texture evidence, not lighting evidence

---

## INTERNAL REASONING — DO NOT OUTPUT

Before writing any output, silently reason through ALL of the following. This reasoning is for your internal use only — do NOT include it in the response.

---

### STEP 1 — TEXTURE CONTENT CONSISTENCY

Evaluate whether the same texture pattern and color content appears in both images:
- Are the same visible markings, patterns, graphics, or color zones present in Image B?
- Has any texture region been replaced, removed, or substantially altered?
- Is the overall texture content recognizably the same?

> Do NOT interpret lighting-driven brightness changes as texture color changes.

---

### STEP 2 — TEXTURE SCALE

Evaluate whether the texture appears at the same scale relative to the object surface:
- Do pattern elements appear the same size in Image B as in Image A?
- Has the tiling frequency increased (smaller pattern) or decreased (larger pattern)?
- Is the change uniform across the surface or localized?

> Do NOT interpret perspective foreshortening as scale change.

---

### STEP 3 — TEXTURE ROTATION

Evaluate whether the texture orientation has changed:
- Do pattern elements or directional features point in the same direction in Image B?
- Has the texture been rotated clockwise or counterclockwise?
- Is the rotation uniform across the surface?

---

### STEP 4 — TEXTURE OFFSET (U AND V AXES)

Evaluate whether the texture has been shifted along U or V:
- Has the pattern slid horizontally (U offset) relative to Image A?
- Has the pattern slid vertically (V offset) relative to Image A?
- Is the shift uniform or does it vary across the surface?

> Do NOT interpret object movement or camera change as texture offset.

---

### STEP 5 — UV DISTORTION AND SEAMS

Evaluate UV mapping quality:
- Are pattern elements stretched or squeezed in any region?
- Are there visible seam discontinuities where pattern continuity breaks?
- Does stretching appear in regions of high surface curvature?
- Has distortion increased or decreased compared to Image A?

> Do NOT interpret perspective distortion as UV distortion.

---

### STEP 6 — TILING AND REPETITION

Evaluate tiling behavior:
- Does the pattern repeat at the same frequency?
- Has tiling density increased or decreased?
- Are repetition boundaries more or less visible than in Image A?

---

### STEP 7 — SURFACE MICRODETAIL AND NOISE

Evaluate surface microdetail density and noise patterns:
- Is the same level of fine surface grain, noise, or micro-texture visible?
- Has microdetail become stronger, weaker, or disappeared?
- Is this change uniform or localized?

> Do NOT interpret specular highlight variation as microdetail change.

Estimate: consistent / microdetail_stronger / microdetail_weaker / microdetail_missing / indeterminate.

---

### STEP 8 — NORMAL / BUMP / DISPLACEMENT APPEARANCE

Evaluate surface relief as texture evidence only:
- Does the surface show the same relief bump depth and distribution?
- Has the apparent bump height increased or decreased?
- Are displacement features present in the same locations?

> Evaluate relief only as surface texture evidence. Do NOT evaluate as lighting evidence.

---

### STEP 9 — TRANSMISSION AND REFRACTION

If transmission or refraction is observable:
- Is the transparency level the same?
- Is interior visibility or see-through clarity consistent?
- Has refraction distortion amount changed?
- Are opacity boundaries sharp or soft in the same way?

If not observable, mark as `not_detectable` and skip.

---
$texture_user$
		WHEN 'general' THEN $general_user$
Evaluate the submission across camera, light, material and texture. For each category, explain visible evidence, changed parameters, operation, magnitude and confidence. Do not move an observation into the wrong category.
$general_user$
	END,
	CASE WHEN pt."analysis_type" = 'general' THEN
		'{"type":"object","required":["analyses"],"properties":{"analyses":{"type":"object","required":["camera","light","material","texture"],"properties":{"camera":{"type":"object"},"light":{"type":"object"},"material":{"type":"object"},"texture":{"type":"object"}}}}}'::jsonb
	ELSE
		'{"type":"object","required":["analysis"],"properties":{"analysis":{"type":"object","required":["general_description","changed_parameters","summary"],"properties":{"general_description":{"type":"string"},"changed_parameters":{"type":"array","items":{"type":"object","required":["parameter","operation","magnitude","confidence","observable_evidence","detected_region"]}},"summary":{"type":"object"}}}}}'::jsonb
	END
FROM "prompt_template" pt;

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
	"prompt_addendum" text NOT NULL DEFAULT '',
	"prompt_revision" integer NOT NULL DEFAULT 1,
	"prompt_frozen_at" timestamptz,
	"frozen_prompt_config" jsonb,
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
	CONSTRAINT "course_activity_positive_prompt_revision" CHECK ("prompt_revision" > 0),
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

-- Student usefulness feedback and professor validation of an automated result.
CREATE TABLE "correction_feedback" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"attempt_id" bigint NOT NULL,
	"student_user_id" bigint,
	"is_useful" boolean,
	"student_comment" text,
	"student_submitted_at" timestamptz,
	"reviewed_by_user_id" bigint,
	"verdict" "correction_review_verdict",
	"professor_comment" text,
	"reviewed_at" timestamptz,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "correction_feedback_attempt_fk"
		FOREIGN KEY ("attempt_id") REFERENCES "correction_attempt"("id") ON DELETE CASCADE,
	CONSTRAINT "correction_feedback_student_fk"
		FOREIGN KEY ("student_user_id") REFERENCES "user"("id") ON DELETE SET NULL,
	CONSTRAINT "correction_feedback_reviewer_fk"
		FOREIGN KEY ("reviewed_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL
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

-- Private, durable analysis metadata. Prompt snapshots are never included in
-- student-facing DTOs. A job belongs to either a correction or an exam submission.
CREATE TABLE "analysis_job" (
	"id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	"correction_attempt_id" bigint,
	"exam_submission_id" bigint,
	"provider_job_id" text UNIQUE,
	"prompt_template_revision_id" bigint NOT NULL,
	"activity_prompt_revision" integer NOT NULL,
	"prompt_snapshot" jsonb NOT NULL,
	"prompt_hash" text NOT NULL,
	"model" text NOT NULL,
	"status" "analysis_job_status" NOT NULL DEFAULT 'pending',
	"lease_token" text,
	"lease_expires_at" timestamptz,
	"attempt_count" integer NOT NULL DEFAULT 0,
	"raw_result" jsonb,
	"validated_result" jsonb,
	"error" text,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"started_at" timestamptz,
	"completed_at" timestamptz,
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT "analysis_job_attempt_fk" FOREIGN KEY ("correction_attempt_id") REFERENCES "correction_attempt"("id") ON DELETE CASCADE,
	CONSTRAINT "analysis_job_exam_submission_fk" FOREIGN KEY ("exam_submission_id") REFERENCES "exam_submission"("id") ON DELETE CASCADE,
	CONSTRAINT "analysis_job_prompt_revision_fk" FOREIGN KEY ("prompt_template_revision_id") REFERENCES "prompt_template_revision"("id") ON DELETE RESTRICT,
	CONSTRAINT "analysis_job_one_owner" CHECK (num_nonnulls("correction_attempt_id", "exam_submission_id") = 1),
	CONSTRAINT "analysis_job_positive_attempts" CHECK ("attempt_count" >= 0),
	CONSTRAINT "analysis_job_required_text" CHECK (nullif(trim("prompt_hash"), '') IS NOT NULL AND nullif(trim("model"), '') IS NOT NULL)
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
	IF grader_role <> 'admin' AND NOT (
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
CREATE TRIGGER "prompt_template_set_updated_at" BEFORE UPDATE ON "prompt_template"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_snake_case"();
CREATE TRIGGER "course_activity_set_updated_at" BEFORE UPDATE ON "course_activity"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_snake_case"();
CREATE TRIGGER "correction_session_set_updated_at" BEFORE UPDATE ON "correction_session"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_snake_case"();
CREATE TRIGGER "correction_attempt_set_updated_at" BEFORE UPDATE ON "correction_attempt"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_snake_case"();
CREATE TRIGGER "correction_feedback_set_updated_at" BEFORE UPDATE ON "correction_feedback"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_snake_case"();
CREATE TRIGGER "exam_submission_set_updated_at" BEFORE UPDATE ON "exam_submission"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_snake_case"();
CREATE TRIGGER "exam_result_set_updated_at" BEFORE UPDATE ON "exam_result"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_snake_case"();
CREATE TRIGGER "analysis_job_set_updated_at" BEFORE UPDATE ON "analysis_job"
FOR EACH ROW EXECUTE FUNCTION "set_updated_at_snake_case"();

CREATE INDEX "session_user_idx" ON "session" ("userId");
CREATE INDEX "account_user_idx" ON "account" ("userId");
CREATE INDEX "course_creator_idx" ON "course" ("created_by_user_id");
CREATE INDEX "course_availability_idx" ON "course" ("is_active", "starts_at", "ends_at");
CREATE INDEX "course_member_user_idx" ON "course_member" ("user_id", "status");
CREATE INDEX "course_invitation_email_idx" ON "course_invitation" (lower("email"));
CREATE INDEX "prompt_template_course_idx" ON "prompt_template" ("course_id");
CREATE INDEX "prompt_template_revision_template_idx" ON "prompt_template_revision" ("template_id", "version");
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
CREATE UNIQUE INDEX "correction_feedback_attempt_uidx" ON "correction_feedback" ("attempt_id");
CREATE INDEX "correction_feedback_student_idx" ON "correction_feedback" ("student_user_id");
CREATE INDEX "correction_feedback_verdict_idx" ON "correction_feedback" ("verdict");
CREATE INDEX "exam_submission_activity_idx" ON "exam_submission" ("activity_id");
CREATE INDEX "exam_submission_file_submission_idx" ON "exam_submission_file" ("submission_id", "uploaded_at");
CREATE UNIQUE INDEX "exam_submission_file_current_view_uidx" ON "exam_submission_file" ("submission_id", "reference_image_id") WHERE "is_current";
CREATE INDEX "exam_result_student_idx" ON "exam_result" ("student_user_id", "status");
CREATE INDEX "analysis_job_status_idx" ON "analysis_job" ("status", "created_at");
CREATE INDEX "analysis_job_attempt_idx" ON "analysis_job" ("correction_attempt_id");

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

COMMENT ON COLUMN "course"."created_by_user_id" IS
	'Historical creator. Current management permission comes from course_member role PROFESSOR.';
COMMENT ON COLUMN "correction_session"."student_user_id" IS
	'Sensitive: never expose it to professors when is_anonymous is true.';
COMMENT ON COLUMN "correction_attempt"."score" IS
	'Indicative assistant score, separate from the official exam result.';

COMMIT;
-- Support requests submitted from the authenticated portal.
CREATE TYPE "public"."support_ticket_category" AS ENUM('EXAM_DELIVERY', 'CORRECTION', 'ACCOUNT', 'WEBSITE');
CREATE TYPE "public"."support_ticket_status" AS ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED');

CREATE TABLE "support_ticket" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"reporter_user_id" bigint NOT NULL,
	"category" "support_ticket_category" NOT NULL,
	"status" "support_ticket_status" DEFAULT 'OPEN' NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"page_url" text,
	"admin_note" text,
	"resolved_by_user_id" bigint,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_ticket_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE cascade,
	CONSTRAINT "support_ticket_resolved_by_user_id_user_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null
);

CREATE INDEX "support_ticket_reporter_idx" ON "support_ticket" USING btree ("reporter_user_id", "created_at");
CREATE INDEX "support_ticket_status_idx" ON "support_ticket" USING btree ("status", "created_at");
