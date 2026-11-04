import React, { useState, useMemo } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Filter,
  Plus,
  Briefcase,
  DollarSign,
  TrendingUp,
  Award,
} from 'lucide-react';
import { JobApplication, JobProfile, ApplicationStatus, JobType } from '../../types/job';
import { KanbanBoard } from './KanbanBoard';
import { ApplicationTable } from './ApplicationTable';
import { AddApplicationModal } from './AddApplicationModal';
import { ApplicationDetailModal } from './ApplicationDetailModal';
import { EmptyState } from '../common/EmptyState';

interface ApplicationsViewProps {
  applications: JobApplication[];
  profiles: JobProfile[];
  activeProfileId: string;
  onAddApplication: (app: JobApplication) => void;
  onUpdateApplication: (app: JobApplication) => void;
  onDeleteApplication: (id: string) => void;
  onGoToAtsMatch: (app: JobApplication) => void;
  onGoToInterviewPrep: (app: JobApplication) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  profiles,
  activeProfileId,
  onAddApplication,
  onUpdateApplication,
  onDeleteApplication,
  onGoToAtsMatch,
  onGoToInterviewPrep,
  isAddModalOpen,
  setIsAddModalOpen,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedProfileFilter, setSelectedProfileFilter] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

  // Filtered applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesCompany = app.company.toLowerCase().includes(q);
        const matchesRole = app.role.toLowerCase().includes(q);
        const matchesLocation = app.location.toLowerCase().includes(q);
        const matchesReqs = app.requirements.some((r) => r.toLowerCase().includes(q));
        if (!matchesCompany && !matchesRole && !matchesLocation && !matchesReqs) return false;
      }

      // Stage
      if (stageFilter !== 'all' && app.status !== stageFilter) return false;

      // Type
      if (typeFilter !== 'all' && app.jobType !== typeFilter) return false;

      // Profile
      if (selectedProfileFilter !== 'all' && app.linkedProfileId !== selectedProfileFilter) {
        return false;
      }

      return true;
    });
  }, [applications, searchQuery, stageFilter, typeFilter, selectedProfileFilter]);

  // High-level pipeline metrics
  const activeCount = applications.filter((a) => a.status !== 'rejected').length;
  const interviewingCount = applications.filter((a) => a.status === 'interview').length;
  const offersCount = applications.filter((a) => a.status === 'offer').length;

  const medianSalary = useMemo(() => {
    const salaries = applications
      .map((a) => a.salaryMax || a.salaryMin)
      .filter((s): s is number => typeof s === 'number' && s > 0);
    if (salaries.length === 0) return null;
    const avg = salaries.reduce((acc, curr) => acc + curr, 0) / salaries.length;
    return Math.round(avg / 1000);
  }, [applications]);

  return (
    <div className="space-y-6">
      {/* Metric Cards Banner (KPI row) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Active Pipeline</span>
            <Briefcase className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {activeCount}
            </span>
            <span className="text-xs text-slate-500">jobs tracked</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">In Interview</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {interviewingCount}
            </span>
            <span className="text-xs text-slate-500">active rounds</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Offers Received</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {offersCount}
            </span>
            <span className="text-xs text-slate-500">celebrated</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Target Compensation</span>
            <DollarSign className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
              {medianSalary ? `$${medianSalary}k` : '—'}
            </span>
            <span className="text-xs text-slate-500">avg base</span>
          </div>
        </div>
      </div>

      {/* Control Strip & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, role, requirements, or location..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* View Mode & Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Target Profile Filter */}
          <select
            value={selectedProfileFilter}
            onChange={(e) => setSelectedProfileFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Job Profiles</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Workplace Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="remote">Remote Only</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-Site</option>
          </select>

          {/* Kanban / Table Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
              title="Kanban Board view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
              title="Data Table view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredApps.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="w-6 h-6" />}
          title="No applications match your criteria"
          description={
            searchQuery || stageFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your search keywords or clearing active filters.'
              : 'Start tracking jobs by entering a job posting link.'
          }
          actionLabel="Add New Application"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          applications={filteredApps}
          onSelectApplication={(app) => setSelectedApp(app)}
          onMoveStage={(id, newStatus) => {
            const target = applications.find((a) => a.id === id);
            if (target) {
              onUpdateApplication({ ...target, status: newStatus });
            }
          }}
          onRunAts={onGoToAtsMatch}
          onRunInterview={onGoToInterviewPrep}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />
      ) : (
        <ApplicationTable
          applications={filteredApps}
          onSelectApplication={(app) => setSelectedApp(app)}
          onMoveStage={(id, newStatus) => {
            const target = applications.find((a) => a.id === id);
            if (target) {
              onUpdateApplication({ ...target, status: newStatus });
            }
          }}
          onRunAts={onGoToAtsMatch}
          onRunInterview={onGoToInterviewPrep}
        />
      )}

      {/* Modals */}
      <AddApplicationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={onAddApplication}
        profiles={profiles}
        activeProfileId={activeProfileId}
      />

      <ApplicationDetailModal
        application={selectedApp}
        isOpen={selectedApp !== null}
        onClose={() => setSelectedApp(null)}
        onUpdate={(updated) => {
          onUpdateApplication(updated);
          setSelectedApp(updated);
        }}
        onDelete={onDeleteApplication}
        profiles={profiles}
        onGoToAtsMatch={onGoToAtsMatch}
        onGoToInterviewPrep={onGoToInterviewPrep}
      />
    </div>
  );
};
