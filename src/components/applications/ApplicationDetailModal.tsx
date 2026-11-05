import React, { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  Calendar,
  DollarSign,
  MapPin,
  Building,
  Target,
  Sparkles,
  Edit2,
  Trash2,
  Check,
  Copy,
  FileText,
} from 'lucide-react';
import { JobApplication, JobProfile, ApplicationStatus, JobType } from '../../types/job';
import confetti from 'canvas-confetti';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

interface ApplicationDetailModalProps {
  application: JobApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (app: JobApplication) => void;
  onDelete: (id: string) => void;
  profiles: JobProfile[];
  onGoToAtsMatch: (app: JobApplication) => void;
  onGoToInterviewPrep: (app: JobApplication) => void;
}

export const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  application,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  profiles,
  onGoToAtsMatch,
  onGoToInterviewPrep,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'richPosting'>('overview');
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [formData, setFormData] = useState<JobApplication>(
    application || {
      id: '',
      company: '',
      role: '',
      url: '',
      status: 'wishlist',
      salaryCurrency: 'USD',
      location: '',
      jobType: 'remote',
      requirements: [],
      description: '',
      notes: '',
      createdAt: '',
      updatedAt: '',
    }
  );

  useEffect(() => {
    if (application && isOpen) {
      setFormData(application);
      setIsEditing(false);
      setIsConfirmingDelete(false);
      setActiveTab('overview');
    }
  }, [application, isOpen]);

  const handleCopyRaw = () => {
    const content = formData.rawDescription || formData.description || '';
    const temp = document.createElement('div');
    temp.innerHTML = sanitizeHtml(content);
    navigator.clipboard
      .writeText(temp.innerText || content)
      .then(() => setCopiedRaw(true))
      .catch(() => setCopiedRaw(false));
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const linkedProfile = profiles.find((p) => p.id === formData.linkedProfileId);
  const linkedResume = linkedProfile?.resumeVersions.find(
    (v) => v.id === formData.linkedResumeVersionId
  );

  const handleStatusChange = (newStatus: ApplicationStatus) => {
    const updated = {
      ...formData,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      appliedDate:
        newStatus !== 'wishlist' && !formData.appliedDate
          ? new Date().toISOString().slice(0, 10)
          : formData.appliedDate,
    };
    setFormData(updated);
    onUpdate(updated);

    if (newStatus === 'offer') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    setIsEditing(false);
  };

  if (!isOpen || !application) return null;

  const handlePerformDelete = () => {
    onDelete(application.id);
    onClose();
  };

  const statuses: { id: ApplicationStatus; label: string }[] = [
    { id: 'wishlist', label: 'Wishlist' },
    { id: 'applied', label: 'Applied' },
    { id: 'screening', label: 'Phone Screen' },
    { id: 'interview', label: 'Interview' },
    { id: 'offer', label: 'Offer' },
    { id: 'rejected', label: 'Archived' },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="application-detail-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Building className="w-3.5 h-3.5" />
                {application.company}
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {application.location}
              </span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{application.jobType}</span>
            </div>
            <h2 id="application-detail-title" className="text-xl font-bold text-slate-900 dark:text-slate-100">{application.role}</h2>
          </div>

          <div className="flex items-center gap-2">
            {application.url && (
              <a
                href={application.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Open original job posting"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isEditing ? 'Cancel editing' : 'Edit details'}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            {isConfirmingDelete ? (
              <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 px-2 py-1 rounded-lg">
                <span className="text-[11px] font-medium text-rose-700 dark:text-rose-300">Delete app?</span>
                <button
                  type="button"
                  onClick={handlePerformDelete}
                  className="px-2 py-0.5 text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-1.5 py-0.5 text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Delete application"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pipeline Stage Transition Strip */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 overflow-x-auto">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Stage Pipeline:</span>
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {statuses.map((s) => {
              const isCurrent = formData.status === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleStatusChange(s.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    isCurrent
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Quick Tools Banner */}
        <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 bg-indigo-50/40 dark:bg-indigo-950/20">
          <button
            onClick={() => {
              onGoToAtsMatch(application);
              onClose();
            }}
            className="flex items-center justify-center gap-2 py-3 px-4 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/40 dark:hover:bg-indigo-900/30 transition-colors"
          >
            <Target className="w-4 h-4" />
            <span>Run ATS Keyword Audit</span>
          </button>
          <button
            onClick={() => {
              onGoToInterviewPrep(application);
              onClose();
            }}
            className="flex items-center justify-center gap-2 py-3 px-4 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/40 dark:hover:bg-indigo-900/30 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Company Interview Intelligence</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        {!isEditing && (
          <div className="flex items-center gap-2 px-6 pt-2 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Overview & Requirements</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('richPosting')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'richPosting'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Original Job Posting (Rich Text)</span>
            </button>
          </div>
        )}

        {/* Main Content Body */}
        <div className="p-6 max-h-[55vh] overflow-y-auto space-y-6 text-xs text-slate-600 dark:text-slate-400">
          {!isEditing ? (
            activeTab === 'overview' ? (
              <>
                {/* Key Attributes Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                      Compensation
                    </span>
                    <span className="font-mono tabular-nums text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">
                      {application.salaryMin || application.salaryMax ? (
                        <>
                          {application.salaryMin
                            ? `${application.salaryCurrency} ${application.salaryMin.toLocaleString()}`
                            : ''}
                          {application.salaryMin && application.salaryMax ? ' – ' : ''}
                          {application.salaryMax
                            ? `${!application.salaryMin ? application.salaryCurrency + ' ' : ''}${application.salaryMax.toLocaleString()}`
                            : ''}
                        </>
                      ) : (
                        'Undisclosed'
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                      Applied Date
                    </span>
                    <span className="font-mono tabular-nums text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">
                      {application.appliedDate || 'Not applied yet'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                      Linked Profile
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block truncate">
                      {linkedProfile?.name || 'General Profile'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                      Resume Version
                    </span>
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5 block truncate">
                      {linkedResume?.versionName || 'Default Resume'}
                    </span>
                  </div>
                </div>

                {/* Requirements & Skills */}
                {application.requirements.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-2">
                      Key Job Requirements ({application.requirements.length})
                    </h3>
                    <div className="space-y-1.5">
                      {application.requirements.map((req, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                        >
                          <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Role Overview & Benefits */}
                {application.description && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-2">
                      Role Overview & Benefits Package
                    </h3>
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">
                      {application.description}
                    </div>
                  </div>
                )}

                {/* Notes & Contacts */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-2">
                    Application Log & Contacts
                  </h3>
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    {(application.contactName || application.contactEmail) && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-700">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">Recruiter / Contact: </span>
                        <span>
                          {application.contactName} {application.contactEmail ? `(${application.contactEmail})` : ''}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {application.notes || 'No custom notes recorded yet.'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              /* Rich-Text Original Employer Listing */
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                      Employer Job Description (Rich-Text HTML)
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Preserved bullet lists, numbered qualifications, and section indentation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyRaw}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                  >
                    {copiedRaw ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 max-h-[46vh] overflow-y-auto">
                  <div
                    className="job-rich-content"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(
                        application.rawDescription ||
                          application.description ||
                          '<p>No description text available.</p>'
                      ),
                    }}
                  />
                </div>
              </div>
            )
          ) : (
            /* Editing Form */
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Role Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Job Type
                  </label>
                  <select
                    value={formData.jobType}
                    onChange={(e) => setFormData({ ...formData, jobType: e.target.value as JobType })}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  >
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-Site</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Applied Date
                  </label>
                  <input
                    type="date"
                    value={formData.appliedDate || ''}
                    onChange={(e) => setFormData({ ...formData, appliedDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Min Salary
                  </label>
                  <input
                    type="number"
                    value={formData.salaryMin || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, salaryMin: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Max Salary
                  </label>
                  <input
                    type="number"
                    value={formData.salaryMax || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, salaryMax: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={formData.salaryCurrency}
                    onChange={(e) => setFormData({ ...formData, salaryCurrency: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Posting URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Role Overview & Benefits Package
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Original Job Posting (Rich-Text HTML with lists and indents)
                </label>
                <textarea
                  rows={4}
                  value={formData.rawDescription || ''}
                  onChange={(e) => setFormData({ ...formData, rawDescription: e.target.value })}
                  placeholder="Paste or edit sanitized rich-text HTML..."
                  className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes & Status Updates
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-xs">
          <span className="text-slate-400 font-mono text-[11px]">
            Updated {new Date(application.updatedAt).toLocaleDateString()}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
