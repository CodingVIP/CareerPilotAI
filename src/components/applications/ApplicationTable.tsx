import React, { useState } from 'react';
import {
  ArrowUpDown,
  Building,
  Target,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { JobApplication, ApplicationStatus } from '../../types/job';

interface ApplicationTableProps {
  applications: JobApplication[];
  onSelectApplication: (app: JobApplication) => void;
  onMoveStage: (id: string, newStatus: ApplicationStatus) => void;
  onRunAts: (app: JobApplication) => void;
  onRunInterview: (app: JobApplication) => void;
}

type SortField = 'company' | 'role' | 'salary' | 'date' | 'status';

export const ApplicationTable: React.FC<ApplicationTableProps> = ({
  applications,
  onSelectApplication,
  onMoveStage,
  onRunAts,
  onRunInterview,
}) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedApplications = [...applications].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'company') {
      comparison = a.company.localeCompare(b.company);
    } else if (sortField === 'role') {
      comparison = a.role.localeCompare(b.role);
    } else if (sortField === 'salary') {
      const aSal = a.salaryMax || a.salaryMin || 0;
      const bSal = b.salaryMax || b.salaryMin || 0;
      comparison = aSal - bSal;
    } else if (sortField === 'date') {
      const aDate = a.appliedDate || a.createdAt;
      const bDate = b.appliedDate || b.createdAt;
      comparison = aDate.localeCompare(bDate);
    } else if (sortField === 'status') {
      comparison = a.status.localeCompare(b.status);
    }
    return sortAsc ? comparison : -comparison;
  });

  const statusLabels: Record<ApplicationStatus, { label: string; textClass: string }> = {
    wishlist: { label: 'Wishlist', textClass: 'text-slate-500' },
    applied: { label: 'Applied', textClass: 'text-sky-600 dark:text-sky-400' },
    screening: { label: 'Phone Screen', textClass: 'text-indigo-600 dark:text-indigo-400' },
    interview: { label: 'Interview', textClass: 'text-amber-600 dark:text-amber-400 font-semibold' },
    offer: { label: 'Offer', textClass: 'text-emerald-600 dark:text-emerald-400 font-bold' },
    rejected: { label: 'Archived', textClass: 'text-slate-400' },
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 select-none">
              <th
                onClick={() => handleSort('company')}
                className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
              >
                <div className="flex items-center gap-1.5">
                  <span>Company & Role</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('status')}
                className="py-3 px-3 font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
              >
                <div className="flex items-center gap-1.5">
                  <span>Stage</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-3 px-3 font-semibold">Location / Type</th>

              <th
                onClick={() => handleSort('salary')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Compensation</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('date')}
                className="py-3 px-3 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-slate-200"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Date</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-3 px-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {sortedApplications.map((app) => (
              <tr
                key={app.id}
                onClick={() => onSelectApplication(app)}
                className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer h-12"
              >
                {/* Company & Role */}
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300 font-bold text-xs">
                      {app.company.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                        <span>{app.role}</span>
                        {app.url && (
                          <a
                            href={app.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-opacity"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block truncate">
                        {app.company}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Stage */}
                <td className="py-2.5 px-3">
                  <select
                    value={app.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onMoveStage(app.id, e.target.value as ApplicationStatus)}
                    className={`text-xs font-medium bg-transparent border-0 focus:ring-1 focus:ring-indigo-500 rounded p-1 cursor-pointer ${
                      statusLabels[app.status]?.textClass || ''
                    }`}
                  >
                    <option value="wishlist">Wishlist</option>
                    <option value="applied">Applied</option>
                    <option value="screening">Phone Screen</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Archived</option>
                  </select>
                </td>

                {/* Location / Type */}
                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                  <div className="truncate max-w-[150px]">{app.location}</div>
                  <span className="text-[11px] text-slate-400 capitalize">{app.jobType}</span>
                </td>

                {/* Compensation */}
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200 font-medium">
                  {app.salaryMin || app.salaryMax ? (
                    <>
                      {app.salaryMin ? `${(app.salaryMin / 1000).toFixed(0)}k` : ''}
                      {app.salaryMin && app.salaryMax ? ' - ' : ''}
                      {app.salaryMax ? `${(app.salaryMax / 1000).toFixed(0)}k` : ''} {app.salaryCurrency}
                    </>
                  ) : (
                    <span className="text-slate-400 font-sans text-[11px]">—</span>
                  )}
                </td>

                {/* Date */}
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                  {app.appliedDate || app.createdAt.slice(0, 10)}
                </td>

                {/* Actions */}
                <td className="py-2.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onRunAts(app)}
                      title="Run ATS Match"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                    >
                      <Target className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRunInterview(app)}
                      title="Interview Dossier"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onSelectApplication(app)}
                      title="View Details"
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
