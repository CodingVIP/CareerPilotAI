import assert from 'node:assert/strict';
import test from 'node:test';
import { storageService } from '../src/services/storage';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

test.beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

test('exports and restores a complete validated backup', () => {
  const profile = storageService.getProfiles()[0];
  storageService.setActiveProfileId(profile.id);
  const backup = storageService.exportAllData();

  storageService.resetToDefaults();
  assert.equal(storageService.importData(backup), true);
  assert.equal(storageService.getActiveProfileId(), profile.id);
  assert.ok(storageService.getProfiles().some((item) => item.id === profile.id));
});

test('rejects malformed backups without partial writes', () => {
  const applications = storageService.getApplications();
  assert.equal(storageService.importData(JSON.stringify({ applications: [] })), false);
  assert.deepEqual(storageService.getApplications(), applications);
});

test('maintains resume references when a version is deleted', () => {
  const profile = storageService.getProfiles()[0];
  const resume = profile.resumeVersions[0];
  storageService.deleteResumeVersion(profile.id, resume.id);
  const updatedProfile = storageService.getProfiles().find((item) => item.id === profile.id);
  assert.ok(updatedProfile);
  if (updatedProfile?.resumeVersions.length) {
    assert.equal(updatedProfile.resumeVersions.some((item) => item.isDefault), true);
  }
});

test('imports a validated cloud snapshot and reports record counts', () => {
  const counts = storageService.importCloudSnapshot({
    applications: [{
      id: 'cloud-app',
      company: 'Cloud Co',
      role: 'Engineer',
      url: '',
      status: 'wishlist',
      salaryCurrency: 'USD',
      location: 'Remote',
      jobType: 'remote',
      requirements: [],
      description: 'Build things.',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }],
    profiles: [{
      id: 'cloud-profile',
      name: 'Cloud profile',
      targetRole: 'Engineer',
      summary: '',
      skills: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resumeVersions: [{
        id: 'cloud-resume',
        versionName: 'Cloud resume',
        content: 'One two three',
        tags: [],
        isDefault: true,
        uploadedAt: new Date().toISOString(),
      }],
    }],
    privacy: {
      cloudSyncEnabled: true,
      encryptLocalData: false,
      telemetryDisabled: true,
    },
  });
  assert.deepEqual(counts, { applications: 1, profiles: 1, resumes: 1 });
  assert.equal(storageService.getApplications()[0].id, 'cloud-app');
  assert.equal(storageService.getProfiles()[0].resumeVersions[0].wordCount, 3);
});
