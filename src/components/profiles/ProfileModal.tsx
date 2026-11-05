import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { JobProfile } from '../../types/job';
import { Dialog } from '../common/Dialog';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: JobProfile) => void;
  initialProfile?: JobProfile | null;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProfile,
}) => {
  const [name, setName] = useState(initialProfile?.name || '');
  const [targetRole, setTargetRole] = useState(initialProfile?.targetRole || '');
  const [summary, setSummary] = useState(initialProfile?.summary || '');
  const [skills, setSkills] = useState<string[]>(initialProfile?.skills || []);
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    setName(initialProfile?.name || '');
    setTargetRole(initialProfile?.targetRole || '');
    setSummary(initialProfile?.summary || '');
    setSkills(initialProfile?.skills || []);
    setNewSkill('');
  }, [initialProfile, isOpen]);

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const profileToSave: JobProfile = {
      id: initialProfile?.id || `prof-${Date.now()}`,
      name: name.trim(),
      targetRole: targetRole.trim(),
      summary: summary.trim(),
      skills,
      resumeVersions: initialProfile?.resumeVersions || [],
      createdAt: initialProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(profileToSave);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} title={initialProfile ? 'Edit Job Profile' : 'Create New Job Profile'} onClose={onClose} showCloseButton={false} className="max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 id="profile-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {initialProfile ? 'Edit Job Profile' : 'Create New Job Profile'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close profile dialog"
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Profile Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Senior Frontend Specialist or Full-Stack Lead"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Target Role Description
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Staff / Senior Frontend Engineer"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Career Narrative / Pitch Summary
            </label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief overview of experience, focus, and seniority tier..."
              className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Primary Skills & Technologies
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {skills.map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700"
                >
                  <span>{s}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(s)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add skill tag (e.g. Next.js, Kubernetes)..."
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              {initialProfile ? 'Update Profile' : 'Create Profile'}
            </button>
          </div>
        </form>
    </Dialog>
  );
};
