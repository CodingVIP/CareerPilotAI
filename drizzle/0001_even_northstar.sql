ALTER TABLE "applications" DROP CONSTRAINT "applications_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "applications" DROP CONSTRAINT "applications_linked_profile_id_profiles_id_fk";--> statement-breakpoint
ALTER TABLE "applications" DROP CONSTRAINT "applications_linked_resume_version_id_resume_versions_id_fk";--> statement-breakpoint
ALTER TABLE "ats_results" DROP CONSTRAINT "ats_results_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "ats_results" DROP CONSTRAINT "ats_results_application_id_applications_id_fk";--> statement-breakpoint
ALTER TABLE "ats_results" DROP CONSTRAINT "ats_results_resume_version_id_resume_versions_id_fk";--> statement-breakpoint
ALTER TABLE "interview_dossiers" DROP CONSTRAINT "interview_dossiers_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "interview_dossiers" DROP CONSTRAINT "interview_dossiers_application_id_applications_id_fk";--> statement-breakpoint
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "resume_versions" DROP CONSTRAINT "resume_versions_profile_id_profiles_id_fk";--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "linked_profile_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "linked_resume_version_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ats_results" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ats_results" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "ats_results" ALTER COLUMN "application_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ats_results" ALTER COLUMN "resume_version_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "interview_dossiers" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "interview_dossiers" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "interview_dossiers" ALTER COLUMN "application_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "resume_versions" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "resume_versions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "resume_versions" ALTER COLUMN "profile_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_linked_profile_id_profiles_id_fk" FOREIGN KEY ("linked_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_linked_resume_version_id_resume_versions_id_fk" FOREIGN KEY ("linked_resume_version_id") REFERENCES "public"."resume_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ats_results" ADD CONSTRAINT "ats_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ats_results" ADD CONSTRAINT "ats_results_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ats_results" ADD CONSTRAINT "ats_results_resume_version_id_resume_versions_id_fk" FOREIGN KEY ("resume_version_id") REFERENCES "public"."resume_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_dossiers" ADD CONSTRAINT "interview_dossiers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_dossiers" ADD CONSTRAINT "interview_dossiers_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;