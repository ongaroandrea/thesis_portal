CREATE TYPE "public"."support_ticket_category" AS ENUM('EXAM_DELIVERY', 'CORRECTION', 'ACCOUNT', 'WEBSITE');
CREATE TYPE "public"."support_ticket_status" AS ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED');

CREATE TABLE "support_ticket" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"reporter_user_id" bigint NOT NULL REFERENCES "public"."user"("id") ON DELETE cascade,
	"category" "support_ticket_category" NOT NULL,
	"status" "support_ticket_status" DEFAULT 'OPEN' NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"page_url" text,
	"admin_note" text,
	"resolved_by_user_id" bigint REFERENCES "public"."user"("id") ON DELETE set null,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "support_ticket_reporter_idx" ON "support_ticket" ("reporter_user_id", "created_at");
CREATE INDEX "support_ticket_status_idx" ON "support_ticket" ("status", "created_at");
