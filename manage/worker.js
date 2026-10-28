// manage.retenasa.dev — Sveltia CMS shell + GitHub OAuth for the CV repo.
// Secrets/vars (set in Cloudflare, never in this repo):
//   GITHUB_CLIENT_ID      (var)    OAuth App client id
//   GITHUB_CLIENT_SECRET  (secret) OAuth App client secret
//   ALLOWED_USER          (var)    the only GitHub login allowed to sign in

const ORIGIN = 'https://manage.retenasa.dev';
const REPO = 'dany80213/cv';
const CMS_URL = 'https://cdn.jsdelivr.net/npm/@sveltia/cms@0.237.0/dist/sveltia-cms.js';

// ---------- CMS configuration (served as JSON, which is valid YAML) ----------
const str = (name, label, extra = {}) => ({ name, label, widget: 'string', ...extra });
const opt = (f) => ({ ...f, required: false });
const long = (name, label, extra = {}) => ({ name, label, widget: 'text', ...extra });
const bool = (name, label, def = false) => ({ name, label, widget: 'boolean', default: def, required: false });
const pair = (name, label, widget = 'string', extra = {}) => ({
  name, label, widget: 'object', collapsed: false, ...extra,
  fields: [
    { name: 'it', label: 'Italiano', widget, ...(extra.req === false ? { required: false } : {}) },
    { name: 'en', label: 'English', widget, ...(extra.req === false ? { required: false } : {}) },
  ],
});
const list = (name, label, field) => ({ name, label, widget: 'list', field });
const strList = (name, label) => ({ ...list(name, label, str('item', 'Voce')), required: false });
const pairList = (name, label) => ({
  name, label, widget: 'object', collapsed: true,
  fields: [
    { ...strList('it', 'Italiano') },
    { ...strList('en', 'English') },
  ],
});
const fileField = (name, label, folder, publicFolder) => ({
  name, label, widget: 'file', required: false,
  media_folder: folder, public_folder: publicFolder,
});

const config = {
  backend: {
    name: 'github',
    repo: REPO,
    branch: 'main',
    base_url: ORIGIN,
    auth_endpoint: 'auth',
    commit_messages: {
      create: 'content: add {{collection}} "{{slug}}"',
      update: 'content: update {{collection}} "{{slug}}"',
      delete: 'content: delete {{collection}} "{{slug}}"',
      uploadMedia: 'content: upload "{{path}}"',
      deleteMedia: 'content: delete "{{path}}"',
    },
  },
  publish_mode: 'simple',
  media_folder: 'public/certs',
  public_folder: '/certs',
  site_url: 'https://cv.retenasa.dev',
  display_url: 'https://cv.retenasa.dev',
  collections: [
    {
      name: 'site',
      label: 'CV',
      files: [
        {
          name: 'profile', label: 'Profilo e contatti', file: 'src/data/content/profile.json',
          fields: [
            str('name', 'Nome'),
            { name: 'age', label: 'Età', widget: 'number', value_type: 'int' },
            str('projectsCount', 'Numero progetti (es. 12+)'),
            str('location', 'Città'),
            str('email', 'Email di contatto'),
            str('github', 'Username GitHub'),
            str('githubUrl', 'URL GitHub'),
            pair('roles', 'Ruolo'),
            pair('tagline', 'Tagline'),
            pair('about', 'Chi sono', 'text'),
            pairList('softSkills', 'Soft skills'),
            pairList('hobbies', 'Hobby'),
            {
              name: 'pcto', label: 'PCTO', widget: 'object',
              fields: [{ name: 'hours', label: 'Ore', widget: 'number', value_type: 'int' }, str('it', 'Italiano'), str('en', 'English')],
            },
          ],
        },
        {
          name: 'education', label: 'Formazione', file: 'src/data/content/education.json',
          fields: [{
            name: 'education', label: 'Percorsi', widget: 'list', summary: '{{fields.school}}',
            fields: [
              str('school', 'Scuola / università'),
              str('location', 'Luogo'),
              pair('degree', 'Titolo'),
              str('period', 'Periodo'),
              bool('current', 'In corso'),
              pairList('highlights', 'Punti salienti'),
            ],
          }],
        },
        {
          name: 'certifications', label: 'Certificazioni e competizioni', file: 'src/data/content/certifications.json',
          fields: [
            {
              name: 'certifications', label: 'Certificazioni', widget: 'list', summary: '{{fields.name}}',
              fields: [
                str('name', 'Nome (italiano)'),
                opt(str('name_en', 'Nome (inglese, se diverso)')),
                fileField('logo', 'Logo', '/public/assets/logos', '/assets/logos'),
                pair('issuer', 'Ente'),
                str('date', 'Data (italiano)'),
                opt(str('date_en', 'Data (inglese, se diversa)')),
                bool('verifiable', 'Verificabile on-chain'),
                opt(str('score', 'Punteggio')),
                opt(str('certUrl', 'Link al corso/certificato')),
                opt(str('txid', 'TxID Bitcoin')),
                opt(str('hash', 'Hash certificato')),
                opt(long('signedText', 'Testo firmato')),
                opt(str('gpgFingerprint', 'Fingerprint GPG')),
                fileField('file', 'PDF del certificato', '/public/certs', '/certs'),
              ],
            },
            {
              name: 'competitions', label: 'Competizioni', widget: 'list', summary: '{{fields.name.it}}',
              fields: [pair('name', 'Nome'), pair('role', 'Ruolo'), pair('note', 'Nota')],
            },
            {
              name: 'downloadableCerts', label: 'Certificati scaricabili', widget: 'list', summary: '{{fields.name}}',
              fields: [
                str('name', 'Nome'),
                pair('description', 'Descrizione'),
                fileField('file', 'File PDF', '/public/certs', '/certs'),
                {
                  name: 'icon', label: 'Icona', widget: 'select', default: 'award',
                  options: [
                    { label: 'Bitcoin', value: 'bitcoin' },
                    { label: 'Robotica', value: 'bot' },
                    { label: 'Rete / web', value: 'globe' },
                    { label: 'Premio', value: 'award' },
                    { label: 'Sicurezza', value: 'shield-check' },
                    { label: 'Laurea / studio', value: 'graduation-cap' },
                    { label: 'Documento', value: 'file-text' },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'projects', label: 'Progetti', file: 'src/data/content/projects.json',
          fields: [{
            name: 'projects', label: 'Progetti', widget: 'list', summary: '{{fields.name}}',
            fields: [
              str('name', 'Nome (italiano)'),
              opt(str('name_en', 'Nome (inglese, se diverso)')),
              pair('description', 'Descrizione', 'text'),
              { ...list('tech', 'Tecnologie', str('item', 'Tecnologia')) },
              opt(str('url', 'Link (GitHub o sito)')),
              bool('featured', 'In evidenza'),
            ],
          }],
        },
        {
          name: 'skills', label: 'Competenze e lingue', file: 'src/data/content/skills.json',
          fields: [
            {
              name: 'skills', label: 'Competenze', widget: 'object',
              fields: [
                {
                  name: 'languages', label: 'Linguaggi (con livello)', widget: 'list', summary: '{{fields.name}} {{fields.level}}%',
                  fields: [str('name', 'Nome'), { name: 'level', label: 'Livello (0-100)', widget: 'number', value_type: 'int', min: 0, max: 100 }],
                },
                strList('frameworks', 'Framework'),
                strList('databases', 'Database'),
                strList('devops', 'DevOps'),
                strList('networking', 'Networking'),
                strList('hardware', 'Hardware'),
                strList('blockchain', 'Blockchain'),
                strList('ai', 'AI'),
              ],
            },
            {
              name: 'languages', label: 'Lingue parlate', widget: 'list', summary: '{{fields.lang}}',
              fields: [str('lang', 'Lingua'), pair('level', 'Livello'), str('code', 'Codice (es. C1)')],
            },
          ],
        },
      ],
    },
  ],
};

const ADMIN_HTML = `<!doctype html>
<html lang="it"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Gestione CV</title>
<link rel="cms-config-url" type="text/yaml" href="/admin/config.yml">
</head><body><script src="${CMS_URL}"></script></body></html>`;

// ---------- helpers ----------
const SEC = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'cache-control': 'no-store',
};
const html = (body, status = 200, extra = {}) =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', ...SEC, ...extra } });

const cookie = (name) => (req) =>
  (req.headers.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(name + '='))?.slice(name.length + 1);
const stateCookie = cookie('oauth_state');

function resultPage(status, payload) {
  // Standard Decap/Sveltia popup handshake; message is only sent to our own origin.
  const msg = `authorization:github:${status}:${JSON.stringify(payload)}`;
  return html(`<!doctype html><meta charset="utf-8"><title>Login</title><body><script>
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
</script></body>`, 200, { 'set-cookie': 'oauth_state=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax' });
}

// ---------- routes ----------
export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === '/' ) return Response.redirect(`${ORIGIN}/admin/`, 302);
    if (url.pathname === '/admin' || url.pathname === '/admin/') return html(ADMIN_HTML);
    if (url.pathname === '/admin/config.yml')
      return new Response(JSON.stringify(config), { headers: { 'content-type': 'text/yaml; charset=utf-8', ...SEC } });

    if (url.pathname === '/auth') {
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

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!code || !state || state !== stateCookie(req)) return resultPage('error', { error: 'invalid_state' });

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
      if (!me.login || me.login.toLowerCase() !== env.ALLOWED_USER.toLowerCase())
        return resultPage('error', { error: 'user_not_allowed' });

      return resultPage('success', { token, provider: 'github' });
    }

    return new Response('Not found', { status: 404, headers: SEC });
  },
};
