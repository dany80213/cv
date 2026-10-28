// Refreshes src/data/content/github.json from the GitHub API (same logic as the admin page button).
// Usage: npm run sync:github        (uses GITHUB_TOKEN, or `gh auth token`, or no token for public repos)
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { syncProjects } from '../manage/ui/sync.js';

const root = new URL('../src/data/content/', import.meta.url);
const projects = JSON.parse(readFileSync(new URL('projects.json', root), 'utf8')).projects;
const existing = JSON.parse(readFileSync(new URL('github.json', root), 'utf8'));

let token = process.env.GITHUB_TOKEN;
if (!token) { try { token = execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* anonymous */ } }

async function get(path, kind) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: kind === 'raw' ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'cv-sync',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw Object.assign(new Error(`${res.status} ${path}`), { status: res.status });
  return kind === 'raw' ? res.text() : res.json();
}

const { data, synced, skipped, failed } = await syncProjects(projects, existing, get, (slug) => console.log(`sync ${slug}…`));
writeFileSync(new URL('github.json', root), JSON.stringify(data, null, 2) + '\n');
console.log(`synced: ${synced.join(', ') || '-'}\nskipped (no GitHub URL): ${skipped.join(', ') || '-'}`);
if (failed.length) { console.error('failed:', failed); process.exitCode = 1; }
