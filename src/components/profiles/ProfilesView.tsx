import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Star,
  Clock,
  Columns,
  Download,
  UploadCloud,
  FileCheck,
  User,
  Briefcase,
} from 'lucide-react';
import { JobProfile, ResumeVersion } from '../../types/job';
import { ProfileModal } from './ProfileModal';
import { ResumeVersionModal } from './ResumeVersionModal';
import { ResumeDiffModal } from './ResumeDiffModal';
import { EmptyState } from '../common/EmptyState';

interface ProfilesViewProps {
  profiles: JobProfile[];
  activeProfileId: string;
  onSelectActiveProfile: (id: string) => void;
  onAddProfile: (profile: JobProfile) => void;
  onUpdateProfile: (profile: JobProfile) => void;
  onDeleteProfile: (id: string) => void;
  onAddResumeVersion: (profileId: string, version: ResumeVersion) => void;
  onUpdateResumeVersion: (profileId: string, version: ResumeVersion) => void;
  onDeleteResumeVersion: (profileId: string, versionId: string) => void;
}

export const ProfilesView: React.FC<ProfilesViewProps> = ({
  profiles,
  activeProfileId,
  onSelectActiveProfile,
  onAddProfile,
  onUpdateProfile,
  onDeleteProfile,
  onAddResumeVersion,
  onUpdateResumeVersion,
  onDeleteResumeVersion,
}) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    activeProfileId || profiles[0]?.id || ''
  );
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<JobProfile | null>(null);

  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<ResumeVersion | null>(null);

  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [diffInitialVersionId, setDiffInitialVersionId] = useState<string | undefined>(undefined);

  const [confirmingDeleteProfileId, setConfirmingDeleteProfileId] = useState<string | null>(null);
  const [confirmingDeleteVersionId, setConfirmingDeleteVersionId] = useState<string | null>(null);

  const currentProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0];

  const handleOpenEditProfile = (profile: JobProfile) => {
    setEditingProfile(profile);
    setIsProfileModalOpen(true);
  };

  const handleOpenNewVersion = () => {
    setEditingVersion(null);
    setIsResumeModalOpen(true);
  };

  const handleOpenEditVersion = (version: ResumeVersion) => {
    setEditingVersion(version);
    setIsResumeModalOpen(true);
  };

  const handleSetDefaultVersion = (version: ResumeVersion) => {
    if (!currentProfile) return;
    onUpdateResumeVersion(currentProfile.id, { ...version, isDefault: true });
  };

  const handleOpenDiff = (versionId?: string) => {
    setDiffInitialVersionId(versionId);
    setIsDiffModalOpen(true);
  };

  const handleDownloadDocument = (version: ResumeVersion) => {
    if (version.fileData) {
      const a = document.createElement('a');
      a.href = version.fileData;
      a.download = version.fileName || `${version.versionName}.${version.fileType || 'pdf'}`;
      a.click();
    } else {
      const blob = new Blob([version.content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${version.versionName}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Top Profile Selection Ribbon */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
            Job Profiles:
          </span>
          {profiles.length > 0 ? (
            profiles.map((prof) => {
              const isSelected = prof.id === (currentProfile?.id || selectedProfileId);
              return (
                <button
                  key={prof.id}
                  onClick={() => {
                    setSelectedProfileId(prof.id);
                    onSelectActiveProfile(prof.id);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {prof.name}
                </button>
              );
            })
          ) : (
            <span className="text-xs text-slate-400 italic">No profiles created yet</span>
          )}
        </div>

        <button
          onClick={() => {
            setEditingProfile(null);
            setIsProfileModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100/60 dark:hover:bg-indigo-900/60 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Profile</span>
        </button>
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          icon={<User className="w-6 h-6" />}
          title="No Job Profiles Found"
          description="Create a job profile to store, upload, and organize your PDF and Word DOCX resume documents for ATS matching and interview preparation."
          actionLabel="Create First Profile"
          onAction={() => {
            setEditingProfile(null);
            setIsProfileModalOpen(true);
          }}
        />
      ) : currentProfile ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Details Card (Left Col) */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-5 h-fit">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                  Target Role
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {currentProfile.targetRole || currentProfile.name}
                </h3>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEditProfile(currentProfile)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Edit profile details"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {confirmingDeleteProfileId === currentProfile.id ? (
                  <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 px-2 py-0.5 rounded-md">
                    <span className="text-[11px] font-medium text-rose-700 dark:text-rose-300">Delete profile?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteProfile(currentProfile.id);
                        const remaining = profiles.filter((p) => p.id !== currentProfile.id);
                        setSelectedProfileId(remaining[0]?.id || '');
                        setConfirmingDeleteProfileId(null);
                      }}
                      className="px-1.5 py-0.5 text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteProfileId(null)}
                      className="px-1 py-0.5 text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDeleteProfileId(currentProfile.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Delete profile"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Narrative Summary */}
            {currentProfile.summary && (
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  Career Narrative
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
                  {currentProfile.summary}
                </p>
              </div>
            )}

            {/* Core Skills */}
            {currentProfile.skills.length > 0 && (
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-2">
                  Targeted Skills ({currentProfile.skills.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentProfile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Resume Documents Stored:</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                {currentProfile.resumeVersions.length}
              </span>
            </div>
          </div>

          {/* Resume Version Management (Right 2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Documents for {currentProfile.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Stored PDF, Word DOCX, and text versions ready for ATS analysis and download.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {currentProfile.resumeVersions.length > 1 && (
                  <button
                    onClick={() => handleOpenDiff()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Compare Versions</span>
                  </button>
                )}

                <button
                  onClick={handleOpenNewVersion}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload / Add Resume</span>
                </button>
              </div>
            </div>

            {/* Version Cards List */}
            <div className="space-y-3">
              {currentProfile.resumeVersions.map((version) => (
                <div
                  key={version.id}
                  className={`p-4 bg-white dark:bg-slate-900 rounded-xl border transition-all ${
                    version.isDefault
                      ? 'border-indigo-300 dark:border-indigo-800/80 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {version.versionName}
                        </h4>
                        {version.isDefault && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                            <Star className="w-3 h-3 fill-indigo-600 dark:fill-indigo-400" />
                            Default
                          </span>
                        )}
                        {version.fileType && (
                          <span className="font-mono uppercase text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {version.fileType}
                            {version.fileSize ? ` · ${formatFileSize(version.fileSize)}` : ''}
                          </span>
                        )}
                      </div>

                      {/* Unboxed Metadata */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(version.uploadedAt).toLocaleDateString()}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{version.wordCount || 0} words extracted</span>
                        {version.fileName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate max-w-[200px]" title={version.fileName}>
                              {version.fileName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!version.isDefault && (
                        <button
                          onClick={() => handleSetDefaultVersion(version)}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          Make Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDownloadDocument(version)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={version.fileData ? 'Download original document' : 'Download markdown text'}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDiff(version.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Preview text content"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEditVersion(version)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit version"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {confirmingDeleteVersionId === version.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 px-1.5 py-0.5 rounded">
                          <span className="text-[10px] font-medium text-rose-700 dark:text-rose-300">Delete?</span>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteResumeVersion(currentProfile.id, version.id);
                              setConfirmingDeleteVersionId(null);
                            }}
                            className="px-1.5 py-0.5 text-[10px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteVersionId(null)}
                            className="px-1 py-0.5 text-[10px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteVersionId(version.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete resume version"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Focus Tags */}
                  {version.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {version.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Content Preview Snippet */}
                  <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200/70 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                    {version.content.slice(0, 240)}...
                  </div>
                </div>
              ))}

              {currentProfile.resumeVersions.length === 0 && (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      No resume documents stored yet
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      Drag-and-drop a PDF or Word DOCX resume to extract text for ATS scoring while preserving the original document for download.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenNewVersion}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload Resume Document</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Modals */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={(prof) => {
          if (editingProfile) {
            onUpdateProfile(prof);
          } else {
            onAddProfile(prof);
            setSelectedProfileId(prof.id);
          }
        }}
        initialProfile={editingProfile}
      />

      <ResumeVersionModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        onSave={(ver) => {
          if (!currentProfile) return;
          if (editingVersion) {
            onUpdateResumeVersion(currentProfile.id, ver);
          } else {
            onAddResumeVersion(currentProfile.id, ver);
          }
        }}
        initialVersion={editingVersion}
        profileName={currentProfile?.name || ''}
      />

      <ResumeDiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        profile={currentProfile}
        initialVersionId={diffInitialVersionId}
      />
    </div>
  );
};
