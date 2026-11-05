export type ApplicationStatus =
  | 'wishlist'
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'rejected';

export type JobType = 'remote' | 'hybrid' | 'onsite';

export interface ResumeVersion {
  id: string;
  versionName: string; // e.g. "v1.2 Cloud Architecture"
  content: string; // Full text or markdown content
  tags: string[];
  isDefault: boolean;
  uploadedAt: string;
  wordCount?: number;
  fileName?: string;
  fileType?: 'pdf' | 'docx' | 'txt' | 'md';
  fileSize?: number;
  fileData?: string; // Base64 data URL for document download and preview
}

export interface JobProfile {
  id: string;
  name: string; // e.g. "Senior Frontend Engineer"
  targetRole: string;
  summary: string;
  skills: string[];
  resumeVersions: ResumeVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  url: string;
  status: ApplicationStatus;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  location: string;
  jobType: JobType;
  requirements: string[];
  description: string;
  rawDescription?: string; // Preserved sanitized rich-text HTML with lists and indents
  appliedDate?: string;
  linkedProfileId?: string;
  linkedResumeVersionId?: string;
  notes: string;
  contactName?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KeywordGap {
  keyword: string;
  importance: 'high' | 'medium' | 'low';
  category: 'hard-skill' | 'soft-skill' | 'tool' | 'certification';
  context: string;
}

export interface BulletSuggestion {
  originalBullet?: string;
  suggestedBullet: string;
  targetKeyword: string;
  rationale: string;
}

export interface KeywordAnalysisResult {
  score: number; // 0-100
  matchedKeywords: string[];
  missingKeywords: KeywordGap[];
  bulletSuggestions: BulletSuggestion[];
  strengths: string[];
  tailoringAdvice: string;
  analyzedAt: string;
}

export interface CandidateExperience {
  source: string;
  summary: string;
  difficulty?: string;
  roleRelevance: string;
  interviewFormat?: string;
}

export interface TechnicalQuestion {
  question: string;
  topic: string;
  importance: string;
  sampleAnswer: string;
}

export interface BehavioralQuestion {
  question: string;
  competency: string;
  starFramework: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
}

export interface InterviewPrepDossier {
  companyOverview: string;
  interviewStages: string[];
  pastCandidateExperiences: CandidateExperience[];
  technicalQuestions: TechnicalQuestion[];
  behavioralQuestions: BehavioralQuestion[];
  tipsForCompany: string[];
  groundingSources?: { title: string; uri: string }[];
  masteredQuestionIds?: Record<string, boolean>;
  generatedAt: string;
}

export interface UserPrivacySettings {
  cloudSyncEnabled: boolean;
  lastSyncedAt?: string;
  encryptLocalData: boolean;
  telemetryDisabled: boolean;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'info' | 'warning' | 'error';
}
