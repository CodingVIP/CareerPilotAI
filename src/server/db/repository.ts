import { eq } from 'drizzle-orm';
import { database } from './client';
import {
  applications,
  atsResults,
  interviewDossiers,
  privacySettings,
  profiles,
  resumeVersions,
  users,
} from './schema';

export interface SyncSnapshot {
  applications: unknown[];
  profiles: unknown[];
  privacy: unknown;
  atsResults: unknown[];
  interviewDossiers: unknown[];
}

function requireDatabase() {
  if (!database) {
    throw new Error('DATABASE_URL is not configured.');
  }
  return database;
}

export async function getUserSnapshot(userId: string): Promise<SyncSnapshot> {
  const db = requireDatabase();
  const [userApplications, userProfiles, userPrivacy, userAtsResults, userInterviewDossiers] =
    await Promise.all([
      db.select().from(applications).where(eq(applications.userId, userId)),
      db
        .select({
          profile: profiles,
          resume: resumeVersions,
        })
        .from(profiles)
        .leftJoin(resumeVersions, eq(resumeVersions.profileId, profiles.id))
        .where(eq(profiles.userId, userId)),
      db.select().from(privacySettings).where(eq(privacySettings.userId, userId)),
      db.select().from(atsResults).where(eq(atsResults.userId, userId)),
      db.select().from(interviewDossiers).where(eq(interviewDossiers.userId, userId)),
    ]);

  const profileMap = new Map<string, Record<string, unknown>>();
  for (const row of userProfiles) {
    const profile = profileMap.get(row.profile.id) || {
      id: row.profile.id,
      userId: row.profile.userId,
      name: row.profile.name,
      targetRole: row.profile.targetRole,
      summary: row.profile.summary,
      skills: row.profile.skills,
      createdAt: row.profile.createdAt,
      updatedAt: row.profile.updatedAt,
      resumeVersions: [],
    };
    if (row.resume) {
      (profile.resumeVersions as unknown[]).push({
        ...row.resume,
        profileId: undefined,
      });
    }
    profileMap.set(row.profile.id, profile);
  }

  return {
    applications: userApplications,
    profiles: Array.from(profileMap.values()),
    privacy: userPrivacy[0] || null,
    atsResults: userAtsResults,
    interviewDossiers: userInterviewDossiers,
  };
}

export async function ensureUser(userId: string): Promise<void> {
  const db = requireDatabase();
  await db.insert(users).values({ id: userId }).onConflictDoNothing();
}
