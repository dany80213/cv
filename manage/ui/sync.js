// Builds the "GitHub snapshot" of each project (stars, languages, README...) that the project
// pages show. Shared by the admin page (browser) and scripts/sync-github.mjs (Node).
// `get(path, kind)` is injected: it returns parsed JSON, or the raw text when kind === 'raw'.

const GITHUB_URL = /^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i;
const MAX_README = 100_000;

/** "https://github.com/owner/name" -> "owner/name"; null for anything else. */
export function repoOf(url) {
  const m = GITHUB_URL.exec(url || '');
  return m ? `${m[1]}/${m[2]}` : null;
}

export async function fetchSnapshot(repo, get) {
  const info = await get(`/repos/${repo}`);
  const languages = await get(`/repos/${repo}/languages`).catch(() => ({}));
  let readme = null;
  try {
    readme = await get(`/repos/${repo}/readme`, 'raw');
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  const license = info.license?.spdx_id;
  return {
    repo: info.full_name,
    owner: info.owner?.login ?? null,
    fork: !!info.fork,
    parent: info.parent?.full_name ?? null,
    stars: info.stargazers_count,
    forks: info.forks_count,
    issues: info.open_issues_count,
    language: info.language || null,
    languages,
    topics: info.topics || [],
    license: license && license !== 'NOASSERTION' ? license : null,
    homepage: info.homepage || null,
    defaultBranch: info.default_branch,
    archived: !!info.archived,
    createdAt: info.created_at,
    pushedAt: info.pushed_at,
    readme: readme ? readme.slice(0, MAX_README) : null,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Refreshes the snapshot of every project that has a GitHub URL.
 * A failed repo keeps its previous snapshot. Returns { data, synced, skipped, failed }.
 */
export async function syncProjects(projects, existing, get, onProgress = () => {}) {
  const data = { ...existing };
  const res = { synced: [], skipped: [], failed: [] };
  for (const p of projects) {
    const repo = repoOf(p.url);
    if (!repo) { res.skipped.push(p.slug); continue; }
    onProgress(p.slug);
    try {
      data[p.slug] = await fetchSnapshot(repo, get);
      res.synced.push(p.slug);
    } catch (e) {
      res.failed.push({ slug: p.slug, error: e.message });
    }
  }
  // Drop snapshots of projects that no longer exist.
  const slugs = new Set(projects.map((p) => p.slug));
  for (const k of Object.keys(data)) if (!slugs.has(k)) delete data[k];
  res.data = data;
  return res;
}
