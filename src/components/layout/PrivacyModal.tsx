import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, Download, Upload, RefreshCw, CheckCircle2, Lock } from 'lucide-react';
import { UserPrivacySettings } from '../../types/job';
import { storageService } from '../../services/storage';
import { getCloudSnapshot } from '../../services/auth';
import { syncService } from '../../services/sync';
import { Dialog } from '../common/Dialog';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  privacy: UserPrivacySettings;
  onUpdatePrivacy: (settings: UserPrivacySettings) => void;
  onDataImported: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({
  isOpen,
  onClose,
  privacy,
  onUpdatePrivacy,
  onDataImported,
}) => {
  const [settings, setSettings] = useState<UserPrivacySettings>(privacy);
  const [syncStatus, setSyncStatus] = useState<string>('Local browser storage');
  const [isExporting, setIsExporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);

  useEffect(() => {
    setSettings(privacy);
    setPendingCount(syncService.getPending().length);
    setConflictCount(syncService.getConflicts().length);
  }, [privacy, isOpen]);

  const handleToggleSync = () => {
    const updated = {
      ...settings,
      cloudSyncEnabled: !settings.cloudSyncEnabled,
      lastSyncedAt: settings.cloudSyncEnabled ? settings.lastSyncedAt : undefined,
    };
    setSettings(updated);
    onUpdatePrivacy(updated);
    setSyncStatus(updated.cloudSyncEnabled ? 'Cloud sync is not configured' : 'Local browser storage');
  };

  const handleToggleEncryption = () => {
    const updated = {
      ...settings,
      encryptLocalData: !settings.encryptLocalData,
    };
    setSettings(updated);
    onUpdatePrivacy(updated);
  };

  const handleExport = () => {
    setIsExporting(true);
    const jsonStr = storageService.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `careerpilot-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsExporting(false);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = storageService.importData(content);
      if (success) {
        setImportMessage('Data backup successfully restored.');
        onDataImported();
        setTimeout(() => setImportMessage(null), 3500);
      } else {
        setImportMessage('Error restoring file. Ensure it is a valid CareerPilot backup JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteReset = () => {
    storageService.resetToDefaults();
    onDataImported();
    onClose();
  };

  const handleLoadCloud = async () => {
    if (!window.confirm('Replace local data with the latest cloud snapshot? Export a backup first if you need to keep local-only changes.')) return;
    setIsLoadingCloud(true);
    setImportMessage(null);
    try {
      const snapshot = await getCloudSnapshot();
      const counts = storageService.importCloudSnapshot(snapshot);
      onDataImported();
      setImportMessage(
        `Loaded ${counts.applications} application${counts.applications === 1 ? '' : 's'}, ${counts.profiles} profile${counts.profiles === 1 ? '' : 's'}, and ${counts.resumes} resume${counts.resumes === 1 ? '' : 's'} from cloud.`,
      );
    } catch (error: unknown) {
      setImportMessage(error instanceof Error ? error.message : 'Unable to load cloud data.');
    } finally {
      setIsLoadingCloud(false);
    }
  };

  const handleSyncNow = async () => {
    if (!navigator.onLine) {
      setImportMessage('You are offline. Changes will synchronize when connectivity returns.');
      return;
    }
    setIsSyncing(true);
    setImportMessage(null);
    try {
      const result = await syncService.flush();
      const syncedAt = result.applied > 0 ? new Date().toISOString() : settings.lastSyncedAt;
      const updated = { ...settings, lastSyncedAt: syncedAt };
      setSettings(updated);
      onUpdatePrivacy(updated);
      setPendingCount(syncService.getPending().length);
      setConflictCount(syncService.getConflicts().length);
      setImportMessage(
        result.conflicts
          ? `${result.applied} change${result.applied === 1 ? '' : 's'} synchronized; ${result.conflicts} conflict${result.conflicts === 1 ? '' : 's'} need review.`
          : result.applied
            ? `${result.applied} local change${result.applied === 1 ? '' : 's'} synchronized.`
            : 'No pending local changes to synchronize.',
      );
    } catch (error: unknown) {
      setImportMessage(error instanceof Error ? error.message : 'Unable to synchronize local changes.');
      setPendingCount(syncService.getPending().length);
      setConflictCount(syncService.getConflicts().length);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} title="Privacy Controls and Data Synchronization" onClose={onClose} className="max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Privacy Controls & Data Synchronization
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm text-slate-600 dark:text-slate-400">
          {/* Cloud Sync Status */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    settings.cloudSyncEnabled ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {settings.cloudSyncEnabled ? 'Cloud Sync Enabled (not configured)' : 'Local Storage Only'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {settings.lastSyncedAt
                  ? `Last synchronized: ${new Date(settings.lastSyncedAt).toLocaleTimeString()}`
                  : syncStatus}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pendingCount} pending · {conflictCount} conflict{conflictCount === 1 ? '' : 's'}
              </p>
            </div>
            <button
              onClick={handleToggleSync}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                settings.cloudSyncEnabled
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
              }`}
            >
              {settings.cloudSyncEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Privacy Toggles */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Lock className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-slate-200">Local-First Storage Encryption</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This toggle records your preference; localStorage is not encrypted by this application.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.encryptLocalData}
                onChange={handleToggleEncryption}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Import / Export */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Data Sovereignty & Portability
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" />
                Export JSON Backup
              </button>

              <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4 text-slate-500" />
                Import JSON Backup
                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              </label>
            </div>
            {settings.cloudSyncEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => void handleSyncNow()}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-950/50 disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing…' : 'Sync pending changes'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleLoadCloud()}
                  disabled={isLoadingCloud}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
                  {isLoadingCloud ? 'Loading…' : 'Load cloud data'}
                </button>
              </div>
            )}

            {importMessage && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{importMessage}</span>
              </div>
            )}
          </div>

          {/* Reset */}
          <div className="pt-2 flex justify-between items-center text-xs">
            {isConfirmingReset ? (
              <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 px-2.5 py-1 rounded-lg">
                <span className="text-[11px] font-medium text-rose-700 dark:text-rose-300">Reset all data?</span>
                <button
                  type="button"
                  onClick={handleExecuteReset}
                  className="px-2 py-0.5 text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingReset(false)}
                  className="px-1.5 py-0.5 text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingReset(true)}
                className="text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset to Starter Data
              </button>
            )}
            <span className="text-slate-400 font-mono text-[11px]">v1.0.0 Production</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
    </Dialog>
  );
};
