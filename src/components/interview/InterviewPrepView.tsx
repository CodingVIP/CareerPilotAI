import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Building,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronUp,
  Award,
  Globe,
  BookOpen,
  Lightbulb,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { JobApplication, JobProfile, InterviewPrepDossier } from '../../types/job';
import { apiService } from '../../services/aiClient';
import { storageService } from '../../services/storage';

interface InterviewPrepViewProps {
  applications: JobApplication[];
  profiles: JobProfile[];
  preselectedApplication?: JobApplication | null;
}

export const InterviewPrepView: React.FC<InterviewPrepViewProps> = ({
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

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expanded cards state
  const [expandedTechIndex, setExpandedTechIndex] = useState<number | null>(0);
  const [expandedBehavioralIndex, setExpandedBehavioralIndex] = useState<number | null>(0);

  // Mastered question tracker
  const [masteredIds, setMasteredIds] = useState<Record<string, boolean>>({});

  const selectedApp = applications.find((a) => a.id === selectedAppId);
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) || profiles[0];
  const selectedResume =
    selectedProfile?.resumeVersions.find((v) => v.id === selectedApp?.linkedResumeVersionId) ||
    selectedProfile?.resumeVersions.find((v) => v.isDefault) ||
    selectedProfile?.resumeVersions[0];

  const [dossier, setDossier] = useState<InterviewPrepDossier | null>(() => {
    return storageService.getInterviewDossier(selectedAppId);
  });

  useEffect(() => {
    setMasteredIds(dossier?.masteredQuestionIds || {});
  }, [dossier]);

  const handleApplicationChange = (appId: string) => {
    setSelectedAppId(appId);
    const app = applications.find((a) => a.id === appId);
    if (app && app.linkedProfileId) {
      setSelectedProfileId(app.linkedProfileId);
    }
    const cached = storageService.getInterviewDossier(appId);
    setDossier(cached);
    setMasteredIds(cached?.masteredQuestionIds || {});
  };

  const handleGeneratePrep = async () => {
    if (!selectedApp) {
      setError('Please select a target application.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const generated = await apiService.generateInterviewPrep({
        company: selectedApp.company,
        role: selectedApp.role,
        jobDescription: selectedApp.description,
        resumeText: selectedResume?.content || '',
      });

      setDossier(generated);
      storageService.saveInterviewDossier(selectedApp.id, generated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Interview intelligence generation failed';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMastered = (key: string) => {
    setMasteredIds((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      if (dossier && selectedApp) {
        storageService.saveInterviewDossier(selectedApp.id, {
          ...dossier,
          masteredQuestionIds: updated,
        });
      }
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Configuration Strip */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span>Company Interview Intelligence & Real-World Experiences</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Grounded web intelligence sourcing real candidate interview questions, Glassdoor/Reddit reports, and customized STAR response coaching tailored to your resume.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Target Application */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Target Interviewing Role
            </label>
            <select
              value={selectedAppId}
              onChange={(e) => handleApplicationChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
            >
              {applications.length > 0 ? (
                applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.company} — {app.role} ({app.status})
                  </option>
                ))
              ) : (
                <option value="">No applications added yet</option>
              )}
            </select>
          </div>

          {/* Candidate Profile Reference */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Candidate Resume Basis
            </label>
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
            >
              {profiles.length > 0 ? (
                profiles.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name} ({prof.resumeVersions.length} versions)
                  </option>
                ))
              ) : (
                <option value="">No profiles created yet</option>
              )}
            </select>
          </div>
        </div>

        {/* Action Trigger */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-400">
            {dossier ? (
              <span className="font-mono tabular-nums text-[11px]">
                Intelligence curated {new Date(dossier.generatedAt).toLocaleDateString()}
              </span>
            ) : (
              <span>No dossier generated yet for this role</span>
            )}
          </div>

          <button
            onClick={handleGeneratePrep}
            disabled={isLoading || !selectedApp}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching Web & Curating Intel...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{dossier ? 'Refresh Interview Dossier' : 'Generate Interview Prep'}</span>
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
              onClick={handleGeneratePrep}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 rounded border border-rose-300 dark:border-rose-700 transition-colors shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Retry</span>
            </button>
          </div>
        )}
      </div>

      {/* Dossier Content */}
      {dossier ? (
        <div className="space-y-6">
          {/* Company Background & Pipeline Stages */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs uppercase tracking-wider">
                <Building className="w-4 h-4" />
                <span>Interview Culture at {selectedApp?.company}</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {dossier.companyOverview}
              </p>

              {/* Tips */}
              {dossier.tipsForCompany && dossier.tipsForCompany.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Key Hiring Principles & Tips:
                  </span>
                  <div className="space-y-1">
                    {dossier.tipsForCompany.map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stages */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Typical Hiring Stages
              </span>
              <div className="space-y-2">
                {dossier.interviewStages.map((stage, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                  >
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-mono text-[11px] shrink-0 font-bold">
                      {idx + 1}
                    </span>
                    <span className="truncate">{stage}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Real Candidate Experiences Curated from the Web */}
          {dossier.pastCandidateExperiences && dossier.pastCandidateExperiences.length > 0 && (
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-600" />
                    <span>Real Candidate Experiences from the Internet</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Authentic reports from Glassdoor, Reddit, and Blind regarding {selectedApp?.company}&apos;s rounds for this role.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dossier.pastCandidateExperiences.map((exp, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-xs">{exp.source}</span>
                      {exp.difficulty && (
                        <span className="font-mono text-[11px] text-slate-400">Difficulty: {exp.difficulty}</span>
                      )}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      &quot;{exp.summary}&quot;
                    </p>
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Role Relevance:</span>
                      <span>{exp.roleRelevance}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grounding Web Citations */}
              {dossier.groundingSources && dossier.groundingSources.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Verified Web Sources & Community Discussions:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {dossier.groundingSources.map((source, sIdx) => (
                      <a
                        key={sIdx}
                        href={source.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[220px]">{source.title || source.uri}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Technical Questions & Model Answers */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Technical & System Design Practice Questions</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Questions frequently asked by {selectedApp?.company} technical interviewers with recommended solution frameworks.
              </p>
            </div>

            <div className="space-y-3">
              {dossier.technicalQuestions.map((q, idx) => {
                const isExpanded = expandedTechIndex === idx;
                const isMastered = !!masteredIds[`tech_${idx}`];

                return (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700/80 transition-all text-xs"
                  >
                    <div
                      onClick={() => setExpandedTechIndex(isExpanded ? null : idx)}
                      className="flex items-start justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                            Q{idx + 1}.
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                            {q.question}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-[11px] ml-5">
                          <span>Topic: {q.topic}</span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{q.importance} Priority</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMastered(`tech_${idx}`);
                          }}
                          className={`p-1 rounded ${
                            isMastered
                              ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title={isMastered ? 'Mastered' : 'Mark as mastered'}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                          Model Answer & Architectural Rationale:
                        </span>
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed font-mono text-[11px] whitespace-pre-line">
                          {q.sampleAnswer}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Behavioral Questions with STAR Coaching */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>Behavioral Questions with Tailored STAR Responses</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Structured according to the STAR methodology (Situation, Task, Action, Result) mapped to your uploaded resume accomplishments.
              </p>
            </div>

            <div className="space-y-4">
              {dossier.behavioralQuestions.map((bq, idx) => {
                const isExpanded = expandedBehavioralIndex === idx;
                const isMastered = !!masteredIds[`behav_${idx}`];

                return (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50/70 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs"
                  >
                    <div
                      onClick={() => setExpandedBehavioralIndex(isExpanded ? null : idx)}
                      className="flex items-start justify-between gap-3 cursor-pointer select-none"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                            B{idx + 1}.
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                            {bq.question}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 ml-5 block mt-0.5">
                          Assessing Competency: {bq.competency}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMastered(`behav_${idx}`);
                          }}
                          className={`p-1 rounded ${
                            isMastered
                              ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title={isMastered ? 'Mastered' : 'Mark as mastered'}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                          Tailored STAR Response (From your resume background):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block text-[11px] text-indigo-600 dark:text-indigo-400">
                              SITUATION
                            </span>
                            <p className="text-slate-600 dark:text-slate-300 mt-0.5 text-[11px] leading-relaxed">
                              {bq.starFramework.situation}
                            </p>
                          </div>

                          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block text-[11px] text-indigo-600 dark:text-indigo-400">
                              TASK
                            </span>
                            <p className="text-slate-600 dark:text-slate-300 mt-0.5 text-[11px] leading-relaxed">
                              {bq.starFramework.task}
                            </p>
                          </div>

                          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block text-[11px] text-indigo-600 dark:text-indigo-400">
                              ACTION
                            </span>
                            <p className="text-slate-600 dark:text-slate-300 mt-0.5 text-[11px] leading-relaxed">
                              {bq.starFramework.action}
                            </p>
                          </div>

                          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block text-[11px] text-emerald-600 dark:text-emerald-400">
                              RESULT
                            </span>
                            <p className="text-slate-600 dark:text-slate-300 mt-0.5 text-[11px] leading-relaxed">
                              {bq.starFramework.result}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl max-w-xl mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            No Interview Intelligence Dossier Generated Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Select a target application above and click &quot;Generate Interview Prep&quot; to research authentic candidate interview questions, company culture, and STAR answers.
          </p>
          <button
            onClick={handleGeneratePrep}
            disabled={isLoading || !selectedApp}
            className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
          >
            Curate Interview Prep Now
          </button>
        </div>
      )}
    </div>
  );
};
