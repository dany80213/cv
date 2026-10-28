import { FILES, GITHUB_DATA_PATH } from './schema.js';
import { syncProjects } from './sync.js';
import * as api from './github.js';
import { icon } from './icons.js';

const SITE = 'https://cv.retenasa.dev';

// ---------- tiny DOM helpers ----------
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
}
const ico = (name, cls = '') => {
  const t = document.createElement('template');
  t.innerHTML = icon(name, cls);
  return t.content.firstChild;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const app = document.getElementById('app');

// ---------- state ----------
const state = {
  user: null,
  current: FILES[0].id,
  docs: {},        // id -> { data, sha, saved, error }
  errors: [],      // validation errors of the current save attempt
  saving: false,
  deploy: null,    // { status: 'queued' | 'running' | 'ok' | 'fail' | 'unknown', url? }
};
const dirCache = {};
const openState = new WeakMap();

const isDirty = (id) => {
  const d = state.docs[id];
  return !!d && !d.error && JSON.stringify(d.data) !== d.saved;
};
const anyDirty = () => FILES.some((f) => isDirty(f.id));

// ---------- theme / toasts ----------
// The favicon follows the browser theme by default; once a theme is chosen it follows that one.
function setFavicon(t) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = `${SITE}/favicon-${t}.svg`;
  document.querySelector('link[rel="icon"]')?.replaceWith(link);
}
// `explicit` is false for the initial default, so nothing is remembered until the user picks a theme.
function applyTheme(t, { explicit = true } = {}) {
  document.documentElement.dataset.theme = t;
  if (!explicit) return;
  setFavicon(t);
  try { localStorage.setItem('cv-manage-theme', t); } catch { /* ignore */ }
}
try {
  const saved = localStorage.getItem('cv-manage-theme');
  applyTheme(saved === 'light' ? 'light' : 'dark', { explicit: !!saved });
} catch { /* ignore */ }

function toast(msg, kind = 'ok') {
  const t = h('div', { class: `toast ${kind === 'err' ? 'err' : ''}` }, ico(kind === 'err' ? 'circle-alert' : 'circle-check'), h('span', {}, msg));
  document.getElementById('toasts').append(t);
  setTimeout(() => t.remove(), kind === 'err' ? 8000 : 4000);
}

// ---------- auth ----------
function showLogin(error) {
  app.replaceChildren(
    h('div', { class: 'login' },
      h('div', { class: 'term' },
        h('div', { class: 'term-bar' },
          ...['#ff5f57', '#febc2e', '#28c840'].map((c) => { const d = h('i'); d.style.background = c; return d; }),
          h('span', {}, 'daniele@manage:~')),
        h('div', { class: 'term-body' },
          h('p', {}, h('span', { class: 'hi' }, '❯ '), 'Gestione contenuti del CV'),
          h('p', {}, 'Accedi con GitHub per modificare profilo, progetti e certificati. Ogni salvataggio viene pubblicato sul sito.'),
          error ? h('p', { class: 'login-error', role: 'alert' }, error) : null,
          h('button', { class: 'btn btn-primary', onclick: login }, ico('github'), 'Accedi con GitHub')))));
}

function login() {
  const popup = window.open('/auth', 'cv-login', 'width=620,height=720');
  if (!popup) return showLogin('Il browser ha bloccato la finestra di login. Consenti i popup e riprova.');
  const onMessage = async (e) => {
    if (e.origin !== location.origin) return;
    if (e.data === 'authorizing:github') { e.source.postMessage('authorizing:github', e.origin); return; }
    const m = /^authorization:github:(success|error):([\s\S]*)$/.exec(String(e.data));
    if (!m) return;
    window.removeEventListener('message', onMessage);
    let payload = {};
    try { payload = JSON.parse(m[2]); } catch { /* ignore */ }
    if (m[1] === 'success' && payload.token) { api.setToken(payload.token); await boot(); return; }
    const reasons = {
      user_not_allowed: 'Questo account GitHub non è autorizzato.',
      invalid_state: 'Sessione di login scaduta, riprova.',
    };
    showLogin(reasons[payload.error] || 'Login non riuscito. Riprova.');
  };
  window.addEventListener('message', onMessage);
}

function logout() {
  if (anyDirty() && !confirm('Hai modifiche non salvate. Uscire comunque?')) return;
  api.setToken(null);
  state.user = null;
  state.docs = {};
  showLogin();
}

// ---------- form fields ----------
let uid = 0;
const labelOf = (f) => h('span', { class: 'lbl' }, f.label, f.required && f.type !== 'bool' ? h('em', {}, ' *') : null);
const hintOf = (f) => (f.hint ? h('span', { class: 'hint' }, f.hint) : null);

function fieldsEl(fields, obj) {
  return fields.map((f) => fieldEl(f, obj));
}

function fieldEl(f, obj) {
  switch (f.type) {
    case 'group': return h('section', { class: 'card group wide' }, h('h3', {}, f.label), ...fieldsEl(f.fields, obj));
    case 'object': return h('fieldset', { class: 'sub wide' }, h('legend', {}, f.label), ...fieldsEl(f.fields, (obj[f.key] ??= {})));
    case 'string': return stringEl(f, obj);
    case 'text': return textEl(f, obj);
    case 'number': return numberEl(f, obj);
    case 'bool': return boolEl(f, obj);
    case 'select': return selectEl(f, obj);
    case 'pair': return pairEl(f, obj);
    case 'strlist': return strlistEl(f, () => obj, f.key);
    case 'pairlist': return pairlistEl(f, obj);
    case 'list': return listEl(f, obj);
    case 'file': return fileEl(f, obj);
    default: return h('p', { class: 'hint' }, `Campo non supportato: ${f.type}`);
  }
}

function setValue(obj, f, v) {
  if (v === '' && !f.required) delete obj[f.key];
  else obj[f.key] = v;
  changed();
}

function stringEl(f, obj) {
  const input = h('input', { type: f.inputType || 'text', value: obj[f.key] ?? '', autocomplete: 'off', spellcheck: 'false', 'data-key': f.key });
  input.addEventListener('input', () => setValue(obj, f, input.value));
  return h('label', { class: 'field' }, labelOf(f), input, hintOf(f));
}

function textEl(f, obj) {
  const ta = h('textarea', { rows: f.rows || 3, spellcheck: 'false' });
  ta.value = obj[f.key] ?? '';
  ta.addEventListener('input', () => setValue(obj, f, ta.value));
  return h('label', { class: 'field wide' }, labelOf(f), ta, hintOf(f));
}

function numberEl(f, obj) {
  const input = h('input', { type: 'number', value: obj[f.key] ?? '', min: f.min, max: f.max, step: 1, inputmode: 'numeric' });
  input.addEventListener('input', () => {
    if (input.value === '') delete obj[f.key];
    else obj[f.key] = Number(input.value);
    changed();
  });
  return h('label', { class: 'field' }, labelOf(f), input, hintOf(f));
}

function boolEl(f, obj) {
  const input = h('input', { type: 'checkbox' });
  input.checked = !!obj[f.key];
  input.addEventListener('change', () => { obj[f.key] = input.checked; changed(); });
  return h('label', { class: 'switch wide' }, input, h('span', {}, h('span', { class: 'lbl' }, f.label), f.hint ? h('span', { class: 'hint' }, ' · ' + f.hint) : null));
}

function selectEl(f, obj) {
  const current = obj[f.key];
  const opts = f.options.map(([v, l]) => h('option', { value: v }, l));
  if (current && !f.options.some(([v]) => v === current)) opts.unshift(h('option', { value: current }, `Personalizzata: ${current}`));
  if (!current) opts.unshift(h('option', { value: '' }, '— scegli —'));
  const sel = h('select', {}, ...opts);
  sel.value = current ?? '';
  sel.addEventListener('change', () => setValue(obj, f, sel.value));
  return h('label', { class: 'field' }, labelOf(f), sel, hintOf(f));
}

function pairEl(f, obj) {
  const make = (lang, tag) => {
    const el = f.multiline ? h('textarea', { rows: f.rows || 4, spellcheck: 'false' }) : h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false' });
    el.value = obj[f.key]?.[lang] ?? '';
    el.addEventListener('input', () => {
      (obj[f.key] ??= {})[lang] = el.value;
      if (!f.required && !obj[f.key].it && !obj[f.key].en) delete obj[f.key];
      changed();
    });
    return h('label', {}, h('span', { class: 'tag' }, tag), el);
  };
  return h('div', { class: 'field wide' }, labelOf(f), h('div', { class: 'pair' }, make('it', 'Italiano'), make('en', 'English')), hintOf(f));
}

// A list of plain strings stored at parent(true)[key]. parent(false) must not create anything:
// the array (and a missing parent object) only come into existence when something is added.
function strlistEl(f, parent, key, label = f.label) {
  const host = h('div', { class: 'rows' });
  const arr = () => parent(false)[key] || [];
  const draw = (focusLast) => {
    const rows = arr().map((value, i) => {
      const input = h('input', { type: 'text', value, autocomplete: 'off', spellcheck: 'false', 'aria-label': `${label} ${i + 1}` });
      input.addEventListener('input', () => { parent(true)[key][i] = input.value; changed(); });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); parent(true)[key].splice(i + 1, 0, ''); changed(); draw(i + 1); }
      });
      const rm = h('button', { type: 'button', class: 'btn btn-ghost btn-icon', 'aria-label': 'Rimuovi', onclick: () => { parent(true)[key].splice(i, 1); changed(); draw(); } }, ico('x'));
      return h('div', { class: 'row' }, input, rm);
    });
    const add = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => { (parent(true)[key] ??= []).push(''); changed(); draw(arr().length - 1); } }, ico('plus'), 'Aggiungi');
    host.replaceChildren(...rows, h('div', {}, add));
    if (focusLast !== undefined) host.querySelectorAll('input')[focusLast]?.focus();
  };
  draw();
  return h('div', { class: 'field wide' }, h('span', { class: 'lbl' }, label), host);
}

function pairlistEl(f, obj) {
  const parent = (create) => obj[f.key] ?? (create ? (obj[f.key] = {}) : {});
  return h('fieldset', { class: 'sub wide' }, h('legend', {}, f.label),
    h('div', { class: 'pair' },
      strlistEl(f, parent, 'it', 'Italiano'),
      strlistEl(f, parent, 'en', 'English')));
}

function defaults(fields) {
  const o = {};
  for (const f of fields) {
    if (f.type === 'group') Object.assign(o, defaults(f.fields));
    else if (f.type === 'string' && f.required) o[f.key] = '';
    else if (f.type === 'bool') o[f.key] = false;
    else if (f.type === 'number' && f.required) o[f.key] = 0;
    else if (f.type === 'pair' && f.required) o[f.key] = { it: '', en: '' };
    else if (f.type === 'pairlist') o[f.key] = { it: [], en: [] };
    else if (f.type === 'strlist') o[f.key] = [];
    else if (f.type === 'select') o[f.key] = f.options[0][0];
  }
  return o;
}

const slugify = (t) => String(t || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function listEl(f, obj) {
  // Optional lists (e.g. images) are only created when the first item is added, so just opening a form never changes the data.
  const arr = () => obj[f.key] || [];
  const ensure = () => (obj[f.key] ??= []);
  if (f.required !== false) ensure();
  const host = h('div', { class: 'list' });
  const draw = () => {
    const items = arr().map((item, i) => itemEl(item, i));
    const add = h('div', {}, h('button', {
      type: 'button', class: 'btn btn-outline',
      onclick: () => {
        const item = defaults(f.fields);
        openState.set(item, true);
        ensure().push(item);
        changed();
        draw();
        host.querySelectorAll(':scope > details.item')[arr().length - 1]?.querySelector('input, textarea')?.focus();
      },
    }, ico('plus'), f.addLabel || 'Aggiungi'));
    host.replaceChildren(...items, add);
  };

  const itemEl = (item, i) => {
    const title = h('span', { class: 'item-title' }, f.itemLabel(item));
    const move = (d) => (e) => {
      e.preventDefault(); e.stopPropagation();
      const j = i + d;
      if (j < 0 || j >= arr().length) return;
      [arr()[i], arr()[j]] = [arr()[j], arr()[i]];
      changed(); draw();
    };
    const btn = (name, label, fn, cls = 'btn-ghost', disabled = false) =>
      h('button', { type: 'button', class: `btn ${cls} btn-icon`, 'aria-label': label, title: label, disabled, onclick: fn }, ico(name));
    const remove = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!confirm(`Eliminare «${f.itemLabel(item)}»?`)) return;
      arr().splice(i, 1);
      if (!arr().length && f.required === false) delete obj[f.key];
      changed(); draw();
    };
    const d = h('details', { class: 'card item' },
      h('summary', {},
        ico('chevron-down', 'chev'),
        h('span', { class: 'item-num' }, String(i + 1).padStart(2, '0')),
        title,
        h('span', { class: 'item-actions' },
          btn('chevron-up', 'Sposta su', move(-1), 'btn-ghost', i === 0),
          btn('chevron-down', 'Sposta giù', move(1), 'btn-ghost', i === arr().length - 1),
          btn('trash-2', 'Elimina', remove, 'btn-danger'))),
      h('div', { class: 'item-body' }, ...fieldsEl(f.fields, item)));
    d.open = !!openState.get(item);
    d.addEventListener('toggle', (e) => { if (e.target === d) openState.set(item, d.open); });

    // The page address is derived from the name until it is edited by hand.
    let prevName = item[f.autoSlug?.from] || '';
    const refresh = (e) => {
      if (f.autoSlug && e?.target?.dataset?.key === f.autoSlug.from) {
        const { from, to } = f.autoSlug;
        const target = d.querySelector(`:scope > .item-body > label [data-key="${to}"]`);
        if (target && (!item[to] || item[to] === slugify(prevName))) { item[to] = slugify(item[from]); target.value = item[to]; }
        prevName = item[from] || '';
      }
      title.textContent = f.itemLabel(item);
    };
    d.addEventListener('input', refresh);
    d.addEventListener('change', refresh);
    return d;
  };
  draw();
  return h('div', { class: 'wide' }, h('div', { class: 'list-title' }, f.label), host);
}

// ---------- file picker (existing files + upload) ----------
function fileEl(f, obj) {
  const stored = () => obj[f.key];
  const nameOf = (v) => (v ? String(v).split('/').pop() : '');
  const select = h('select', { 'aria-label': f.label });
  const note = h('div', { class: 'file-note' });
  const fileInput = h('input', { type: 'file', accept: f.accept, hidden: true });

  const drawNote = () => {
    const n = nameOf(stored());
    if (!n) { note.replaceChildren(h('span', {}, 'Nessun file selezionato')); return; }
    const url = `${SITE}${f.publicPrefix}${n}`;
    const isImg = /\.(svg|png|webp|jpe?g)$/i.test(n);
    note.replaceChildren(isImg ? h('img', { src: url, alt: '' }) : ico('file-text'), h('a', { href: url, target: '_blank', rel: 'noopener' }, `${f.publicPrefix}${n}`));
  };
  const fill = (names) => {
    const cur = nameOf(stored());
    const all = cur && !names.includes(cur) ? [cur, ...names] : names;
    select.replaceChildren(h('option', { value: '' }, '— nessuno —'), ...all.map((n) => h('option', { value: n }, n)));
    select.value = cur;
  };
  const load = async () => {
    if (!dirCache[f.folder]) dirCache[f.folder] = api.listDir(f.folder).catch(() => []);
    fill(await dirCache[f.folder]);
  };

  select.addEventListener('change', () => {
    const n = select.value;
    if (!n && f.required) delete obj[f.key];
    else if (!n) delete obj[f.key];
    else obj[f.key] = f.storePath ? f.publicPrefix + n : n;
    changed(); drawNote();
  });

  const upload = h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: () => fileInput.click() }, ico('upload'), 'Carica nuovo file');
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (f.accept && !f.accept.split(',').includes(ext)) return toast(`Formato non valido: servono file ${f.accept}`, 'err');
    if (!/^[\w.\- ()]+$/.test(file.name)) return toast('Il nome del file contiene caratteri non ammessi. Usa lettere, numeri, trattini e punti.', 'err');
    const maxMB = f.maxMB ?? 10;
    if (file.size > maxMB * 1024 * 1024) return toast(`File troppo grande (massimo ${maxMB} MB).`, 'err');
    upload.disabled = true;
    try {
      const name = await api.uploadFile(f.folder, file);
      const names = await dirCache[f.folder].catch(() => []);
      if (!names.includes(name)) names.push(name);
      names.sort((a, b) => a.localeCompare(b));
      obj[f.key] = f.storePath ? f.publicPrefix + name : name;
      fill(names); drawNote(); changed();
      toast(`«${name}» caricato su GitHub.`);
    } catch (e) {
      toast(`Caricamento non riuscito: ${e.message}`, 'err');
    } finally { upload.disabled = false; }
  });

  fill([]); drawNote(); load();
  return h('div', { class: 'field file wide' }, labelOf(f), h('div', { class: 'file-row' }, select, upload, fileInput), note,
    h('span', { class: 'hint' }, 'Il file viene caricato subito su GitHub; il collegamento si pubblica quando salvi.'));
}

// ---------- validation ----------
function validate(fields, obj, trail) {
  const errs = [];
  for (const f of fields) {
    const where = [...trail, f.label].join(' › ');
    if (f.type === 'group') { errs.push(...validate(f.fields, obj, trail)); continue; }
    if (f.type === 'object') { errs.push(...validate(f.fields, obj[f.key] || {}, [...trail, f.label])); continue; }
    if (f.type === 'list') {
      const items = obj[f.key] || [];
      items.forEach((item, i) => errs.push(...validate(f.fields, item, [...trail, `${f.label} ${i + 1} (${f.itemLabel(item)})`])));
      for (const field of f.fields.filter((x) => x.unique)) {
        const seen = new Set();
        for (const item of items) {
          const v = item[field.key];
          if (v && seen.has(v)) errs.push(`${where} › ${field.label}: «${v}» è usato da più elementi`);
          seen.add(v);
        }
      }
      continue;
    }
    const v = obj[f.key];
    if (f.type === 'pair') {
      if (f.required && (!v?.it?.trim() || !v?.en?.trim())) errs.push(`${where}: servono italiano e inglese`);
    } else if (f.type === 'number') {
      if (f.required && typeof v !== 'number') errs.push(`${where}: obbligatorio`);
      else if (typeof v === 'number' && ((f.min != null && v < f.min) || (f.max != null && v > f.max))) errs.push(`${where}: valore fuori intervallo`);
    } else if (['string', 'text', 'select', 'file'].includes(f.type)) {
      if (f.required && !String(v ?? '').trim()) errs.push(`${where}: obbligatorio`);
      else if (f.inputType === 'url' && v && !/^https?:\/\//.test(v)) errs.push(`${where}: deve iniziare con http:// o https://`);
      else if (f.pattern && v && !f.pattern.test(v)) errs.push(`${where}: ${f.patternHint || 'formato non valido'}`);
    }
  }
  return errs;
}

// ---------- app shell ----------
async function boot() {
  if (api.hasToken()) {
    try {
      const user = await api.whoami();
      if (user.login.toLowerCase() !== api.OWNER) throw new Error('not allowed');
      state.user = user;
    } catch { api.setToken(null); }
  }
  if (!state.user) return showLogin();
  app.replaceChildren(h('div', { class: 'loading' }, ico('loader-circle', 'spin'), 'Carico i contenuti da GitHub…'));
  await Promise.all(FILES.map(async (file) => {
    try {
      const { data, sha } = await api.readJson(file.path);
      state.docs[file.id] = { data, sha, saved: JSON.stringify(data) };
    } catch (e) {
      state.docs[file.id] = { error: e.message };
    }
  }));
  const fromHash = location.hash.slice(1);
  if (FILES.some((f) => f.id === fromHash)) state.current = fromHash;
  renderApp();
}

function renderApp() {
  app.replaceChildren(
    header(),
    h('div', { class: 'shell' }, nav(), h('main', { class: 'panel', id: 'panel' })),
    h('div', { id: 'savebar-host' }));
  renderPanel();
}

function header() {
  const themeBtn = h('button', { class: 'btn btn-ghost btn-icon', 'aria-label': 'Cambia tema', onclick: () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    themeBtn.replaceChildren(ico(next === 'dark' ? 'sun' : 'moon'));
  } }, ico(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon'));
  return h('header', { class: 'top' },
    h('a', { class: 'brand', href: SITE, target: '_blank', rel: 'noopener' }, '~/', h('span', {}, 'daniele.dev'), '/manage'),
    h('span', { class: 'spacer' }),
    h('span', { id: 'deploy' }),
    h('a', { class: 'btn btn-ghost btn-sm', href: SITE, target: '_blank', rel: 'noopener' }, ico('external-link'), 'Apri il CV'),
    themeBtn,
    h('span', { class: 'who' }, ico('github'), '@' + state.user.login),
    h('button', { class: 'btn btn-ghost btn-sm', onclick: logout }, ico('log-out'), 'Esci'));
}

function nav() {
  return h('nav', { class: 'tabs', 'aria-label': 'Sezioni' }, ...FILES.map((file) =>
    h('button', {
      class: 'tab', 'data-tab': file.id, 'aria-current': String(file.id === state.current),
      onclick: () => { state.current = file.id; state.errors = []; history.replaceState(null, '', '#' + file.id); renderPanel(); },
    }, h('span', {}, file.label), h('span', { class: 'dot', 'data-dot': file.id, hidden: true, title: 'Modifiche non salvate' }))));
}

function renderPanel() {
  const file = FILES.find((f) => f.id === state.current);
  const doc = state.docs[file.id];
  document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-current', String(t.dataset.tab === file.id)));
  const panel = document.getElementById('panel');
  if (doc.error) {
    panel.replaceChildren(h('h1', {}, file.label), h('div', { class: 'card group' }, h('p', {}, `Impossibile leggere ${file.path}: ${doc.error}`),
      h('div', {}, h('button', { class: 'btn btn-outline', onclick: boot }, ico('refresh-cw'), 'Riprova'))));
  } else {
    panel.replaceChildren(h('h1', {}, file.label), h('p', { class: 'hint' }, file.hint), actionsBar(file), ...fieldsEl(file.fields, doc.data));
  }
  renderSavebar();
  refreshDirty();
}

function actionsBar(file) {
  if (!file.actions?.length) return null;
  const handlers = { 'sync-github': syncGithub };
  return h('div', { class: 'actions' }, ...file.actions.map((a) => h('div', { class: 'action' },
    h('button', { type: 'button', class: 'btn btn-outline', 'data-action': a.id, onclick: (e) => handlers[a.id](e.currentTarget) }, ico(a.id === 'sync-github' ? 'github' : 'refresh-cw'), a.label),
    h('span', { class: 'hint' }, a.hint))));
}

// Downloads README, stars, languages... for every project with a GitHub URL and commits them to github.json.
async function syncGithub(button) {
  if (isDirty('projects')) return toast('Pubblica prima le modifiche ai progetti, poi sincronizza.', 'err');
  const projects = state.docs.projects.data.projects;
  button.disabled = true;
  const label = button.lastChild;
  const idle = label.textContent;
  try {
    const { data: existing, sha } = await api.readJsonOrDefault(GITHUB_DATA_PATH, {});
    const res = await syncProjects(projects, existing, api.get, (slug) => { label.textContent = `Sincronizzo ${slug}…`; });
    if (!res.synced.length) {
      toast(res.failed.length ? `Sincronizzazione non riuscita: ${res.failed.map((x) => `${x.slug} (${x.error})`).join(', ')}` : 'Nessun progetto con un repository GitHub da sincronizzare.', 'err');
      return;
    }
    const { commit } = await api.writeJson(GITHUB_DATA_PATH, res.data, sha, 'content: sync GitHub data');
    const parts = [`Sincronizzati: ${res.synced.join(', ')}.`];
    if (res.failed.length) parts.push(`Non riusciti: ${res.failed.map((x) => x.slug).join(', ')}.`);
    toast(parts.join(' ') + ' Il sito si aggiorna tra circa un minuto.', res.failed.length ? 'err' : 'ok');
    trackDeploy(commit);
  } catch (e) {
    if (e.status === 401) { api.setToken(null); state.user = null; showLogin('Sessione scaduta, accedi di nuovo.'); return; }
    toast(`Sincronizzazione non riuscita: ${e.message}`, 'err');
  } finally {
    label.textContent = idle;
    button.disabled = false;
  }
}

function renderSavebar() {
  const host = document.getElementById('savebar-host');
  const file = FILES.find((f) => f.id === state.current);
  const doc = state.docs[file.id];
  if (doc.error) { host.replaceChildren(); return; }
  const dirty = isDirty(file.id);
  const errs = state.errors.length
    ? h('div', { class: 'errors', role: 'alert' }, h('strong', {}, 'Controlla questi campi prima di pubblicare:'), h('ul', {}, ...state.errors.slice(0, 12).map((e) => h('li', {}, e))))
    : null;
  host.replaceChildren(...[
    errs,
    h('div', { class: 'savebar' },
      h('span', { class: `msg ${dirty ? 'dirty' : ''}` }, ico(dirty ? 'circle-alert' : 'circle-check'), dirty ? 'Modifiche non pubblicate' : 'Tutto pubblicato'),
      h('button', { class: 'btn btn-ghost', disabled: !dirty || state.saving, onclick: revert }, 'Annulla modifiche'),
      h('button', { class: 'btn btn-primary', id: 'save-btn', disabled: !dirty || state.saving, onclick: save },
        state.saving ? ico('loader-circle', 'spin') : ico('save'), state.saving ? 'Pubblico…' : 'Pubblica')),
  ].filter(Boolean));
}

function refreshDirty() {
  FILES.forEach((f) => { const dot = document.querySelector(`[data-dot="${f.id}"]`); if (dot) dot.hidden = !isDirty(f.id); });
  const file = FILES.find((f) => f.id === state.current);
  const dirty = isDirty(file.id);
  const msg = document.querySelector('.savebar .msg');
  if (msg) {
    msg.className = `msg ${dirty ? 'dirty' : ''}`;
    msg.replaceChildren(ico(dirty ? 'circle-alert' : 'circle-check'), dirty ? 'Modifiche non pubblicate' : 'Tutto pubblicato');
  }
  document.querySelectorAll('.savebar .btn').forEach((b) => { b.disabled = !dirty || state.saving; });
}
function changed() { refreshDirty(); }

function revert() {
  const id = state.current;
  if (!confirm('Scartare le modifiche non pubblicate di questa sezione?')) return;
  state.docs[id].data = JSON.parse(state.docs[id].saved);
  state.errors = [];
  renderPanel();
}

async function save() {
  const file = FILES.find((f) => f.id === state.current);
  const doc = state.docs[file.id];
  state.errors = validate(file.fields, doc.data, []);
  if (state.errors.length) { renderSavebar(); return; }
  state.saving = true; state.errors = []; renderSavebar();
  try {
    const { sha, commit } = await api.writeJson(file.path, doc.data, doc.sha, `content: update ${file.id}`);
    doc.sha = sha;
    doc.saved = JSON.stringify(doc.data);
    toast(`«${file.label}» pubblicato. Il sito si aggiorna tra circa un minuto.`);
    trackDeploy(commit);
  } catch (e) {
    if (e.status === 401) { api.setToken(null); state.user = null; showLogin('Sessione scaduta, accedi di nuovo.'); return; }
    if (e.status === 409 || e.status === 422) toast('Il file è cambiato su GitHub dopo che lo hai aperto. Ricarica la pagina per vedere la versione aggiornata (le tue modifiche non salvate andranno perse).', 'err');
    else toast(`Pubblicazione non riuscita: ${e.message}`, 'err');
  } finally {
    state.saving = false;
    renderSavebar(); refreshDirty();
  }
}

// ---------- deploy status ----------
function renderDeploy() {
  const el = document.getElementById('deploy');
  if (!el) return;
  const s = state.deploy;
  if (!s) { el.replaceChildren(); return; }
  const map = {
    queued: ['busy', 'loader-circle', 'Pubblicazione in coda…'],
    running: ['busy', 'loader-circle', 'Pubblicazione in corso…'],
    ok: ['ok', 'circle-check', 'Sito aggiornato'],
    fail: ['fail', 'circle-alert', 'Pubblicazione fallita'],
    unknown: ['', 'circle-alert', 'Stato sconosciuto'],
  };
  const [cls, name, text] = map[s.status];
  const badge = h('span', { class: `badge ${cls}` }, ico(name, cls === 'busy' ? 'spin' : ''), text);
  el.replaceChildren(s.url ? h('a', { href: s.url, target: '_blank', rel: 'noopener' }, badge) : badge);
}

let deployToken = 0;
async function trackDeploy(commit) {
  const mine = ++deployToken;
  state.deploy = { status: 'queued' }; renderDeploy();
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    if (mine !== deployToken || !state.user) return;
    const run = await api.runForCommit(commit).catch(() => null);
    if (!run) continue;
    if (run.status === 'completed') {
      state.deploy = { status: run.conclusion === 'success' ? 'ok' : 'fail', url: run.html_url };
      renderDeploy();
      return;
    }
    state.deploy = { status: 'running' }; renderDeploy();
  }
  state.deploy = { status: 'unknown' }; renderDeploy();
}

// ---------- start ----------
window.addEventListener('beforeunload', (e) => { if (anyDirty()) { e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (state.user && FILES.some((f) => f.id === id) && id !== state.current) { state.current = id; state.errors = []; renderPanel(); }
});
boot();
