

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."add_board_creator_as_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Add the board creator as an owner in board_members
    INSERT INTO board_members (board_id, user_id, role, permissions, joined_at)
    VALUES (
        NEW.id,
        NEW.created_by,
        'owner',
        '{"read": true, "write": true, "delete": true, "invite": true}'::jsonb,
        NEW.created_at
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."add_board_creator_as_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_ad_view_count"("ad_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    UPDATE advertisement_analytics
    SET
        view_count = view_count + 1,
        last_viewed_at = NOW(),
        updated_at = NOW()
    WHERE advertisement_id = ad_id;
END;
$$;


ALTER FUNCTION "public"."increment_ad_view_count"("ad_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_board_summaries"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY board_summaries;
END;
$$;


ALTER FUNCTION "public"."refresh_board_summaries"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_collaborator_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.last_active = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_collaborator_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."advertisement_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "advertisement_id" "uuid" NOT NULL,
    "board_id" "text" NOT NULL,
    "view_count" integer DEFAULT 0,
    "last_viewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "audience_estimate" integer
);


ALTER TABLE "public"."advertisement_analytics" OWNER TO "postgres";


COMMENT ON COLUMN "public"."advertisement_analytics"."audience_estimate" IS 'AI-estimated audience count (populated by AI features)';



CREATE TABLE IF NOT EXISTS "public"."advertisement_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "board_id" "text" NOT NULL,
    "time_between_ads" integer DEFAULT 60 NOT NULL,
    "initial_delay" integer DEFAULT 5 NOT NULL,
    "ad_display_duration" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "enable_ai" boolean DEFAULT false,
    "person_threshold" integer DEFAULT 1,
    "detection_duration" integer DEFAULT 0,
    CONSTRAINT "advertisement_settings_ad_display_duration_check" CHECK ((("ad_display_duration" IS NULL) OR (("ad_display_duration" >= 1000) AND ("ad_display_duration" <= 60000)))),
    CONSTRAINT "advertisement_settings_initial_delay_check" CHECK ((("initial_delay" >= 1) AND ("initial_delay" <= 60))),
    CONSTRAINT "advertisement_settings_person_threshold_check" CHECK ((("person_threshold" > 0) AND ("person_threshold" <= 50))),
    CONSTRAINT "advertisement_settings_time_between_ads_check" CHECK ((("time_between_ads" >= 5) AND ("time_between_ads" <= 600)))
);


ALTER TABLE "public"."advertisement_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."advertisement_settings" IS 'Stores advertisement display timing and configuration settings per board';



COMMENT ON COLUMN "public"."advertisement_settings"."board_id" IS 'Reference to the board these settings apply to (TEXT to match boards.id)';



COMMENT ON COLUMN "public"."advertisement_settings"."time_between_ads" IS 'Time in seconds to show main content between advertisements (5-600 seconds)';



COMMENT ON COLUMN "public"."advertisement_settings"."initial_delay" IS 'Time in seconds to wait before starting advertisement cycle (1-60 seconds)';



COMMENT ON COLUMN "public"."advertisement_settings"."ad_display_duration" IS 'Optional: Fixed duration in milliseconds for image advertisements (1000-60000ms). NULL for auto-duration.';



COMMENT ON COLUMN "public"."advertisement_settings"."created_at" IS 'Timestamp when settings were first created';



COMMENT ON COLUMN "public"."advertisement_settings"."updated_at" IS 'Timestamp when settings were last modified';



COMMENT ON COLUMN "public"."advertisement_settings"."enable_ai" IS 'Enable AI person detection to trigger advertisements';



COMMENT ON COLUMN "public"."advertisement_settings"."person_threshold" IS 'Number of people detected by AI required to trigger advertisement (1-50)';



CREATE TABLE IF NOT EXISTS "public"."advertisements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "board_id" "text" NOT NULL,
    "created_by" "text" NOT NULL,
    "title" "text" NOT NULL,
    "media_url" "text" NOT NULL,
    "media_type" "text" NOT NULL,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "display_duration" integer,
    CONSTRAINT "advertisements_media_type_check" CHECK (("media_type" = ANY (ARRAY['image'::"text", 'video'::"text"])))
);


ALTER TABLE "public"."advertisements" OWNER TO "postgres";


COMMENT ON COLUMN "public"."advertisements"."display_duration" IS 'Display duration in milliseconds for image advertisements only. NULL for videos (use natural duration). Default 10000ms (10s) for images.';



CREATE TABLE IF NOT EXISTS "public"."board_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "board_id" "text" NOT NULL,
    "invited_by" "text" NOT NULL,
    "role" "text" DEFAULT 'viewer'::"text" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "max_uses" integer,
    "used_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "board_invitations_role_check" CHECK (("role" = ANY (ARRAY['editor'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."board_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."board_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "board_id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "role" "text" DEFAULT 'viewer'::"text" NOT NULL,
    "invited_by" "text",
    "permissions" "jsonb" DEFAULT '{"read": true, "write": false, "delete": false, "invite": false}'::"jsonb",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "board_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'editor'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."board_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."boards" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_by" "text" NOT NULL,
    "configuration" "jsonb" DEFAULT '{"items": [], "widgets": [], "canvasSize": {"width": 1920, "height": 1080}, "backgroundColor": "#ffffff", "backgroundImage": null}'::"jsonb",
    "allow_public_invites" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."boards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "text" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "username" "text",
    "avatar_url" "text",
    "provider" "text" DEFAULT 'email'::"text",
    "password_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."boards"
    ADD CONSTRAINT "boards_pkey" PRIMARY KEY ("id");



CREATE MATERIALIZED VIEW "public"."board_summaries" AS
 SELECT "b"."id",
    "b"."name",
    "b"."description",
    "b"."created_by",
    "b"."created_at",
    "b"."updated_at",
    "count"(DISTINCT "bm"."user_id") AS "member_count",
    "jsonb_array_length"(COALESCE(("b"."configuration" -> 'items'::"text"), '[]'::"jsonb")) AS "item_count"
   FROM ("public"."boards" "b"
     LEFT JOIN "public"."board_members" "bm" ON (("b"."id" = "bm"."board_id")))
  GROUP BY "b"."id", "b"."name", "b"."description", "b"."created_by", "b"."created_at", "b"."updated_at"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."board_summaries" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."board_summaries" IS 'Performance: Cached board statistics for dashboard';



ALTER TABLE ONLY "public"."advertisement_analytics"
    ADD CONSTRAINT "advertisement_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertisement_settings"
    ADD CONSTRAINT "advertisement_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertisements"
    ADD CONSTRAINT "advertisements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."board_invitations"
    ADD CONSTRAINT "board_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."board_invitations"
    ADD CONSTRAINT "board_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."board_members"
    ADD CONSTRAINT "board_members_board_id_user_id_key" UNIQUE ("board_id", "user_id");



ALTER TABLE ONLY "public"."board_members"
    ADD CONSTRAINT "board_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advertisement_settings"
    ADD CONSTRAINT "unique_board_settings" UNIQUE ("board_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_advertisement_settings_board_id" ON "public"."advertisement_settings" USING "btree" ("board_id");



CREATE INDEX "idx_advertisement_settings_updated_at" ON "public"."advertisement_settings" USING "btree" ("updated_at");



CREATE INDEX "idx_advertisements_active" ON "public"."advertisements" USING "btree" ("is_active");



CREATE INDEX "idx_advertisements_board_id" ON "public"."advertisements" USING "btree" ("board_id");



CREATE INDEX "idx_advertisements_created_by" ON "public"."advertisements" USING "btree" ("created_by");



CREATE INDEX "idx_advertisements_dates" ON "public"."advertisements" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_advertisements_media_type_duration" ON "public"."advertisements" USING "btree" ("media_type", "display_duration");



CREATE INDEX "idx_analytics_advertisement_id" ON "public"."advertisement_analytics" USING "btree" ("advertisement_id");



CREATE INDEX "idx_analytics_board_id" ON "public"."advertisement_analytics" USING "btree" ("board_id");



CREATE INDEX "idx_board_invitations_board_active" ON "public"."board_invitations" USING "btree" ("board_id", "is_active");



CREATE INDEX "idx_board_invitations_board_id" ON "public"."board_invitations" USING "btree" ("board_id");



CREATE INDEX "idx_board_invitations_expires" ON "public"."board_invitations" USING "btree" ("expires_at") WHERE ("is_active" = true);



CREATE INDEX "idx_board_invitations_expires_at" ON "public"."board_invitations" USING "btree" ("expires_at");



CREATE INDEX "idx_board_invitations_is_active" ON "public"."board_invitations" USING "btree" ("is_active");



CREATE INDEX "idx_board_invitations_token" ON "public"."board_invitations" USING "btree" ("token");



CREATE INDEX "idx_board_members_board_id" ON "public"."board_members" USING "btree" ("board_id");



CREATE INDEX "idx_board_members_board_role" ON "public"."board_members" USING "btree" ("board_id", "role");



COMMENT ON INDEX "public"."idx_board_members_board_role" IS 'Performance: Fast owner/editor lookups';



CREATE INDEX "idx_board_members_board_user" ON "public"."board_members" USING "btree" ("board_id", "user_id");



CREATE INDEX "idx_board_members_role" ON "public"."board_members" USING "btree" ("role");



CREATE INDEX "idx_board_members_user_board" ON "public"."board_members" USING "btree" ("user_id", "board_id");



COMMENT ON INDEX "public"."idx_board_members_user_board" IS 'Performance: Fast user-board membership lookups';



CREATE INDEX "idx_board_members_user_id" ON "public"."board_members" USING "btree" ("user_id");



CREATE INDEX "idx_board_summaries_created_by" ON "public"."board_summaries" USING "btree" ("created_by");



CREATE UNIQUE INDEX "idx_board_summaries_id" ON "public"."board_summaries" USING "btree" ("id");



CREATE INDEX "idx_boards_configuration_gin" ON "public"."boards" USING "gin" ("configuration");



COMMENT ON INDEX "public"."idx_boards_configuration_gin" IS 'Performance: Fast JSONB queries on configuration';



CREATE INDEX "idx_boards_created_at" ON "public"."boards" USING "btree" ("created_at");



CREATE INDEX "idx_boards_created_by" ON "public"."boards" USING "btree" ("created_by");



COMMENT ON INDEX "public"."idx_boards_created_by" IS 'Performance: Fast board ownership lookups';



CREATE INDEX "idx_boards_created_by_updated" ON "public"."boards" USING "btree" ("created_by", "updated_at" DESC);



COMMENT ON INDEX "public"."idx_boards_created_by_updated" IS 'Performance: Composite index for filtered + sorted queries';



CREATE INDEX "idx_boards_updated_at" ON "public"."boards" USING "btree" ("updated_at");



COMMENT ON INDEX "public"."idx_boards_updated_at" IS 'Performance: Fast sorting by last modified';



CREATE INDEX "idx_users_created_at" ON "public"."users" USING "btree" ("created_at");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_provider" ON "public"."users" USING "btree" ("provider");



CREATE OR REPLACE TRIGGER "trigger_add_board_creator_as_owner" AFTER INSERT ON "public"."boards" FOR EACH ROW EXECUTE FUNCTION "public"."add_board_creator_as_owner"();



CREATE OR REPLACE TRIGGER "trigger_advertisements_updated_at" BEFORE UPDATE ON "public"."advertisements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_analytics_updated_at" BEFORE UPDATE ON "public"."advertisement_analytics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_advertisement_settings_updated_at" BEFORE UPDATE ON "public"."advertisement_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_board_invitations_updated_at" BEFORE UPDATE ON "public"."board_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_board_members_updated_at" BEFORE UPDATE ON "public"."board_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_boards_updated_at" BEFORE UPDATE ON "public"."boards" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."board_invitations"
    ADD CONSTRAINT "board_invitations_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."board_invitations"
    ADD CONSTRAINT "board_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."board_members"
    ADD CONSTRAINT "board_members_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."board_members"
    ADD CONSTRAINT "board_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."board_members"
    ADD CONSTRAINT "board_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."boards"
    ADD CONSTRAINT "boards_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."advertisement_settings"
    ADD CONSTRAINT "fk_advertisement_settings_board_id" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."advertisements"
    ADD CONSTRAINT "fk_advertisements_board" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."advertisements"
    ADD CONSTRAINT "fk_advertisements_user" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."advertisement_analytics"
    ADD CONSTRAINT "fk_analytics_advertisement" FOREIGN KEY ("advertisement_id") REFERENCES "public"."advertisements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."advertisement_analytics"
    ADD CONSTRAINT "fk_analytics_board" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



CREATE POLICY "Public can insert analytics records" ON "public"."advertisement_analytics" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public can read active advertisements" ON "public"."advertisements" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can read analytics records" ON "public"."advertisement_analytics" FOR SELECT USING (true);



CREATE POLICY "Public can read boards for display mode" ON "public"."boards" FOR SELECT USING (true);



CREATE POLICY "Public can update analytics records" ON "public"."advertisement_analytics" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to advertisements" ON "public"."advertisements" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to analytics" ON "public"."advertisement_analytics" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to board_invitations" ON "public"."board_invitations" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to board_members" ON "public"."board_members" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to boards" ON "public"."boards" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to users" ON "public"."users" USING (true) WITH CHECK (true);



ALTER TABLE "public"."advertisement_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."advertisement_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."advertisements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."board_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."board_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."boards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."add_board_creator_as_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_board_creator_as_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_board_creator_as_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_ad_view_count"("ad_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_ad_view_count"("ad_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_ad_view_count"("ad_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_board_summaries"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_board_summaries"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_board_summaries"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_collaborator_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_collaborator_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_collaborator_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."advertisement_analytics" TO "anon";
GRANT ALL ON TABLE "public"."advertisement_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisement_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."advertisement_settings" TO "anon";
GRANT ALL ON TABLE "public"."advertisement_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisement_settings" TO "service_role";



GRANT ALL ON TABLE "public"."advertisements" TO "anon";
GRANT ALL ON TABLE "public"."advertisements" TO "authenticated";
GRANT ALL ON TABLE "public"."advertisements" TO "service_role";



GRANT ALL ON TABLE "public"."board_invitations" TO "anon";
GRANT ALL ON TABLE "public"."board_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."board_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."board_members" TO "anon";
GRANT ALL ON TABLE "public"."board_members" TO "authenticated";
GRANT ALL ON TABLE "public"."board_members" TO "service_role";



GRANT ALL ON TABLE "public"."boards" TO "anon";
GRANT ALL ON TABLE "public"."boards" TO "authenticated";
GRANT ALL ON TABLE "public"."boards" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."board_summaries" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."board_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."board_summaries" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
