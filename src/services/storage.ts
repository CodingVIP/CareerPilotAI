import {
  JobApplication,
  JobProfile,
  ResumeVersion,
  UserPrivacySettings,
  InterviewPrepDossier,
  KeywordAnalysisResult,
} from '../types/job';

const STORAGE_KEY_APPLICATIONS = 'careerpilot_applications_v1';
const STORAGE_KEY_PROFILES = 'careerpilot_profiles_v1';
const STORAGE_KEY_ACTIVE_PROFILE = 'careerpilot_active_profile_id_v1';
const STORAGE_KEY_PRIVACY = 'careerpilot_privacy_settings_v1';
const STORAGE_KEY_INTERVIEWS = 'careerpilot_interviews_cache_v1';
const STORAGE_KEY_MATCHES = 'careerpilot_matches_cache_v1';

// Seed initial profile and versioned resumes
const INITIAL_PROFILES: JobProfile[] = [
  {
    id: 'prof-frontend-staff',
    name: 'Staff Frontend Engineer',
    targetRole: 'Staff / Senior Frontend Engineer',
    summary:
      'Frontend architectural lead with 8+ years building enterprise React & TypeScript systems, high-throughput design systems, and real-time collaboration engines.',
    skills: [
      'React 19',
      'TypeScript',
      'Tailwind CSS',
      'Next.js',
      'WebSockets',
      'Performance Optimization',
      'Design Systems',
      'GraphQL',
      'CI/CD',
    ],
    createdAt: '2026-01-10T10:00:00.000Z',
    updatedAt: '2026-02-15T14:30:00.000Z',
    resumeVersions: [
      {
        id: 'res-v1-standard',
        versionName: 'v1.0 - Core Frontend Specialist',
        isDefault: true,
        tags: ['React', 'TypeScript', 'Design Systems', 'General'],
        uploadedAt: '2026-02-01T12:00:00.000Z',
        wordCount: 420,
        content: `# ALEX CHEN
Staff Frontend & Systems Engineer | alex.chen@example.com | San Francisco, CA | github.com/alexchen

## PROFESSIONAL SUMMARY
Results-driven Staff Frontend Engineer with 8+ years of experience scaling web applications, architecting design systems, and optimizing Core Web Vitals across millions of daily active users. Led frontend modernization reducing bundle sizes by 42% and increasing application load velocity by 3.2x.

## CORE COMPETENCIES
- Languages & Frameworks: TypeScript, JavaScript (ES2024), React 19, Next.js, Node.js, HTML5/CSS3
- Styling & Systems: Tailwind CSS, CSS Modules, Radix UI, Figma Tokens, Accessibility (WCAG AA/AAA)
- Architecture & Tools: Vite, Webpack, State Management (Zustand/Redux), TanStack Query, GraphQL, REST
- Performance & Testing: Core Web Vitals, Lighthouse CI, Vitest, Playwright, Jest, CI/CD GitHub Actions

## PROFESSIONAL EXPERIENCE

### Staff Frontend Engineer | CloudMatrix Inc. (2023 – Present)
- Architected the next-generation micro-frontend dashboard serving 4.5M monthly active enterprise users, reducing initial page load from 2.8s to 820ms.
- Spearheaded company-wide migration to React 19 and Tailwind CSS, standardizing 45+ UI primitives and boosting engineering velocity by 35%.
- Implemented real-time telemetry and WebSocket synchronizer capable of handling 50,000 concurrent state diffs with zero frame drop.

### Senior Frontend Engineer | Veloce Data (2020 – 2023)
- Built high-performance canvas and WebGL data visualization widgets rendering 100k+ data points at continuous 60fps.
- Designed comprehensive automated end-to-end testing pipeline with Playwright, catching 99.4% of UI regressions prior to deployment.
- Mentored 6 junior/mid-level engineers through code reviews, architectural RFCs, and weekly frontend guilds.

## EDUCATION
B.S. in Computer Science | University of California, Berkeley (2016 – 2020)
`,
      },
      {
        id: 'res-v2-fullstack',
        versionName: 'v1.2 - Full-Stack & Cloud Focus',
        isDefault: false,
        tags: ['Full-Stack', 'Node.js', 'PostgreSQL', 'Docker', 'Cloud'],
        uploadedAt: '2026-02-15T18:00:00.000Z',
        wordCount: 460,
        content: `# ALEX CHEN
Full-Stack & Cloud Systems Engineer | alex.chen@example.com | San Francisco, CA

## SUMMARY
Senior Full-Stack Engineer with specialized expertise in high-concurrency Node.js microservices, React distributed user interfaces, PostgreSQL query optimization, and containerized Cloud Run deployments.

## TECHNICAL EXPERTISE
- Backend: Node.js, Express, TypeScript, RESTful APIs, gRPC, PostgreSQL, Redis, Drizzle ORM
- Frontend: React 19, Vite, Tailwind CSS, TypeScript, TanStack Query
- Cloud & DevOps: Docker, Kubernetes, Google Cloud Platform (Cloud Run, Cloud SQL), GitHub Actions, Terraform
- Observability: OpenTelemetry, Prometheus, Datadog, Sentry

## KEY ACHIEVEMENTS
- Developed distributed API caching tier on Redis + Cloud Run handling 12,000 req/sec with p99 latency under 15ms.
- Migrated monolith backend services to event-driven serverless architecture, slashing infrastructure overhead by $18,000/month.
- Integrated automated schema migration verification with Drizzle ORM and PostgreSQL row-level security.
`,
      },
    ],
  },
  {
    id: 'prof-fullstack-lead',
    name: 'Full-Stack Engineering Lead',
    targetRole: 'Engineering Manager / Lead',
    summary:
      'Technical lead with experience managing cross-functional squads of 6-10 engineers, driving product roadmaps, and architecting resilient cloud services.',
    skills: ['Team Leadership', 'Architecture', 'Node.js', 'System Design', 'Agile / Scrum', 'Mentorship'],
    createdAt: '2026-01-20T11:00:00.000Z',
    updatedAt: '2026-02-10T16:00:00.000Z',
    resumeVersions: [
      {
        id: 'res-lead-v1',
        versionName: 'v1.0 - Engineering Leadership',
        isDefault: true,
        tags: ['Leadership', 'Management', 'Hiring', 'Architecture'],
        uploadedAt: '2026-02-10T16:00:00.000Z',
        wordCount: 390,
        content: `# ALEX CHEN
Engineering Lead & Technical Manager | alex.chen@example.com | San Francisco, CA

## EXECUTIVE PROFILE
Engineering Leader with 8+ years of technical craftsmanship and 3+ years managing high-output engineering teams. Proven track record of shipping complex enterprise SaaS products on schedule while maintaining high employee retention (94%).

## LEADERSHIP & ARCHITECTURE SKILLS
- Engineering Management, Technical Roadmap Planning, Cross-functional Stakeholder Management
- Full-Stack Architecture, Code Review Standards, OKRs & Performance Management
- Agile, Scrum, Incident Response Management, Technical Debt Mitigation

## EXPERIENCE
### Engineering Lead | CloudMatrix Inc. (2024 – Present)
- Led team of 8 full-stack engineers across 3 time zones; achieved 98% sprint commitment reliability.
- Conducted 80+ technical interviews and revamped the company's engineering interview rubric.
`,
      },
    ],
  },
];

const INITIAL_APPLICATIONS: JobApplication[] = [
  {
    id: 'app-stripe-01',
    company: 'Stripe',
    role: 'Staff Frontend Engineer, Connect Dashboard',
    url: 'https://stripe.com/jobs/staff-frontend-connect',
    status: 'interview',
    salaryMin: 215000,
    salaryMax: 265000,
    salaryCurrency: 'USD',
    location: 'San Francisco, CA (Hybrid)',
    jobType: 'hybrid',
    requirements: [
      '8+ years building complex web applications with React and TypeScript',
      'Deep mastery of web performance, browser rendering, and Core Web Vitals',
      'Demonstrated experience building large-scale design systems or financial dashboards',
      'Track record of cross-functional collaboration with product, design, and risk teams',
      'Experience with internationalization and accessibility standards (WCAG AA)',
    ],
    description:
      'Stripe is looking for a Staff Frontend Engineer to lead the user experience for Connect, our product powering platforms and marketplaces globally. You will architect mission-critical dashboard components, establish engineering rigor, and mentor engineers across the organization.\n\nBenefits Package:\n• Comprehensive healthcare (medical, dental, vision) fully covered\n• 401(k) with 50% match up to statutory limits\n• Competitive equity compensation and annual performance refreshers\n• Generous parental leave (16 weeks paid) & wellness stipends',
    rawDescription: `<h4 class="job-rich-h4">About Stripe Connect</h4>
<p class="job-rich-p">Stripe Connect is the best way for platforms and marketplaces to embed payments, pay out recipients, and manage compliance globally. As a Staff Frontend Engineer, you will set the architectural direction for the platform merchant portal.</p>
<h4 class="job-rich-h4">Key Responsibilities</h4>
<ul class="job-rich-ul">
  <li>Architect and build scalable, accessible UI systems handling hundreds of thousands of concurrent business accounts.</li>
  <li>Establish performance budgets and continuous monitoring across high-traffic dashboard routes.</li>
  <li>Partner with principal designers and product leads to define next-generation financial workflow paradigms.</li>
  <li style="margin-left: 1.5rem;">Lead the migration of legacy client state stores to modern local-first primitives.</li>
  <li style="margin-left: 1.5rem;">Mentor senior engineers across the global frontend community.</li>
</ul>
<h4 class="job-rich-h4">Qualifications & Requirements</h4>
<ol class="job-rich-ol">
  <li>8+ years of production experience with modern JavaScript, React, and TypeScript.</li>
  <li>Proven track record of shipping complex enterprise web applications at scale.</li>
  <li>Strong understanding of browser layout engines, performance profiling, and web security.</li>
</ol>
<h4 class="job-rich-h4">Compensation & Comprehensive Benefits</h4>
<p class="job-rich-p">The expected annual base salary range for this role is <strong>$215,000 – $265,000 USD</strong> plus equity grants and performance bonuses.</p>
<ul class="job-rich-ul">
  <li>Full medical, dental, and vision coverage for employees and dependents.</li>
  <li>401(k) plan with employer matching.</li>
  <li>Flexible paid time off and designated global recharge days.</li>
  <li>$1,500 annual home office setup and professional development stipend.</li>
</ul>`,
    appliedDate: '2026-02-18',
    linkedProfileId: 'prof-frontend-staff',
    linkedResumeVersionId: 'res-v1-standard',
    notes:
      'Completed recruiter screen on Feb 22. Technical Architecture & System Design round scheduled for next Tuesday at 10:00 AM PST.',
    contactName: 'Sarah Jenkins',
    contactEmail: 'sjenkins@stripe.com',
    createdAt: '2026-02-18T15:20:00.000Z',
    updatedAt: '2026-02-23T09:15:00.000Z',
  },
  {
    id: 'app-airbnb-02',
    company: 'Airbnb',
    role: 'Senior Frontend Engineer, Guest Experience',
    url: 'https://careers.airbnb.com/positions/senior-frontend-guest',
    status: 'screening',
    salaryMin: 195000,
    salaryMax: 240000,
    salaryCurrency: 'USD',
    location: 'Remote, US',
    jobType: 'remote',
    requirements: [
      '5+ years experience with React, TypeScript, and modern CSS frameworks',
      'Strong consumer UI intuition with pixel-perfect animation implementation',
      'Experience optimizing mobile web responsiveness and progressive loading',
      'Familiarity with GraphQL and client-side caching strategies',
    ],
    description:
      'Join the Guest Experience team at Airbnb to craft intuitive booking flows, trip coordination tools, and immersive search filters used by tens of millions of travelers around the world.\n\nBenefits Package:\n• Annual travel credits ($2,000/year to explore Airbnb stays)\n• Comprehensive health and mental wellness benefits\n• 401(k) with company contribution\n• Flexible work-from-anywhere policy',
    rawDescription: `<h4 class="job-rich-h4">Role Overview</h4>
<p class="job-rich-p">The Guest Experience engineering team builds the magical interfaces that welcome travelers from around the world to Airbnb. We care deeply about craft, animation fidelity, accessibility, and micro-interactions.</p>
<h4 class="job-rich-h4">What You Will Do</h4>
<ul class="job-rich-ul">
  <li>Develop responsive, fluid guest-facing features across desktop, tablet, and mobile browsers.</li>
  <li>Collaborate with product designers to prototype novel search filters and spatial map interfaces.</li>
  <li>Improve Core Web Vitals (LCP, INP, CLS) on top search landing pages.</li>
</ul>
<h4 class="job-rich-h4">Compensation & Benefits</h4>
<p class="job-rich-p">Base salary range: <strong>$195,000 – $240,000 USD</strong> annually, depending on experience and location.</p>
<ul class="job-rich-ul">
  <li>$2,000 annual Airbnb travel credit.</li>
  <li>Comprehensive health coverage and paid family leave.</li>
  <li>Work from anywhere flexibility.</li>
</ul>`,
    appliedDate: '2026-02-24',
    linkedProfileId: 'prof-frontend-staff',
    linkedResumeVersionId: 'res-v1-standard',
    notes: 'Recruiter phone screening scheduled for this Thursday.',
    contactName: 'Marcus Vance',
    contactEmail: 'marcus.v@airbnb.com',
    createdAt: '2026-02-24T11:40:00.000Z',
    updatedAt: '2026-02-25T14:10:00.000Z',
  },
  {
    id: 'app-datadog-03',
    company: 'Datadog',
    role: 'Senior Software Engineer, APM UI',
    url: 'https://careers.datadoghq.com/detail/senior-apm-ui',
    status: 'offer',
    salaryMin: 200000,
    salaryMax: 250000,
    salaryCurrency: 'USD',
    location: 'New York, NY (Hybrid)',
    jobType: 'hybrid',
    requirements: [
      'Proficiency in React, TypeScript, and high-frequency time-series data rendering',
      'Experience with SVG, Canvas, or WebGL for interactive charting',
      'Background in distributed systems or observability tooling is a strong plus',
    ],
    description:
      'Build the real-time telemetry and APM monitoring consoles that help thousands of enterprise companies diagnose production performance anomalies in seconds.',
    rawDescription: `<h4 class="job-rich-h4">Team Mission</h4>
<p class="job-rich-p">The APM UI team at Datadog builds high-throughput, high-fidelity monitoring interfaces for engineers maintaining complex cloud architectures.</p>
<h4 class="job-rich-h4">Primary Responsibilities</h4>
<ul class="job-rich-ul">
  <li>Develop high-performance time-series data visualizations rendering over 100k data points smoothly.</li>
  <li>Build modular telemetry widgets using Canvas and WebGL acceleration.</li>
</ul>
<h4 class="job-rich-h4">Expected Pay Range</h4>
<p class="job-rich-p">Base compensation: <strong>$200,000 – $250,000 USD</strong> plus equity options and full benefits.</p>`,
    appliedDate: '2026-01-28',
    linkedProfileId: 'prof-frontend-staff',
    linkedResumeVersionId: 'res-v1-standard',
    notes: 'Received written offer on March 1st. Negotiating equity grant and sign-on bonus.',
    contactName: 'Elena Rostova',
    contactEmail: 'elena.rostova@datadoghq.com',
    createdAt: '2026-01-28T16:00:00.000Z',
    updatedAt: '2026-03-01T17:30:00.000Z',
  },
  {
    id: 'app-vercel-04',
    company: 'Vercel',
    role: 'Staff Product Engineer',
    url: 'https://vercel.com/careers/staff-product-engineer',
    status: 'applied',
    salaryMin: 210000,
    salaryMax: 260000,
    salaryCurrency: 'USD',
    location: 'Remote',
    jobType: 'remote',
    requirements: [
      'Mastery of Next.js, React Server Components, and Edge Compute primitives',
      'Obsessive attention to developer experience and typography',
      'Demonstrated open-source contributions or public technical writing',
    ],
    description:
      'Shape the developer cloud platform for the modern web. You will work across product surfaces from dashboard deployments to preview analytics.',
    appliedDate: '2026-03-01',
    linkedProfileId: 'prof-frontend-staff',
    linkedResumeVersionId: 'res-v1-standard',
    notes: 'Application submitted via referral from Mike on Twitter/X.',
    createdAt: '2026-03-01T20:15:00.000Z',
    updatedAt: '2026-03-01T20:15:00.000Z',
  },
  {
    id: 'app-linear-05',
    company: 'Linear',
    role: 'Frontend Infrastructure Engineer',
    url: 'https://linear.app/careers/frontend-infra',
    status: 'wishlist',
    salaryMin: 190000,
    salaryMax: 240000,
    salaryCurrency: 'USD',
    location: 'Remote (Americas/Europe)',
    jobType: 'remote',
    requirements: [
      'Deep understanding of offline-first sync engines and local database storage (SQLite / IndexedDB)',
      'High bar for UI speed, sub-50ms latency, and keyboard navigation ergonomics',
      'TypeScript mastery and functional programming patterns',
    ],
    description:
      'Help build the world-class issue tracker beloved by high-output teams. You will maintain our sync engine, keyboard shortcut system, and state cache.',
    linkedProfileId: 'prof-frontend-staff',
    linkedResumeVersionId: 'res-v1-standard',
    notes: 'Drafting tailored resume targeting local-first sync systems before submitting.',
    createdAt: '2026-03-02T13:00:00.000Z',
    updatedAt: '2026-03-02T13:00:00.000Z',
  },
];

const INITIAL_PRIVACY: UserPrivacySettings = {
  cloudSyncEnabled: false,
  encryptLocalData: false,
  telemetryDisabled: true,
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function isValidApplication(value: unknown): value is JobApplication {
  if (!value || typeof value !== 'object') return false;
  const app = value as Partial<JobApplication>;
  return (
    typeof app.id === 'string' &&
    typeof app.company === 'string' &&
    typeof app.role === 'string' &&
    typeof app.status === 'string' &&
    typeof app.location === 'string' &&
    Array.isArray(app.requirements) &&
    typeof app.description === 'string' &&
    typeof app.notes === 'string'
  );
}

function isValidProfile(value: unknown): value is JobProfile {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Partial<JobProfile>;
  return (
    typeof profile.id === 'string' &&
    typeof profile.name === 'string' &&
    typeof profile.targetRole === 'string' &&
    typeof profile.summary === 'string' &&
    Array.isArray(profile.skills) &&
    Array.isArray(profile.resumeVersions)
  );
}

function isValidPrivacy(value: unknown): value is UserPrivacySettings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Partial<UserPrivacySettings>;
  return (
    typeof settings.cloudSyncEnabled === 'boolean' &&
    typeof settings.encryptLocalData === 'boolean' &&
    typeof settings.telemetryDisabled === 'boolean'
  );
}

export const storageService = {
  // Applications CRUD
  getApplications(): JobApplication[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_APPLICATIONS);
      if (!data) {
        const defaults = clone(INITIAL_APPLICATIONS);
        localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(defaults));
        return defaults;
      }
      const parsed: unknown = JSON.parse(data);
      if (!Array.isArray(parsed) || !parsed.every(isValidApplication)) {
        throw new Error('Stored applications have an invalid format.');
      }
      return parsed.map((app) => {
        if (!app.rawDescription) {
          const initMatch = INITIAL_APPLICATIONS.find((i) => i.id === app.id);
          if (initMatch?.rawDescription) {
            return { ...app, rawDescription: initMatch.rawDescription };
          }
        }
        return app;
      });
    } catch {
      return clone(INITIAL_APPLICATIONS);
    }
  },

  saveApplications(applications: JobApplication[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(applications));
    } catch (e) {
      console.error('Failed to save applications:', e);
    }
  },

  addApplication(application: JobApplication): void {
    const apps = this.getApplications();
    const updated = [application, ...apps];
    this.saveApplications(updated);
  },

  updateApplication(updatedApp: JobApplication): void {
    const apps = this.getApplications();
    const index = apps.findIndex((a) => a.id === updatedApp.id);
    if (index !== -1) {
      apps[index] = { ...updatedApp, updatedAt: new Date().toISOString() };
      this.saveApplications(apps);
    }
  },

  deleteApplication(id: string): void {
    const apps = this.getApplications();
    const filtered = apps.filter((a) => a.id !== id);
    this.saveApplications(filtered);
  },

  // Job Profiles CRUD
  getProfiles(): JobProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PROFILES);
      if (!data) {
        const defaults = clone(INITIAL_PROFILES);
        localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(defaults));
        return defaults;
      }
      const parsed: unknown = JSON.parse(data);
      if (!Array.isArray(parsed) || !parsed.every(isValidProfile)) {
        throw new Error('Stored profiles have an invalid format.');
      }
      return parsed;
    } catch {
      return clone(INITIAL_PROFILES);
    }
  },

  saveProfiles(profiles: JobProfile[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    } catch (e) {
      console.error('Failed to save profiles:', e);
    }
  },

  addProfile(profile: JobProfile): void {
    const profiles = this.getProfiles();
    this.saveProfiles([...profiles, profile]);
  },

  updateProfile(updatedProfile: JobProfile): void {
    const profiles = this.getProfiles();
    const index = profiles.findIndex((p) => p.id === updatedProfile.id);
    if (index !== -1) {
      profiles[index] = { ...updatedProfile, updatedAt: new Date().toISOString() };
      this.saveProfiles(profiles);
    }
  },

  deleteProfile(id: string): void {
    const profiles = this.getProfiles();
    const remaining = profiles.filter((p) => p.id !== id);
    this.saveProfiles(remaining);
    this.saveApplications(
      this.getApplications().map((app) =>
        app.linkedProfileId === id
          ? { ...app, linkedProfileId: undefined, linkedResumeVersionId: undefined }
          : app
      )
    );
    if (this.getActiveProfileId() === id) {
      this.setActiveProfileId(remaining[0]?.id || '');
    }
  },

  // Resume Version CRUD within a Profile
  addResumeVersion(profileId: string, version: ResumeVersion): void {
    const profiles = this.getProfiles();
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) {
      if (version.isDefault) {
        profile.resumeVersions.forEach((v) => (v.isDefault = false));
      }
      if (!profile.resumeVersions.length || version.isDefault) {
        profile.resumeVersions.forEach((v) => (v.isDefault = false));
        version.isDefault = true;
      }
      profile.resumeVersions.push(version);
      profile.updatedAt = new Date().toISOString();
      this.saveProfiles(profiles);
    }
  },

  updateResumeVersion(profileId: string, version: ResumeVersion): void {
    const profiles = this.getProfiles();
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) {
      const vIndex = profile.resumeVersions.findIndex((v) => v.id === version.id);
      if (vIndex !== -1) {
        if (version.isDefault) {
          profile.resumeVersions.forEach((v) => (v.isDefault = false));
        }
        profile.resumeVersions[vIndex] = version;
        profile.updatedAt = new Date().toISOString();
        this.saveProfiles(profiles);
      }
    }
  },

  deleteResumeVersion(profileId: string, versionId: string): void {
    const profiles = this.getProfiles();
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) {
      const removed = profile.resumeVersions.find((v) => v.id === versionId);
      profile.resumeVersions = profile.resumeVersions.filter((v) => v.id !== versionId);
      if (profile.resumeVersions.length > 0 && removed?.isDefault) {
        profile.resumeVersions[0].isDefault = true;
      }
      profile.updatedAt = new Date().toISOString();
      this.saveProfiles(profiles);
      this.saveApplications(
        this.getApplications().map((app) =>
          app.linkedProfileId === profileId && app.linkedResumeVersionId === versionId
            ? { ...app, linkedResumeVersionId: profile.resumeVersions[0]?.id }
            : app
        )
      );
    }
  },

  // Active Profile
  getActiveProfileId(): string {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_PROFILE);
    if (saved && this.getProfiles().some((profile) => profile.id === saved)) return saved;
    const profiles = this.getProfiles();
    return profiles[0]?.id || '';
  },

  setActiveProfileId(id: string): void {
    localStorage.setItem(STORAGE_KEY_ACTIVE_PROFILE, id);
  },

  // Privacy Settings
  getPrivacySettings(): UserPrivacySettings {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PRIVACY);
      if (!data) return clone(INITIAL_PRIVACY);
      const parsed: unknown = JSON.parse(data);
      if (!isValidPrivacy(parsed)) throw new Error('Stored privacy settings have an invalid format.');
      return parsed;
    } catch {
      return clone(INITIAL_PRIVACY);
    }
  },

  savePrivacySettings(settings: UserPrivacySettings): void {
    localStorage.setItem(STORAGE_KEY_PRIVACY, JSON.stringify(settings));
  },

  // Cached Interview Preps
  getInterviewDossier(applicationId: string): InterviewPrepDossier | null {
    try {
      const cache = JSON.parse(localStorage.getItem(STORAGE_KEY_INTERVIEWS) || '{}');
      return cache[applicationId] || null;
    } catch {
      return null;
    }
  },

  saveInterviewDossier(applicationId: string, dossier: InterviewPrepDossier): void {
    try {
      const cache = JSON.parse(localStorage.getItem(STORAGE_KEY_INTERVIEWS) || '{}');
      cache[applicationId] = dossier;
      localStorage.setItem(STORAGE_KEY_INTERVIEWS, JSON.stringify(cache));
    } catch (e) {
      console.error('Failed to cache interview dossier:', e);
    }
  },

  // Cached Keyword Matches
  getKeywordMatch(cacheKey: string): KeywordAnalysisResult | null {
    try {
      const cache = JSON.parse(localStorage.getItem(STORAGE_KEY_MATCHES) || '{}');
      return cache[cacheKey] || null;
    } catch {
      return null;
    }
  },

  saveKeywordMatch(cacheKey: string, result: KeywordAnalysisResult): void {
    try {
      const cache = JSON.parse(localStorage.getItem(STORAGE_KEY_MATCHES) || '{}');
      cache[cacheKey] = result;
      localStorage.setItem(STORAGE_KEY_MATCHES, JSON.stringify(cache));
    } catch (e) {
      console.error('Failed to cache match result:', e);
    }
  },

  // Full backup & export
  exportAllData(): string {
    const data = {
      applications: this.getApplications(),
      profiles: this.getProfiles(),
      privacy: this.getPrivacySettings(),
      activeProfileId: this.getActiveProfileId(),
      interviewCache: JSON.parse(localStorage.getItem(STORAGE_KEY_INTERVIEWS) || '{}'),
      matchCache: JSON.parse(localStorage.getItem(STORAGE_KEY_MATCHES) || '{}'),
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      appVersion: 'CareerPilot-1.0',
    };
    return JSON.stringify(data, null, 2);
  },

  importData(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString) as Record<string, unknown>;
      if (
        !parsed ||
        !Array.isArray(parsed.applications) ||
        !parsed.applications.every(isValidApplication) ||
        !Array.isArray(parsed.profiles) ||
        !parsed.profiles.every(isValidProfile) ||
        !isValidPrivacy(parsed.privacy)
      ) {
        throw new Error('Backup does not match the CareerPilot schema.');
      }
      const activeProfileId =
        typeof parsed.activeProfileId === 'string' &&
        parsed.profiles.some((profile) => profile.id === parsed.activeProfileId)
          ? parsed.activeProfileId
          : (parsed.profiles[0] as JobProfile | undefined)?.id || '';
      localStorage.setItem(STORAGE_KEY_APPLICATIONS, JSON.stringify(parsed.applications));
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(parsed.profiles));
      localStorage.setItem(STORAGE_KEY_PRIVACY, JSON.stringify(parsed.privacy));
      localStorage.setItem(STORAGE_KEY_ACTIVE_PROFILE, activeProfileId);
      localStorage.setItem(
        STORAGE_KEY_INTERVIEWS,
        JSON.stringify(parsed.interviewCache && typeof parsed.interviewCache === 'object' ? parsed.interviewCache : {})
      );
      localStorage.setItem(
        STORAGE_KEY_MATCHES,
        JSON.stringify(parsed.matchCache && typeof parsed.matchCache === 'object' ? parsed.matchCache : {})
      );
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  },

  importCloudSnapshot(snapshot: unknown): { applications: number; profiles: number; resumes: number } {
    if (!snapshot || typeof snapshot !== 'object') throw new Error('Cloud data is not available.');
    const cloud = snapshot as Record<string, unknown>;
    const applications = Array.isArray(cloud.applications) ? cloud.applications : [];
    const cloudProfiles = Array.isArray(cloud.profiles) ? cloud.profiles : [];
    const profiles = cloudProfiles.map((profile) => {
      if (!profile || typeof profile !== 'object') throw new Error('Cloud profile data is invalid.');
      const source = profile as Record<string, unknown>;
      const resumeVersions = Array.isArray(source.resumeVersions) ? source.resumeVersions : [];
      return {
        ...source,
        resumeVersions: resumeVersions.map((resume) => {
          if (!resume || typeof resume !== 'object') throw new Error('Cloud resume data is invalid.');
          const item = resume as Record<string, unknown>;
          const content = typeof item.content === 'string' ? item.content : '';
          return {
            ...item,
            content,
            wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
          };
        }),
      };
    });
    const privacy = cloud.privacy && typeof cloud.privacy === 'object'
      ? cloud.privacy
      : this.getPrivacySettings();
    const imported = this.importData(JSON.stringify({
      applications,
      profiles,
      privacy,
      activeProfileId: profiles[0] && typeof profiles[0] === 'object' ? (profiles[0] as Record<string, unknown>).id : '',
      interviewCache: {},
      matchCache: {},
    }));
    if (!imported) throw new Error('Cloud data does not match the CareerPilot schema.');
    return {
      applications: applications.length,
      profiles: profiles.length,
      resumes: profiles.reduce((count, profile) => count + profile.resumeVersions.length, 0),
    };
  },

  resetToDefaults(): void {
    localStorage.removeItem(STORAGE_KEY_APPLICATIONS);
    localStorage.removeItem(STORAGE_KEY_PROFILES);
    localStorage.removeItem(STORAGE_KEY_INTERVIEWS);
    localStorage.removeItem(STORAGE_KEY_MATCHES);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_PROFILE);
    localStorage.removeItem(STORAGE_KEY_PRIVACY);
    this.getApplications();
    this.getProfiles();
    this.getPrivacySettings();
  },
};
