// Describes every JSON file under src/data/content/ and how to edit it.
// If you add a key to a JSON file, add the matching field here, otherwise it is
// kept untouched but cannot be edited from the page.
//
// Field types: string, text, number, bool, select, pair (it/en), strlist,
// pairlist ({ it: [], en: [] }), object, list (array of objects), file.

const str = (key, label, extra = {}) => ({ type: 'string', key, label, required: true, ...extra });
const opt = (key, label, extra = {}) => str(key, label, { required: false, ...extra });
const pair = (key, label, extra = {}) => ({ type: 'pair', key, label, required: true, ...extra });
const strlist = (key, label, extra = {}) => ({ type: 'strlist', key, label, ...extra });
const pairlist = (key, label) => ({ type: 'pairlist', key, label });
const bool = (key, label, hint) => ({ type: 'bool', key, label, hint });

export const ICONS = [
  ['bitcoin', 'Bitcoin'],
  ['bot', 'Robotica'],
  ['globe', 'Rete / web'],
  ['award', 'Premio'],
  ['shield-check', 'Sicurezza'],
  ['graduation-cap', 'Laurea / studio'],
  ['file-text', 'Documento'],
];

export const FILES = [
  {
    id: 'profile',
    label: 'Profilo',
    hint: 'Nome, contatti, presentazione e hobby.',
    path: 'src/data/content/profile.json',
    fields: [
      { type: 'group', label: 'Dati personali', fields: [
        str('name', 'Nome e cognome'),
        { type: 'number', key: 'age', label: 'Età', required: true, min: 0, max: 120 },
        str('location', 'Città'),
        str('projectsCount', 'Numero progetti', { hint: 'Come appare nelle statistiche, es. 12+' }),
      ] },
      { type: 'group', label: 'Contatti', fields: [
        str('email', 'Email', { inputType: 'email' }),
        str('github', 'Username GitHub'),
        str('githubUrl', 'Link GitHub', { inputType: 'url' }),
      ] },
      { type: 'group', label: 'Presentazione', fields: [
        pair('roles', 'Ruolo'),
        pair('tagline', 'Tagline'),
        pair('about', 'Chi sono', { multiline: true }),
      ] },
      { type: 'group', label: 'Altro', fields: [
        pairlist('softSkills', 'Soft skills'),
        pairlist('hobbies', 'Hobby'),
        { type: 'object', key: 'pcto', label: 'PCTO', fields: [
          { type: 'number', key: 'hours', label: 'Ore', required: true, min: 0 },
          str('it', 'Descrizione (italiano)'),
          str('en', 'Descrizione (inglese)'),
        ] },
      ] },
    ],
  },
  {
    id: 'education',
    label: 'Formazione',
    hint: 'Scuole e percorsi di studio.',
    path: 'src/data/content/education.json',
    fields: [
      { type: 'list', key: 'education', label: 'Percorsi', itemLabel: (i) => i.school || 'Nuovo percorso', addLabel: 'Aggiungi percorso', fields: [
        str('school', 'Scuola / università'),
        str('location', 'Luogo'),
        pair('degree', 'Titolo'),
        str('period', 'Periodo', { hint: 'Es. 2021 – 2027' }),
        bool('current', 'In corso', 'Mostra il badge «in corso»'),
        pairlist('highlights', 'Punti salienti'),
      ] },
    ],
  },
  {
    id: 'certifications',
    label: 'Certificazioni',
    hint: 'Certificazioni, competizioni e certificati scaricabili.',
    path: 'src/data/content/certifications.json',
    fields: [
      { type: 'list', key: 'certifications', label: 'Certificazioni', itemLabel: (i) => i.name || 'Nuova certificazione', addLabel: 'Aggiungi certificazione', fields: [
        str('name', 'Nome (italiano)'),
        opt('name_en', 'Nome (inglese)', { hint: 'Solo se diverso dall’italiano' }),
        { type: 'file', key: 'logo', label: 'Logo', required: false, folder: 'public/assets/logos', publicPrefix: '/assets/logos/', storePath: true, accept: '.svg,.png,.webp' },
        pair('issuer', 'Ente'),
        str('date', 'Data (italiano)'),
        opt('date_en', 'Data (inglese)', { hint: 'Solo se diversa dall’italiano' }),
        { type: 'file', key: 'file', label: 'PDF del certificato', required: false, folder: 'public/certs', publicPrefix: '/certs/', accept: '.pdf' },
        bool('verifiable', 'Verificabile on-chain', 'Mostra il pulsante «Verify on-chain»'),
        { type: 'group', label: 'Dati on-chain e firma (facoltativi)', fields: [
          opt('score', 'Punteggio'),
          opt('certUrl', 'Link al corso', { inputType: 'url' }),
          opt('txid', 'TxID Bitcoin'),
          opt('hash', 'Hash certificato'),
          opt('gpgFingerprint', 'Fingerprint GPG'),
          { type: 'text', key: 'signedText', label: 'Testo firmato', required: false, rows: 8 },
        ] },
      ] },
      { type: 'list', key: 'competitions', label: 'Competizioni', itemLabel: (i) => i.name?.it || 'Nuova competizione', addLabel: 'Aggiungi competizione', fields: [
        pair('name', 'Nome'),
        pair('role', 'Ruolo'),
        pair('note', 'Nota'),
      ] },
      { type: 'list', key: 'downloadableCerts', label: 'Certificati scaricabili', itemLabel: (i) => i.name || 'Nuovo certificato', addLabel: 'Aggiungi certificato', fields: [
        str('name', 'Nome'),
        pair('description', 'Descrizione'),
        { type: 'file', key: 'file', label: 'File PDF', required: true, folder: 'public/certs', publicPrefix: '/certs/', accept: '.pdf' },
        { type: 'select', key: 'icon', label: 'Icona', required: true, options: ICONS },
      ] },
    ],
  },
  {
    id: 'projects',
    label: 'Progetti',
    hint: 'I progetti mostrati nel CV.',
    path: 'src/data/content/projects.json',
    fields: [
      { type: 'list', key: 'projects', label: 'Progetti', itemLabel: (i) => i.name || 'Nuovo progetto', addLabel: 'Aggiungi progetto', fields: [
        str('name', 'Nome (italiano)'),
        opt('name_en', 'Nome (inglese)', { hint: 'Solo se diverso dall’italiano' }),
        pair('description', 'Descrizione', { multiline: true }),
        strlist('tech', 'Tecnologie'),
        opt('url', 'Link', { inputType: 'url', hint: 'GitHub o sito. Vuoto = nessun link' }),
        bool('featured', 'In evidenza', 'I progetti in evidenza sono sempre visibili, gli altri stanno sotto «Altri progetti»'),
      ] },
    ],
  },
  {
    id: 'skills',
    label: 'Competenze',
    hint: 'Linguaggi, strumenti e lingue parlate.',
    path: 'src/data/content/skills.json',
    fields: [
      { type: 'object', key: 'skills', label: 'Competenze', fields: [
        { type: 'list', key: 'languages', label: 'Linguaggi (con livello)', itemLabel: (i) => (i.name ? `${i.name} · ${i.level ?? 0}%` : 'Nuovo linguaggio'), addLabel: 'Aggiungi linguaggio', fields: [
          str('name', 'Nome'),
          { type: 'number', key: 'level', label: 'Livello (0-100)', required: true, min: 0, max: 100 },
        ] },
        strlist('frameworks', 'Framework'),
        strlist('databases', 'Database'),
        strlist('devops', 'DevOps'),
        strlist('networking', 'Networking'),
        strlist('hardware', 'Hardware'),
        strlist('blockchain', 'Blockchain'),
        strlist('ai', 'AI'),
      ] },
      { type: 'list', key: 'languages', label: 'Lingue parlate', itemLabel: (i) => i.lang || 'Nuova lingua', addLabel: 'Aggiungi lingua', fields: [
        str('lang', 'Lingua'),
        pair('level', 'Livello'),
        str('code', 'Codice', { hint: 'Es. C1' }),
      ] },
    ],
  },
];
