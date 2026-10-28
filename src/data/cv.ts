// Content lives in src/data/content/*.json and is edited from the CMS (manage.retenasa.dev).
// This file reassembles it into the shape the pages expect.
import profile from './content/profile.json';
import education from './content/education.json';
import certs from './content/certifications.json';
import projects from './content/projects.json';
import skills from './content/skills.json';
import githubJson from './content/github.json';

// A field stored as `key` (+ optional `key_en`) becomes a plain string,
// or an { it, en } pair when an English variant exists.
function bilingual<T extends Record<string, any>>(item: T, key: string) {
  const { [key]: value, [`${key}_en`]: en, ...rest } = item;
  return { ...rest, [key]: en ? { it: value, en } : value };
}

// Uploaded files may come back as "/certs/x.pdf"; pages only want the file name.
const baseName = (p?: string) => (p ? p.split('/').pop() : p);

export const cv = {
  ...profile,
  ...education,
  ...skills,
  ...projects,
  projects: projects.projects.map((p) => bilingual(p, 'name')),
  certifications: certs.certifications.map((c) => ({
    ...bilingual(bilingual(c, 'name'), 'date'),
    file: baseName(c.file),
  })),
  competitions: certs.competitions,
  downloadableCerts: certs.downloadableCerts.map((d) => ({ ...d, file: baseName(d.file) })),
} as any;

/** Snapshot of each project's GitHub repo, keyed by project slug (refreshed by `npm run sync:github` or the admin page). */
export interface GithubSnapshot {
  repo: string;
  stars: number;
  forks: number;
  issues: number;
  language: string | null;
  languages: Record<string, number>;
  topics: string[];
  license: string | null;
  homepage: string | null;
  defaultBranch: string;
  archived: boolean;
  createdAt: string;
  pushedAt: string;
  readme: string | null;
  fetchedAt: string;
}
export const github = githubJson as Record<string, GithubSnapshot>;
