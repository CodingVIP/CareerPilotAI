import React, { useState } from 'react';
import { X, FileText, Check, ArrowRight } from 'lucide-react';
import { JobProfile, ResumeVersion } from '../../types/job';
import { Dialog } from '../common/Dialog';

interface ResumeDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: JobProfile | null;
  initialVersionId?: string;
}

export const ResumeDiffModal: React.FC<ResumeDiffModalProps> = ({
  isOpen,
  onClose,
  profile,
  initialVersionId,
}) => {
  const [versionAId, setVersionAId] = useState<string>(
    initialVersionId || profile?.resumeVersions[0]?.id || ''
  );
  const [versionBId, setVersionBId] = useState<string>(
    profile?.resumeVersions.length && profile.resumeVersions.length > 1
      ? profile.resumeVersions[1]?.id
      : profile?.resumeVersions[0]?.id || ''
  );

  if (!isOpen || !profile) return null;

  const versions = profile.resumeVersions;
  const versionA = versions.find((v) => v.id === versionAId);
  const versionB = versions.find((v) => v.id === versionBId);

  return (
    <Dialog
      open={isOpen && Boolean(profile)}
      title="Resume Version Comparison & Inspector"
      onClose={onClose}
      showCloseButton={false}
      className="max-w-6xl overflow-hidden"
    >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Resume Version Comparison & Inspector</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review textual differences, keyword focus, and length across iterations for {profile.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Version Selectors Bar */}
        <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
          <div className="px-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Version 1:</span>
              <select
                value={versionAId}
                onChange={(e) => setVersionAId(e.target.value)}
                className="text-xs font-medium py-1 px-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.versionName} {v.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <span className="font-mono tabular-nums text-xs text-slate-400">
              {versionA?.wordCount || 0} words
            </span>
          </div>

          <div className="px-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Version 2:</span>
              <select
                value={versionBId}
                onChange={(e) => setVersionBId(e.target.value)}
                className="text-xs font-medium py-1 px-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.versionName} {v.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <span className="font-mono tabular-nums text-xs text-slate-400">
              {versionB?.wordCount || 0} words
            </span>
          </div>
        </div>

        {/* Content Viewports */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 flex-1 overflow-hidden">
          {/* Version A Pane */}
          <div className="p-4 overflow-y-auto max-h-[60vh] bg-slate-50/30 dark:bg-slate-950/30">
            <div className="flex flex-wrap gap-1 mb-3">
              {versionA?.tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded"
                >
                  {t}
                </span>
              ))}
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200">
              {versionA?.content || 'No content loaded'}
            </pre>
          </div>

          {/* Version B Pane */}
          <div className="p-4 overflow-y-auto max-h-[60vh] bg-slate-50/30 dark:bg-slate-950/30">
            <div className="flex flex-wrap gap-1 mb-3">
              {versionB?.tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 text-[11px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-100 dark:border-indigo-900"
                >
                  {t}
                </span>
              ))}
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200">
              {versionB?.content || 'No content loaded'}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close Inspector
          </button>
        </div>
    </Dialog>
  );
};
