// Thin GitHub Contents API client. The token only lives in this tab (sessionStorage).

const API = 'https://api.github.com';
export const REPO = 'dany80213/cv';
export const OWNER = 'dany80213';
const BRANCH = 'main';
const TOKEN_KEY = 'cv-manage-token';

let token = null;
try { token = sessionStorage.getItem(TOKEN_KEY); } catch { /* storage unavailable */ }

export const hasToken = () => !!token;
export function setToken(t) {
  token = t;
  try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function gh(path, { method = 'GET', body, accept = 'application/vnd.github+json', text = false } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      accept,
      'x-github-api-version': '2022-11-28',
      authorization: `Bearer ${token}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).message || msg; } catch { /* not JSON */ }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return null;
  return text ? res.text() : res.json();
}

/** GET used by sync.js: parsed JSON, or the raw file text when kind === 'raw'. */
export const get = (path, kind) =>
  kind === 'raw' ? gh(path, { accept: 'application/vnd.github.raw+json', text: true }) : gh(path);

const enc = new TextEncoder();
const dec = new TextDecoder();
function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const fromBase64 = (b64) => Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0));
const contentsUrl = (path) => `/repos/${REPO}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;

export const whoami = () => gh('/user');

export async function readJson(path) {
  const r = await gh(`${contentsUrl(path)}?ref=${BRANCH}`);
  return { data: JSON.parse(dec.decode(fromBase64(r.content))), sha: r.sha };
}

/** Like readJson, but a missing file gives { data: fallback, sha: undefined }. */
export async function readJsonOrDefault(path, fallback) {
  try { return await readJson(path); } catch (e) { if (e.status === 404) return { data: fallback, sha: undefined }; throw e; }
}

/** Commits the file to main (creates it when sha is undefined). Returns the new blob sha and the commit sha. */
export async function writeJson(path, data, sha, message) {
  const r = await gh(contentsUrl(path), {
    method: 'PUT',
    body: { message, branch: BRANCH, sha, content: toBase64(enc.encode(JSON.stringify(data, null, 2) + '\n')) },
  });
  return { sha: r.content.sha, commit: r.commit.sha };
}

export async function listDir(path) {
  try {
    const r = await gh(`${contentsUrl(path)}?ref=${BRANCH}`);
    return r.filter((f) => f.type === 'file').map((f) => f.name).sort((a, b) => a.localeCompare(b));
  } catch (e) {
    if (e.status === 404) return [];
    throw e;
  }
}

/** Uploads (or replaces) a binary file in the repo. */
export async function uploadFile(dir, file) {
  const path = `${dir}/${file.name}`;
  let sha;
  try { sha = (await gh(`${contentsUrl(path)}?ref=${BRANCH}`)).sha; } catch (e) { if (e.status !== 404) throw e; }
  const bytes = new Uint8Array(await file.arrayBuffer());
  await gh(contentsUrl(path), {
    method: 'PUT',
    body: { message: `content: upload ${file.name}`, branch: BRANCH, sha, content: toBase64(bytes) },
  });
  return file.name;
}

/** Latest GitHub Actions run for a commit, or null if it has not started yet. */
export async function runForCommit(commit) {
  const r = await gh(`/repos/${REPO}/actions/runs?branch=${BRANCH}&per_page=5`);
  return r.workflow_runs.find((run) => run.head_sha === commit) || null;
}
