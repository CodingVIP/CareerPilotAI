import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Globe,
  FileText,
  Loader2,
  Plus,
  Trash2,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Clipboard,
  Check,
} from 'lucide-react';
import { JobApplication, JobProfile, ApplicationStatus, JobType } from '../../types/job';
import { apiService } from '../../services/geminiClient';

interface AddApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (app: JobApplication) => void;
  profiles: JobProfile[];
  activeProfileId: string;
}

export const AddApplicationModal: React.FC<AddApplicationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  profiles,
  activeProfileId,
}) => {
  const [url, setUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [showPasteMode, setShowPasteMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  // Form Fields
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('Remote');
  const [jobType, setJobType] = useState<JobType>('remote');
  const [status, setStatus] = useState<ApplicationStatus>('applied');
  const [salaryMin, setSalaryMin] = useState<number | ''>('');
  const [salaryMax, setSalaryMax] = useState<number | ''>('');
  const [salaryCurrency, setSalaryCurrency] = useState('USD');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [newReqInput, setNewReqInput] = useState('');
  const [description, setDescription] = useState('');
  const [rawDescription, setRawDescription] = useState('');
  const [showRawBuffer, setShowRawBuffer] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState(activeProfileId || profiles[0]?.id || '');
  const [selectedResumeVersionId, setSelectedResumeVersionId] = useState(
    profiles.find((p) => p.id === activeProfileId)?.resumeVersions[0]?.id || ''
  );
  const [notes, setNotes] = useState('');
  const [appliedDate, setAppliedDate] = useState(new Date().toISOString().slice(0, 10));

  if (!isOpen) return null;

  const currentProfile = profiles.find((p) => p.id === selectedProfileId);

  const handleProfileChange = (profileId: string) => {
    setSelectedProfileId(profileId);
    const prof = profiles.find((p) => p.id === profileId);
    if (prof && prof.resumeVersions.length > 0) {
      setSelectedResumeVersionId(prof.resumeVersions[0].id);
    } else {
      setSelectedResumeVersionId('');
    }
  };

  const executeExtract = async (targetUrl?: string, targetRawText?: string) => {
    const effectiveUrl = (targetUrl !== undefined ? targetUrl : url).trim();
    const effectiveRaw = (targetRawText !== undefined ? targetRawText : rawText).trim();

    if (!effectiveUrl && !effectiveRaw) {
      setError('Please provide a job posting URL or paste the job description text.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setFallbackNotice(null);

    try {
      const extracted = await apiService.scrapeJob({
        url: effectiveUrl || undefined,
        rawText: effectiveRaw || undefined,
      });

      setCompany(extracted.company || '');
      setRole(extracted.role || '');
      setLocation(extracted.location || 'Remote');
      setJobType(extracted.jobType || 'remote');
      setSalaryMin(extracted.salaryMin || '');
      setSalaryMax(extracted.salaryMax || '');
      setSalaryCurrency(extracted.salaryCurrency || 'USD');
      setRequirements(extracted.requirements || []);
      setDescription(extracted.description || '');
      const rawHtml = extracted.rawDescription || extracted.description || '';
      setRawDescription(rawHtml);
      if (rawHtml) setShowRawBuffer(true);

      if (!effectiveUrl && extracted.url) {
        setUrl(extracted.url);
      }

      if (extracted.isFallback) {
        setFallbackNotice(
          extracted.fallbackNotice ||
            'The AI model is experiencing temporary high demand. We pre-filled fields using page structure; you can review below or click Retry.'
        );
      }
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'Failed to extract job details';
      let friendlyMsg = rawMsg;
      if (rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('UNAVAILABLE')) {
        friendlyMsg =
          'The AI extraction service is temporarily experiencing high demand. Please try clicking Retry in a few seconds, or paste the job description.';
      }
      setError(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoExtract = () => {
    executeExtract();
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        setError('Clipboard is empty. Copy the job link or description text, then click Paste.');
        return;
      }
      const trimmed = text.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        setUrl(trimmed);
        setShowPasteMode(false);
        executeExtract(trimmed, undefined);
      } else {
        setRawText(trimmed);
        setShowPasteMode(true);
        executeExtract(undefined, trimmed);
      }
    } catch {
      setShowPasteMode(true);
      setError('Clipboard permission not granted. Please paste text directly into the description box.');
    }
  };

  const handleAddRequirement = () => {
    if (newReqInput.trim()) {
      setRequirements([...requirements, newReqInput.trim()]);
      setNewReqInput('');
    }
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) {
      setError('Company name and role are required.');
      return;
    }

    const newApp: JobApplication = {
      id: `app-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      company: company.trim(),
      role: role.trim(),
      url: url.trim(),
      status,
      salaryMin: typeof salaryMin === 'number' ? salaryMin : undefined,
      salaryMax: typeof salaryMax === 'number' ? salaryMax : undefined,
      salaryCurrency,
      location: location.trim(),
      jobType,
      requirements,
      description: description.trim(),
      rawDescription: rawDescription.trim() || undefined,
      appliedDate: status !== 'wishlist' ? appliedDate : undefined,
      linkedProfileId: selectedProfileId || undefined,
      linkedResumeVersionId: selectedResumeVersionId || undefined,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newApp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl my-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Add New Job Application</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Paste a job link to auto-extract role details, requirements, and salary.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Extraction Bar */}
        <div className="p-6 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
          {!showPasteMode ? (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Job Posting URL
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste job URL from Microsoft, Workday, Greenhouse, Lever, LinkedIn, etc."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAutoExtract();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xs transition-colors shrink-0 disabled:opacity-50"
                  title="Paste link or text from clipboard and auto-extract"
                >
                  <Clipboard className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden sm:inline">Paste Clipboard</span>
                  <span className="sm:hidden">Paste</span>
                </button>
                <button
                  type="button"
                  onClick={handleAutoExtract}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-lg shadow-xs transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Extracting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Auto-Extract</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400 text-[11px]">
                  Universal SPA reader: extracts company, title, requirements, salary &amp; rich text
                </span>
                <button
                  type="button"
                  onClick={() => setShowPasteMode(true)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Or paste raw job text
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Paste Job Description Text (Rich-Text preserved)
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasteMode(false)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Back to URL input
                </button>
              </div>
              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste the full job posting text or markdown here (bullet lists, indentation, and qualifications will be preserved)..."
                className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  <Clipboard className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Paste from Clipboard</span>
                </button>
                <button
                  type="button"
                  onClick={handleAutoExtract}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Parse Text &amp; Extract</span>
                </button>
              </div>
            </div>
          )}

          {fallbackNotice && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <p className="leading-relaxed">{fallbackNotice}</p>
              </div>
              <button
                type="button"
                onClick={handleAutoExtract}
                disabled={isLoading}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 rounded border border-amber-300 dark:border-amber-700 transition-colors shrink-0"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Retry AI</span>
              </button>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-2 text-rose-800 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <p className="leading-relaxed">{error}</p>
              </div>
              <button
                type="button"
                onClick={handleAutoExtract}
                disabled={isLoading}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-800 dark:text-rose-200 bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 rounded border border-rose-300 dark:border-rose-700 transition-colors shrink-0"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Retry</span>
              </button>
            </div>
          )}
        </div>

        {/* Application Details Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[58vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Stripe, Linear"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Role / Title *
              </label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Staff Frontend Engineer"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Pipeline Stage
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="wishlist">Wishlist / Bookmarked</option>
                <option value="applied">Applied</option>
                <option value="screening">Phone Screen</option>
                <option value="interview">Interview Rounds</option>
                <option value="offer">Offer Received</option>
                <option value="rejected">Archived / Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Workplace Type
              </label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value as JobType)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-Site</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco or Remote, US"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Compensation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Min Salary
              </label>
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 180000"
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Salary
              </label>
              <input
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 230000"
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Currency
              </label>
              <input
                type="text"
                value={salaryCurrency}
                onChange={(e) => setSalaryCurrency(e.target.value.toUpperCase())}
                placeholder="USD"
                maxLength={4}
                className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Linked Profile & Resume Version */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50">
            <div>
              <label className="block text-xs font-medium text-indigo-950 dark:text-indigo-200 mb-1">
                Target Job Profile
              </label>
              <select
                value={selectedProfileId}
                onChange={(e) => handleProfileChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                {profiles.length > 0 ? (
                  profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                ) : (
                  <option value="">No profile created yet (optional)</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-indigo-950 dark:text-indigo-200 mb-1">
                Linked Resume Version
              </label>
              <select
                value={selectedResumeVersionId}
                onChange={(e) => setSelectedResumeVersionId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              >
                {currentProfile?.resumeVersions && currentProfile.resumeVersions.length > 0 ? (
                  currentProfile.resumeVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.versionName}
                    </option>
                  ))
                ) : (
                  <option value="">No resume version</option>
                )}
              </select>
            </div>
          </div>

          {/* Key Requirements List */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Extracted Requirements & Skills ({requirements.length})
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {requirements.map((req, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 p-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                >
                  <span className="text-slate-700 dark:text-slate-300 truncate">{req}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRequirement(i)}
                    className="text-slate-400 hover:text-rose-500 shrink-0 p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newReqInput}
                onChange={(e) => setNewReqInput(e.target.value)}
                placeholder="Add custom qualification requirement..."
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRequirement();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddRequirement}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Staged Rich-Text Buffer Preview */}
          {rawDescription && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-100/70 dark:bg-slate-800/80 border-b border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Buffered Rich-Text Job Description (HTML with preserved lists & indents)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRawBuffer(!showRawBuffer)}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  {showRawBuffer ? 'Hide Preview' : 'Preview Staged Rich Text'}
                </button>
              </div>
              {showRawBuffer && (
                <div className="p-3 max-h-52 overflow-y-auto bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  <div
                    className="job-rich-content"
                    dangerouslySetInnerHTML={{ __html: rawDescription }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Personal Application Notes & Next Steps
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Applied via employee referral. Recruiter reached out via email."
              className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-lg shadow-xs transition-colors"
          >
            <span>Save to Pipeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
