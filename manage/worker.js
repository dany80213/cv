// manage.retenasa.dev — GitHub OAuth for the CV repo + static delivery of the admin page.
// The page itself lives in manage/ui/ and is served straight from the repo, so changing it
// never needs a Worker redeploy.
//
// Secrets/vars (set in Cloudflare, never in this repo):
//   GITHUB_CLIENT_ID      (var)    OAuth App client id
//   GITHUB_CLIENT_SECRET  (secret) OAuth App client secret
//   ALLOWED_USER          (var)    the only GitHub login allowed to sign in

const ORIGIN = 'https://manage.retenasa.dev';
const UI_BASE = 'https://raw.githubusercontent.com/dany80213/cv/main/manage/ui/';

// Only these files can be served; anything else under /admin/ is a 404.
const FILES = {
  'index.html': 'text/html; charset=utf-8',
  'app.js': 'text/javascript; charset=utf-8',
  'schema.js': 'text/javascript; charset=utf-8',
  'github.js': 'text/javascript; charset=utf-8',
  'icons.js': 'text/javascript; charset=utf-8',
  'app.css': 'text/css; charset=utf-8',
};

// The page holds a GitHub token, so it may only load its own code and talk to the GitHub API.
const PAGE_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  'font-src https://cv.retenasa.dev',
  "img-src 'self' data: https://cv.retenasa.dev",
  'connect-src https://api.github.com',
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

const SEC = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'cache-control': 'no-store',
};

const text = (body, status = 200, type = 'text/plain; charset=utf-8', extra = {}) =>
  new Response(body, { status, headers: { 'content-type': type, ...SEC, ...extra } });

const readCookie = (req, name) =>
  (req.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(name + '='))?.slice(name.length + 1);

// Standard Decap/Sveltia-style popup handshake. The message is only ever sent to our own origin.
function resultPage(status, payload) {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const msg = `authorization:github:${status}:${JSON.stringify(payload)}`;
  const body = `<!doctype html><meta charset="utf-8"><title>Login</title><body><script nonce="${nonce}">
(function () {
  function receive(e) {
    if (e.origin !== ${JSON.stringify(ORIGIN)}) return;
    window.opener.postMessage(${JSON.stringify(msg)}, e.origin);
    window.removeEventListener('message', receive, false);
    window.close();
  }
  window.addEventListener('message', receive, false);
  window.opener.postMessage('authorizing:github', ${JSON.stringify(ORIGIN)});
})();
</script></body>`;
  return text(body, 200, 'text/html; charset=utf-8', {
    'content-security-policy': `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'`,
    'set-cookie': 'oauth_state=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax',
  });
}

async function serveUi(file) {
  const upstream = await fetch(UI_BASE + file, { cf: { cacheTtl: 60, cacheEverything: true } });
  if (!upstream.ok) return text('Admin page unavailable', 502);
  return new Response(upstream.body, {
    headers: { 'content-type': FILES[file], 'content-security-policy': PAGE_CSP, ...SEC },
  });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === '/') return Response.redirect(`${ORIGIN}/admin/`, 302);

    if (path === '/admin' || path === '/admin/') return serveUi('index.html');
    if (path.startsWith('/admin/')) {
      const file = path.slice('/admin/'.length);
      return Object.hasOwn(FILES, file) ? serveUi(file) : text('Not found', 404);
    }

    if (path === '/auth') {
      if (!env.GITHUB_CLIENT_ID) return text('Not configured', 500);
      const state = crypto.randomUUID();
      const gh = new URL('https://github.com/login/oauth/authorize');
      gh.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      gh.searchParams.set('redirect_uri', `${ORIGIN}/callback`);
      gh.searchParams.set('scope', 'public_repo');
      gh.searchParams.set('state', state);
      return new Response(null, {
        status: 302,
        headers: {
          location: gh.toString(),
          'set-cookie': `oauth_state=${state}; Path=/; Max-Age=600; Secure; HttpOnly; SameSite=Lax`,
          ...SEC,
        },
      });
    }

    if (path === '/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!code || !state || state !== readCookie(req, 'oauth_state')) return resultPage('error', { error: 'invalid_state' });

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'cv-manage' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${ORIGIN}/callback`,
        }),
      });
      const { access_token: token, error } = await tokenRes.json();
      if (!token) return resultPage('error', { error: error || 'token_exchange_failed' });

      // Only the owner may sign in, even if someone else has write access to the repo.
      const me = await fetch('https://api.github.com/user', {
        headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'cv-manage' },
      }).then((r) => r.json());
      if (!me.login || me.login.toLowerCase() !== env.ALLOWED_USER.toLowerCase()) return resultPage('error', { error: 'user_not_allowed' });

      return resultPage('success', { token, provider: 'github' });
    }

    return text('Not found', 404);
  },
};
