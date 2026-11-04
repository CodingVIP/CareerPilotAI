import React from 'react';
import { Building, MapPin, Target, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { JobApplication, ApplicationStatus } from '../../types/job';

interface ApplicationCardProps {
  application: JobApplication;
  onSelect: (app: JobApplication) => void;
  onMoveStage: (id: string, newStatus: ApplicationStatus) => void;
  onRunAts: (app: JobApplication) => void;
  onRunInterview: (app: JobApplication) => void;
  onDragStart?: (e: React.DragEvent, id: string) => void;
}

const STAGES: ApplicationStatus[] = ['wishlist', 'applied', 'screening', 'interview', 'offer', 'rejected'];

export const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  onSelect,
  onMoveStage,
  onRunAts,
  onRunInterview,
  onDragStart,
}) => {
  const currentIndex = STAGES.indexOf(application.status);
  const canMoveLeft = currentIndex > 0;
  const canMoveRight = currentIndex < STAGES.length - 1;

  const handleLeft = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canMoveLeft) {
      onMoveStage(application.id, STAGES[currentIndex - 1]);
    }
  };

  const handleRight = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canMoveRight) {
      onMoveStage(application.id, STAGES[currentIndex + 1]);
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, application.id)}
      onClick={() => onSelect(application)}
      className="group relative p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all cursor-pointer select-none"
    >
      {/* Top Company & Meta */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
          <Building className="w-3.5 h-3.5 text-slate-400" />
          {application.company}
        </span>
        <span className="capitalize text-[11px] font-medium">{application.jobType}</span>
      </div>

      {/* Role Title */}
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
        {application.role}
      </h4>

      {/* Zero-Pill Unboxed Metadata with Typographic Separator */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
        <span className="truncate flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-400" />
          {application.location}
        </span>
        {application.appliedDate && (
          <>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-[11px] shrink-0">{application.appliedDate}</span>
          </>
        )}
      </div>

      {/* Compensation Strip */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <span className="font-mono tabular-nums text-xs font-semibold text-slate-800 dark:text-slate-200">
          {application.salaryMin || application.salaryMax ? (
            <>
              {application.salaryMin ? `${(application.salaryMin / 1000).toFixed(0)}k` : ''}
              {application.salaryMin && application.salaryMax ? ' - ' : ''}
              {application.salaryMax ? `${(application.salaryMax / 1000).toFixed(0)}k` : ''}{' '}
              {application.salaryCurrency}
            </>
          ) : (
            <span className="font-sans font-normal text-slate-400 text-[11px]">Salary unlisted</span>
          )}
        </span>

        {/* Action icons */}
        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRunAts(application);
            }}
            title="Run ATS match"
            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <Target className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRunInterview(application);
            }}
            title="Interview intelligence"
            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Move stage buttons on hover */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-1">
        {canMoveLeft ? (
          <button
            onClick={handleLeft}
            className="flex items-center gap-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
            title={`Move back to ${STAGES[currentIndex - 1]}`}
          >
            <ChevronLeft className="w-3 h-3" />
            <span className="capitalize">{STAGES[currentIndex - 1]}</span>
          </button>
        ) : (
          <span />
        )}

        {canMoveRight && (
          <button
            onClick={handleRight}
            className="flex items-center gap-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium ml-auto"
            title={`Advance to ${STAGES[currentIndex + 1]}`}
          >
            <span className="capitalize">{STAGES[currentIndex + 1]}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
