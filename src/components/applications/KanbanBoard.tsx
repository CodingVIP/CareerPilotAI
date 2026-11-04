import React, { useState } from 'react';
import { JobApplication, ApplicationStatus } from '../../types/job';
import { ApplicationCard } from './ApplicationCard';
import { Plus } from 'lucide-react';

interface KanbanBoardProps {
  applications: JobApplication[];
  onSelectApplication: (app: JobApplication) => void;
  onMoveStage: (id: string, newStatus: ApplicationStatus) => void;
  onRunAts: (app: JobApplication) => void;
  onRunInterview: (app: JobApplication) => void;
  onOpenAddModal: () => void;
}

interface ColumnDef {
  id: ApplicationStatus;
  title: string;
  accentColor: string;
}

const COLUMNS: ColumnDef[] = [
  { id: 'wishlist', title: 'Wishlist', accentColor: 'bg-slate-400' },
  { id: 'applied', title: 'Applied', accentColor: 'bg-sky-500' },
  { id: 'screening', title: 'Phone Screen', accentColor: 'bg-indigo-500' },
  { id: 'interview', title: 'Interviewing', accentColor: 'bg-amber-500' },
  { id: 'offer', title: 'Offer Received', accentColor: 'bg-emerald-500' },
  { id: 'rejected', title: 'Archived', accentColor: 'bg-slate-300 dark:bg-slate-700' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  applications,
  onSelectApplication,
  onMoveStage,
  onRunAts,
  onRunInterview,
  onOpenAddModal,
}) => {
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ApplicationStatus | null>(null);

  const handleDragStart = (_e: React.DragEvent, id: string) => {
    setDraggedAppId(id);
  };

  const handleDragOver = (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDrop = (e: React.DragEvent, status: ApplicationStatus) => {
    e.preventDefault();
    if (draggedAppId) {
      onMoveStage(draggedAppId, status);
      setDraggedAppId(null);
      setDragOverColumn(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start pb-8">
      {COLUMNS.map((col) => {
        const columnApps = applications.filter((app) => app.status === col.id);
        const isTarget = dragOverColumn === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={(e) => handleDrop(e, col.id)}
            className={`flex flex-col min-h-[580px] rounded-xl p-3 bg-slate-100/70 dark:bg-slate-900/40 border transition-all ${
              isTarget
                ? 'border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20'
                : 'border-slate-200/80 dark:border-slate-800'
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${col.accentColor}`} />
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  {col.title}
                </h3>
              </div>
              <span className="font-mono tabular-nums text-xs font-medium text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {columnApps.length}
              </span>
            </div>

            {/* Column Cards */}
            <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5">
              {columnApps.map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onSelect={onSelectApplication}
                  onMoveStage={onMoveStage}
                  onRunAts={onRunAts}
                  onRunInterview={onRunInterview}
                  onDragStart={handleDragStart}
                />
              ))}

              {columnApps.length === 0 && (
                <div className="h-28 flex flex-col items-center justify-center text-center p-3 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl">
                  <p className="text-[11px] text-slate-400">No applications</p>
                </div>
              )}
            </div>

            {/* Quick add card button at bottom */}
            {col.id === 'wishlist' && (
              <button
                onClick={onOpenAddModal}
                className="mt-3 w-full py-2 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Quick Add</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
