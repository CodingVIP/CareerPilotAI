import React from 'react';
import { AlertTriangle, RefreshCw, Trash2, X } from 'lucide-react';
import { PendingSyncOperation } from '../../services/sync';

interface SyncConflictPanelProps {
  conflicts: PendingSyncOperation[];
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
  onClose: () => void;
}

export const SyncConflictPanel: React.FC<SyncConflictPanelProps> = ({
  conflicts,
  onRetry,
  onDiscard,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="sync-conflicts-title">
    <div className="w-full max-w-lg rounded-xl border border-amber-200 bg-white shadow-xl dark:border-amber-900 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 id="sync-conflicts-title" className="font-semibold">Sync conflicts</h2>
        </div>
        <button onClick={onClose} aria-label="Close sync conflicts" className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[60vh] space-y-3 overflow-y-auto p-5">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          These local changes were not applied because newer cloud data exists. Retry after reviewing the cloud record, or discard the local change.
        </p>
        {conflicts.map((conflict) => (
          <div key={conflict.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{conflict.entityType} · {conflict.entityId}</p>
                <p className="text-xs text-slate-500">{new Date(conflict.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onRetry(conflict.id)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
                <button onClick={() => onDiscard(conflict.id)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                  <Trash2 className="h-3 w-3" /> Discard
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
