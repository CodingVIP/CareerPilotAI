import React, { useState } from 'react';
import { Briefcase, FileText, Target, Sparkles, Plus, Shield, Menu, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { PrivacyModal } from './PrivacyModal';
import { UserPrivacySettings } from '../../types/job';

export type NavTab = 'applications' | 'profiles' | 'ats' | 'interview';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAddModal: () => void;
  applicationCount: number;
  privacy: UserPrivacySettings;
  onUpdatePrivacy: (settings: UserPrivacySettings) => void;
  onDataRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAddModal,
  applicationCount,
  privacy,
  onUpdatePrivacy,
  onDataRefresh,
}) => {
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'applications',
      label: 'Applications',
      icon: <Briefcase className="w-4 h-4" />,
      badge: applicationCount,
    },
    {
      id: 'profiles',
      label: 'Profiles & Resumes',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'ats',
      label: 'ATS Keyword Match',
      icon: <Target className="w-4 h-4" />,
    },
    {
      id: 'interview',
      label: 'Interview Prep',
      icon: <Sparkles className="w-4 h-4" />,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-8 h-16">
            {/* Zone 1: Single text wordmark */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                CP
              </div>
              <button
                onClick={() => onSelectTab('applications')}
                className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap hover:opacity-90 transition-opacity"
              >
                CareerPilot
              </button>
            </div>

            {/* Zone 2: 4 clean single-line navigation links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="font-mono text-xs tabular-nums px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: 1 primary action + tools */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => setIsPrivacyOpen(true)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Privacy & Cloud Synchronization"
                aria-label="Privacy settings"
              >
                <Shield className="w-4 h-4" />
              </button>

              <ThemeToggle />

              <button
                onClick={onOpenAddModal}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Application</span>
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-2 pb-3 space-y-1 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {typeof item.badge === 'number' && (
                    <span className="font-mono text-xs tabular-nums text-slate-500">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        privacy={privacy}
        onUpdatePrivacy={onUpdatePrivacy}
        onDataImported={onDataRefresh}
      />
    </>
  );
};
