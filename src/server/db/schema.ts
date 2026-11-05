import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email'),
  ...timestamps,
});

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  targetRole: text('target_role').notNull().default(''),
  summary: text('summary').notNull().default(''),
  skills: jsonb('skills').$type<string[]>().notNull().default([]),
  ...timestamps,
});

export const resumeVersions = pgTable('resume_versions', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  versionName: text('version_name').notNull(),
  content: text('content').notNull(),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  isDefault: boolean('is_default').notNull().default(false),
  filePath: text('file_path'),
  fileType: text('file_type'),
  fileSize: integer('file_size'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
  ...timestamps,
});

export const applications = pgTable('applications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  linkedProfileId: text('linked_profile_id').references(() => profiles.id, { onDelete: 'set null' }),
  linkedResumeVersionId: text('linked_resume_version_id').references(() => resumeVersions.id, {
    onDelete: 'set null',
  }),
  company: text('company').notNull(),
  role: text('role').notNull(),
  url: text('url').notNull().default(''),
  status: text('status').notNull(),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  salaryCurrency: text('salary_currency').notNull().default('USD'),
  location: text('location').notNull().default(''),
  jobType: text('job_type').notNull(),
  requirements: jsonb('requirements').$type<string[]>().notNull().default([]),
  description: text('description').notNull().default(''),
  rawDescription: text('raw_description'),
  appliedDate: text('applied_date'),
  notes: text('notes').notNull().default(''),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  ...timestamps,
});

export const atsResults = pgTable('ats_results', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  applicationId: text('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  resumeVersionId: text('resume_version_id').notNull().references(() => resumeVersions.id, { onDelete: 'cascade' }),
  contentHash: text('content_hash').notNull(),
  result: jsonb('result').notNull(),
  ...timestamps,
});

export const interviewDossiers = pgTable('interview_dossiers', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  applicationId: text('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  contentHash: text('content_hash').notNull(),
  dossier: jsonb('dossier').notNull(),
  masteredQuestionIds: jsonb('mastered_question_ids').$type<Record<string, boolean>>().notNull().default({}),
  ...timestamps,
});

export const privacySettings = pgTable('privacy_settings', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  cloudSyncEnabled: boolean('cloud_sync_enabled').notNull().default(false),
  encryptLocalData: boolean('encrypt_local_data').notNull().default(false),
  telemetryDisabled: boolean('telemetry_disabled').notNull().default(true),
  ...timestamps,
});
