/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/layout/Navbar';
import { ApplicationsView } from './components/applications/ApplicationsView';
import { ProfilesView } from './components/profiles/ProfilesView';
import { AtsOptimizerView } from './components/ats/AtsOptimizerView';
import { InterviewPrepView } from './components/interview/InterviewPrepView';
import { ToastContainer } from './components/common/Toast';
import { storageService } from './services/storage';
import {
  JobApplication,
  JobProfile,
  ResumeVersion,
  UserPrivacySettings,
  ToastMessage,
} from './types/job';
import { Briefcase, FileText, Target, Sparkles } from 'lucide-react';
import { syncService, PendingSyncOperation } from './services/sync';
import { SyncConflictPanel } from './components/common/SyncConflictPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('applications');
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [profiles, setProfiles] = useState<JobProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [privacy, setPrivacy] = useState<UserPrivacySettings>(storageService.getPrivacySettings());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [syncConflicts, setSyncConflicts] = useState<PendingSyncOperation[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);

  // Pre-selected application for direct jump from pipeline card to ATS or Interview Prep
  const [selectedForAts, setSelectedForAts] = useState<JobApplication | null>(null);
  const [selectedForInterview, setSelectedForInterview] = useState<JobApplication | null>(null);

  // Initialize data on mount
  useEffect(() => {
    loadData();
    const flushSync = async () => {
      if (!storageService.getPrivacySettings().cloudSyncEnabled || !navigator.onLine) return;
      try {
        const result = await syncService.flush();
        setSyncConflicts(syncService.getConflicts());
        if (result.applied) addToast({ type: 'success', title: 'Changes synchronized', description: `${result.applied} local change${result.applied === 1 ? '' : 's'} uploaded.` });
      } catch {
        // A missing login or cloud configuration should not interrupt local-first use.
      } finally {
      }
    };
    void flushSync();
    const handleOnline = () => void flushSync();
    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const queueChange = (
    entityType: PendingSyncOperation['entityType'],
    entityId: string,
    operation: PendingSyncOperation['operation'],
    payload: Record<string, unknown>,
    baseUpdatedAt?: string,
  ) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sync-${Date.now()}-${Math.random()}`;
    syncService.enqueue({ id, entityType, entityId, operation, payload, baseUpdatedAt });
  };

  const profilePayload = (profile: JobProfile): Record<string, unknown> => ({
    id: profile.id,
    name: profile.name,
    targetRole: profile.targetRole,
    summary: profile.summary,
    skills: profile.skills,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  });

  const resumePayload = (profileId: string, version: ResumeVersion): Record<string, unknown> => ({
    id: version.id,
    profileId,
    versionName: version.versionName,
    content: version.content,
    tags: version.tags,
    isDefault: version.isDefault,
    fileType: version.fileType,
    fileSize: version.fileSize,
    uploadedAt: version.uploadedAt,
  });

  const loadData = () => {
    const apps = storageService.getApplications();
    const profs = storageService.getProfiles();
    const activeId = storageService.getActiveProfileId();
    const priv = storageService.getPrivacySettings();

    setApplications(apps);
    setProfiles(profs);
    setActiveProfileId(activeId);
    setPrivacy(priv);
  };

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Applications Handlers
  const handleAddApplication = (newApp: JobApplication) => {
    storageService.addApplication(newApp);
    queueChange('application', newApp.id, 'upsert', newApp as unknown as Record<string, unknown>);
    setApplications(storageService.getApplications());
    addToast({
      type: 'success',
      title: 'Application Added',
      description: `${newApp.role} at ${newApp.company} added to pipeline.`,
    });
  };

  const handleUpdateApplication = (updatedApp: JobApplication) => {
    const previous = applications.find((app) => app.id === updatedApp.id);
    storageService.updateApplication(updatedApp);
    queueChange('application', updatedApp.id, 'upsert', updatedApp as unknown as Record<string, unknown>, previous?.updatedAt);
    setApplications(storageService.getApplications());
    addToast({
      type: 'info',
      title: 'Application Updated',
      description: `Saved changes to ${updatedApp.company}.`,
    });
  };

  const handleDeleteApplication = (id: string) => {
    const previous = applications.find((app) => app.id === id);
    storageService.deleteApplication(id);
    if (previous) queueChange('application', id, 'delete', {}, previous.updatedAt);
    setApplications(storageService.getApplications());
    addToast({
      type: 'warning',
      title: 'Application Removed',
      description: 'The job posting was deleted from your pipeline.',
    });
  };

  // Profiles & Resumes Handlers
  const handleAddProfile = (newProfile: JobProfile) => {
    storageService.addProfile(newProfile);
    queueChange('profile', newProfile.id, 'upsert', profilePayload(newProfile));
    setProfiles(storageService.getProfiles());
    setActiveProfileId(newProfile.id);
    storageService.setActiveProfileId(newProfile.id);
    addToast({
      type: 'success',
      title: 'Profile Created',
      description: `Job profile "${newProfile.name}" is now active.`,
    });
  };

  const handleUpdateProfile = (updatedProfile: JobProfile) => {
    const previous = profiles.find((profile) => profile.id === updatedProfile.id);
    storageService.updateProfile(updatedProfile);
    queueChange('profile', updatedProfile.id, 'upsert', profilePayload(updatedProfile), previous?.updatedAt);
    setProfiles(storageService.getProfiles());
    addToast({
      type: 'info',
      title: 'Profile Updated',
      description: `Updated profile "${updatedProfile.name}".`,
    });
  };

  const handleDeleteProfile = (id: string) => {
    const previous = profiles.find((profile) => profile.id === id);
    storageService.deleteProfile(id);
    if (previous) queueChange('profile', id, 'delete', {}, previous.updatedAt);
    const updated = storageService.getProfiles();
    setProfiles(updated);
    if (activeProfileId === id && updated.length > 0) {
      setActiveProfileId(updated[0].id);
      storageService.setActiveProfileId(updated[0].id);
    }
    addToast({
      type: 'warning',
      title: 'Profile Deleted',
      description: 'Profile and associated versions removed.',
    });
  };

  const handleAddResumeVersion = (profileId: string, version: ResumeVersion) => {
    storageService.addResumeVersion(profileId, version);
    queueChange('resume', version.id, 'upsert', resumePayload(profileId, version));
    setProfiles(storageService.getProfiles());
    addToast({
      type: 'success',
      title: 'Resume Version Saved',
      description: `Added "${version.versionName}".`,
    });
  };

  const handleUpdateResumeVersion = (profileId: string, version: ResumeVersion) => {
    const previous = profiles.find((profile) => profile.id === profileId)?.resumeVersions.find((item) => item.id === version.id);
    storageService.updateResumeVersion(profileId, version);
    queueChange('resume', version.id, 'upsert', resumePayload(profileId, version), previous?.uploadedAt);
    setProfiles(storageService.getProfiles());
    addToast({
      type: 'info',
      title: 'Resume Version Updated',
      description: `Saved changes to "${version.versionName}".`,
    });
  };

  const handleDeleteResumeVersion = (profileId: string, versionId: string) => {
    const previous = profiles.find((profile) => profile.id === profileId)?.resumeVersions.find((item) => item.id === versionId);
    storageService.deleteResumeVersion(profileId, versionId);
    if (previous) queueChange('resume', versionId, 'delete', { profileId }, previous.uploadedAt);
    setProfiles(storageService.getProfiles());
    addToast({
      type: 'warning',
      title: 'Resume Version Deleted',
      description: 'Version removed from profile.',
    });
  };

  // Navigation Jumps
  const handleGoToAtsMatch = (app: JobApplication) => {
    setSelectedForAts(app);
    setActiveTab('ats');
  };

  const handleGoToInterviewPrep = (app: JobApplication) => {
    setSelectedForInterview(app);
    setActiveTab('interview');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-16 md:pb-6">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        applicationCount={applications.length}
        privacy={privacy}
        onUpdatePrivacy={(newPrivacy) => {
          const previous = privacy;
          setPrivacy(newPrivacy);
          storageService.savePrivacySettings(newPrivacy);
          queueChange('privacy', 'current', 'upsert', newPrivacy as unknown as Record<string, unknown>, previous.lastSyncedAt);
          addToast({
            type: 'info',
            title: 'Privacy Preferences Saved',
            description: 'Local encryption and cloud synchronization settings updated.',
          });
        }}
        onDataRefresh={loadData}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'applications' && (
          <ApplicationsView
            applications={applications}
            profiles={profiles}
            activeProfileId={activeProfileId}
            onAddApplication={handleAddApplication}
            onUpdateApplication={handleUpdateApplication}
            onDeleteApplication={handleDeleteApplication}
            onGoToAtsMatch={handleGoToAtsMatch}
            onGoToInterviewPrep={handleGoToInterviewPrep}
            isAddModalOpen={isAddModalOpen}
            setIsAddModalOpen={setIsAddModalOpen}
          />
        )}

        {activeTab === 'profiles' && (
          <ProfilesView
            profiles={profiles}
            activeProfileId={activeProfileId}
            onSelectActiveProfile={(id) => {
              setActiveProfileId(id);
              storageService.setActiveProfileId(id);
            }}
            onAddProfile={handleAddProfile}
            onUpdateProfile={handleUpdateProfile}
            onDeleteProfile={handleDeleteProfile}
            onAddResumeVersion={handleAddResumeVersion}
            onUpdateResumeVersion={handleUpdateResumeVersion}
            onDeleteResumeVersion={handleDeleteResumeVersion}
          />
        )}

        {activeTab === 'ats' && (
          <AtsOptimizerView
            applications={applications}
            profiles={profiles}
            preselectedApplication={selectedForAts}
          />
        )}

        {activeTab === 'interview' && (
          <InterviewPrepView
            applications={applications}
            profiles={profiles}
            preselectedApplication={selectedForInterview}
          />
        )}
      </main>

      {/* Mobile Sticky Bottom Nav Bar (under 15% mobile viewport cap) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 h-14">
        <button
          onClick={() => setActiveTab('applications')}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] ${
            activeTab === 'applications'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Pipeline</span>
        </button>

        <button
          onClick={() => setActiveTab('profiles')}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] ${
            activeTab === 'profiles'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Resumes</span>
        </button>

        <button
          onClick={() => setActiveTab('ats')}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] ${
            activeTab === 'ats'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>ATS Match</span>
        </button>

        <button
          onClick={() => setActiveTab('interview')}
          className={`flex flex-col items-center justify-center gap-1 text-[11px] ${
            activeTab === 'interview'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Interview</span>
        </button>
      </div>

      {/* Actionable Toasts */}
      {syncConflicts.length > 0 && (
        <button
          onClick={() => setShowConflicts(true)}
          className="fixed bottom-20 right-4 z-40 rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-white shadow-lg"
        >
          {syncConflicts.length} sync conflict{syncConflicts.length === 1 ? '' : 's'}
        </button>
      )}
      {showConflicts && (
        <SyncConflictPanel
          conflicts={syncConflicts}
          onRetry={(id) => {
            syncService.retryConflict(id);
            setSyncConflicts(syncService.getConflicts());
            void syncService.flush().then(() => setSyncConflicts(syncService.getConflicts())).catch(() => undefined);
          }}
          onDiscard={(id) => {
            syncService.discard(id);
            setSyncConflicts(syncService.getConflicts());
            if (syncService.getConflicts().length === 0) setShowConflicts(false);
          }}
          onClose={() => setShowConflicts(false)}
        />
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
