import { and, eq } from 'drizzle-orm';
import { database } from './client';
import {
  applications,
  atsResults,
  interviewDossiers,
  privacySettings,
  profiles,
  resumeVersions,
  users,
  syncOperations,
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

export async function getOwnedResumeVersion(userId: string, resumeId: string) {
  const db = requireDatabase();
  const rows = await db
    .select({ resume: resumeVersions })
    .from(resumeVersions)
    .innerJoin(profiles, eq(resumeVersions.profileId, profiles.id))
    .where(and(eq(resumeVersions.id, resumeId), eq(profiles.userId, userId)));
  return rows[0]?.resume || null;
}

export async function updateResumeFile(
  userId: string,
  resumeId: string,
  file: { filePath: string; fileType: string; fileSize: number },
): Promise<boolean> {
  const db = requireDatabase();
  const owned = await getOwnedResumeVersion(userId, resumeId);
  if (!owned) return false;
  const result = await db
    .update(resumeVersions)
    .set({ ...file, uploadedAt: new Date(), updatedAt: new Date() })
    .where(eq(resumeVersions.id, resumeId));
  return result.count > 0;
}

export interface SyncOperationInput {
  id: string;
  entityType: 'application' | 'profile' | 'privacy';
  entityId: string;
  operation: 'upsert' | 'delete';
  baseUpdatedAt?: string;
  payload: Record<string, unknown>;
}

export async function applySyncOperation(userId: string, input: SyncOperationInput): Promise<'applied' | 'duplicate' | 'conflict'> {
  const db = requireDatabase();
  const existing = await db
    .select({ id: syncOperations.id })
    .from(syncOperations)
    .where(and(eq(syncOperations.id, input.id), eq(syncOperations.userId, userId)));
  if (existing.length) return 'duplicate';

  if (input.entityType === 'application') {
    const values = {
      id: input.entityId,
      userId,
      ...(input.payload as Record<string, unknown>),
      updatedAt: new Date(),
    } as typeof applications.$inferInsert;
    if (input.operation === 'delete') {
      await db.delete(applications).where(and(eq(applications.id, input.entityId), eq(applications.userId, userId)));
    } else {
      if (input.baseUpdatedAt) {
        const current = await db
          .select({ updatedAt: applications.updatedAt })
          .from(applications)
          .where(and(eq(applications.id, input.entityId), eq(applications.userId, userId)));
        if (current[0] && current[0].updatedAt > new Date(input.baseUpdatedAt)) return 'conflict';
      }
      await db.insert(applications).values(values).onConflictDoUpdate({
        target: applications.id,
        set: values,
      });
    }
  } else if (input.entityType === 'profile') {
    const values = {
      id: input.entityId,
      userId,
      ...(input.payload as Record<string, unknown>),
      updatedAt: new Date(),
    } as typeof profiles.$inferInsert;
    if (input.operation === 'delete') {
      await db.delete(profiles).where(and(eq(profiles.id, input.entityId), eq(profiles.userId, userId)));
    } else {
      if (input.baseUpdatedAt) {
        const current = await db
          .select({ updatedAt: profiles.updatedAt })
          .from(profiles)
          .where(and(eq(profiles.id, input.entityId), eq(profiles.userId, userId)));
        if (current[0] && current[0].updatedAt > new Date(input.baseUpdatedAt)) return 'conflict';
      }
      await db.insert(profiles).values(values).onConflictDoUpdate({
        target: profiles.id,
        set: values,
      });
    }
  } else if (input.entityType === 'privacy') {
    const values = {
      userId,
      ...(input.payload as Record<string, unknown>),
      updatedAt: new Date(),
    } as typeof privacySettings.$inferInsert;
    await db.insert(privacySettings).values(values).onConflictDoUpdate({
      target: privacySettings.userId,
      set: values,
    });
  }

  await db.insert(syncOperations).values({
    id: input.id,
    userId,
    entityType: input.entityType,
    entityId: input.entityId,
    operation: input.operation,
    baseUpdatedAt: input.baseUpdatedAt ? new Date(input.baseUpdatedAt) : null,
    payload: input.payload,
  });
  return 'applied';
}
