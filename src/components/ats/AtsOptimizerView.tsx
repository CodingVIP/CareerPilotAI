import React, { useState } from 'react';
import {
  Target,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
  FileText,
  Briefcase,
  ChevronRight,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { JobApplication, JobProfile, KeywordAnalysisResult } from '../../types/job';
import { apiService } from '../../services/aiClient';
import { storageService } from '../../services/storage';

interface AtsOptimizerViewProps {
  applications: JobApplication[];
  profiles: JobProfile[];
  preselectedApplication?: JobApplication | null;
}

export const AtsOptimizerView: React.FC<AtsOptimizerViewProps> = ({
  applications,
  profiles,
  preselectedApplication,
}) => {
  const [selectedAppId, setSelectedAppId] = useState<string>(
    preselectedApplication?.id || applications[0]?.id || ''
  );
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    preselectedApplication?.linkedProfileId || profiles[0]?.id || ''
  );

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0];
  const [selectedResumeId, setSelectedResumeId] = useState<string>(
    preselectedApplication?.linkedResumeVersionId ||
      selectedProfile?.resumeVersions.find((v) => v.isDefault)?.id ||
      selectedProfile?.resumeVersions[0]?.id ||
      ''
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const selectedApp = applications.find((a) => a.id === selectedAppId);
  const selectedResume = selectedProfile?.resumeVersions.find((v) => v.id === selectedResumeId);

  // Check cached analysis
  const cacheKey = `${selectedAppId}_${selectedApp?.updatedAt || ''}_${selectedResumeId}_${selectedResume?.uploadedAt || ''}`;
  const [analysisResult, setAnalysisResult] = useState<KeywordAnalysisResult | null>(() => {
    return storageService.getKeywordMatch(cacheKey);
  });

  const handleProfileChange = (profileId: string) => {
    setSelectedProfileId(profileId);
    const prof = profiles.find((p) => p.id === profileId);
    if (prof && prof.resumeVersions.length > 0) {
      const def = prof.resumeVersions.find((v) => v.isDefault) || prof.resumeVersions[0];
      setSelectedResumeId(def.id);
      const newCache = storageService.getKeywordMatch(
        `${selectedAppId}_${selectedApp?.updatedAt || ''}_${def.id}_${def.uploadedAt || ''}`
      );
      setAnalysisResult(newCache);
    }
  };

  const handleApplicationChange = (appId: string) => {
    setSelectedAppId(appId);
    const app = applications.find((a) => a.id === appId);
    if (app && app.linkedProfileId) {
      setSelectedProfileId(app.linkedProfileId);
      if (app.linkedResumeVersionId) {
        setSelectedResumeId(app.linkedResumeVersionId);
      }
    }
    const nextResumeId = app?.linkedResumeVersionId || selectedResumeId;
    const nextResume = profiles
      .flatMap((profile) => profile.resumeVersions)
      .find((resume) => resume.id === nextResumeId);
    const newCache = storageService.getKeywordMatch(
      `${appId}_${app?.updatedAt || ''}_${nextResumeId}_${nextResume?.uploadedAt || ''}`
    );
    setAnalysisResult(newCache);
  };

  const handleRunAudit = async () => {
    if (!selectedApp) {
      setError('Please select a target job application.');
      return;
    }
    if (!selectedResume) {
      setError('Please select a resume version.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiService.analyzeResumeMatch({
        jobDescription: selectedApp.description,
        requirements: selectedApp.requirements,
        resumeText: selectedResume.content,
        roleTitle: selectedApp.role,
        company: selectedApp.company,
      });

      setAnalysisResult(result);
      storageService.saveKeywordMatch(cacheKey, result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyBullet = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            <span>ATS Resume Match & Semantic Keyword Optimizer</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Compare your tailored resume version against official job requirements to diagnose keyword gaps and boost interview invitation rates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Target Application Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Target Job Application
            </label>
            <select
              value={selectedAppId}
              onChange={(e) => handleApplicationChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
            >
              {applications.length > 0 ? (
                applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.company} — {app.role}
                  </option>
                ))
              ) : (
                <option value="">No applications added yet</option>
              )}
            </select>
          </div>

          {/* Profile Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Candidate Job Profile
            </label>
            <select
              value={selectedProfileId}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
            >
              {profiles.length > 0 ? (
                profiles.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name}
                  </option>
                ))
              ) : (
                <option value="">No profiles created yet</option>
              )}
            </select>
          </div>

          {/* Resume Version Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Resume Iteration
            </label>
            <select
              value={selectedResumeId}
              onChange={(e) => {
                setSelectedResumeId(e.target.value);
                const nextResume = selectedProfile?.resumeVersions.find((resume) => resume.id === e.target.value);
                setAnalysisResult(
                  storageService.getKeywordMatch(
                    `${selectedAppId}_${selectedApp?.updatedAt || ''}_${e.target.value}_${nextResume?.uploadedAt || ''}`
                  )
                );
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
            >
              {selectedProfile?.resumeVersions && selectedProfile.resumeVersions.length > 0 ? (
                selectedProfile.resumeVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.versionName} {v.isDefault ? '★' : ''} ({v.wordCount || 0}w)
                  </option>
                ))
              ) : (
                <option value="">No resume versions</option>
              )}
            </select>
          </div>
        </div>

        {/* Action Trigger */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-400">
            {analysisResult ? (
              <span className="font-mono tabular-nums text-[11px]">
                Audited {new Date(analysisResult.analyzedAt).toLocaleDateString()} at{' '}
                {new Date(analysisResult.analyzedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            ) : (
              <span>Ready for semantic evaluation</span>
            )}
          </div>

          <button
            onClick={handleRunAudit}
            disabled={isLoading || !selectedApp || !selectedResume}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Evaluating ATS Match...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{analysisResult ? 'Re-Run Match Audit' : 'Run ATS Audit'}</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2 text-rose-800 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <p className="leading-relaxed">{error}</p>
            </div>
            <button
              type="button"
              onClick={handleRunAudit}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 rounded border border-rose-300 dark:border-rose-700 transition-colors shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Retry</span>
            </button>
          </div>
        )}
      </div>

      {/* Analysis Results View */}
      {analysisResult ? (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Score Card */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex flex-col justify-center items-center text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                ATS Compatibility
              </span>
              <div className="flex items-baseline gap-1 my-1">
                <span
                  className={`text-4xl font-extrabold font-mono tabular-nums ${
                    analysisResult.score >= 80
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : analysisResult.score >= 60
                        ? 'text-amber-500'
                        : 'text-rose-500'
                  }`}
                >
                  {analysisResult.score}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {analysisResult.score >= 80
                  ? 'Strong Keyword Alignment'
                  : analysisResult.score >= 60
                    ? 'Moderate Fit - Optimization Recommended'
                    : 'Low Match - High Risk of Filter Rejection'}
              </p>
            </div>

            {/* Strengths Card */}
            <div className="md:col-span-3 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Strategic Tailoring Guidance
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {analysisResult.tailoringAdvice}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {analysisResult.strengths.map((str, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/60"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{str}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Keywords Breakdown (Matched vs Missing) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Matched Keywords */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Matched Keywords ({analysisResult.matchedKeywords.length})</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">Present in resume</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {analysisResult.matchedKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800/50"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Missing Critical Keywords */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Missing Keyword Gaps ({analysisResult.missingKeywords.length})</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">Recommended to add</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {analysisResult.missingKeywords.map((gap, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{gap.keyword}</span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                            gap.importance === 'high'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {gap.importance}
                        </span>
                        <span className="text-[11px] text-slate-400 capitalize">{gap.category}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-1 text-[11px] leading-relaxed">
                        {gap.context}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actionable Resume Bullet Suggestions (XYZ Metric Formula) */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Tailored Impact Bullets for this Application</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ready-to-use metric-driven achievements incorporating target keywords in the standard Google XYZ format.
              </p>
            </div>

            <div className="space-y-3">
              {analysisResult.bulletSuggestions.map((bullet, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700/70 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px]">
                        <span>Targets: {bullet.targetKeyword}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-400 font-normal">{bullet.rationale}</span>
                      </div>
                      <p className="text-slate-900 dark:text-slate-100 font-medium text-xs leading-relaxed">
                        • {bullet.suggestedBullet}
                      </p>
                    </div>

                    <button
                      onClick={() => handleCopyBullet(bullet.suggestedBullet, idx)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl max-w-xl mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            No ATS Keyword Analysis Performed Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Select a target job application and a resume version above, then click &quot;Run ATS Audit&quot; to inspect your match percentage and missing critical terms.
          </p>
          <button
            onClick={handleRunAudit}
            disabled={isLoading || !selectedApp || !selectedResume}
            className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
          >
            Run ATS Audit Now
          </button>
        </div>
      )}
    </div>
  );
};
