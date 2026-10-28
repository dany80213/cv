# manage.retenasa.dev

Admin page to edit the CV content (`src/data/content/*.json`) and upload PDFs/logos, with a GitHub login.
Every save is a commit on `main`, which triggers the normal GitHub Pages deploy. The page shows the deploy status.

```
manage/
├── worker.js      Cloudflare Worker: GitHub OAuth + serves ui/ from this repo
└── ui/            the admin page (plain HTML/CSS/JS modules, no build step, no dependencies)
    ├── index.html, app.css, app.js
    ├── schema.js  which fields each JSON file has and how they are edited
    ├── github.js  GitHub Contents API client
    └── icons.js   inline SVG icons (Lucide ISC, Simple Icons CC0)
```

## How it works

- The Worker serves `ui/*` from `raw.githubusercontent.com/.../main/manage/ui/` (whitelisted file names only, cached ~1 min). **Changing the page is a normal PR; no Worker redeploy is needed.**
- Login: the page opens `/auth` in a popup, GitHub redirects to `/callback`, and the Worker hands the token back to the page with `postMessage` to its own origin only.
- Only the GitHub user in `ALLOWED_USER` (`dany80213`) gets a token; anyone else is refused by the Worker, even if they have write access to the repo.
- The token stays in the browser tab (`sessionStorage`) and goes only to `api.github.com`. The Worker never stores it.
- A strict Content-Security-Policy (set by the Worker) limits the page to its own scripts, the GitHub API and the CV site for fonts/images.

## Editing the schema

If you add a key to a JSON file in `src/data/content/`, add the matching field in `ui/schema.js`. Keys the page does not know are preserved on save but cannot be edited.
The icon names for downloadable certificates are listed in `ICONS` (`schema.js`) and must exist in `src/lib/icons.ts`.

## One-time setup

1. GitHub → Settings → Developer settings → OAuth Apps → New:
   - Homepage URL: `https://manage.retenasa.dev`
   - Authorization callback URL: `https://manage.retenasa.dev/callback`
2. Cloudflare → Workers → `cv-manage` → Settings → Variables and Secrets:
   - `GITHUB_CLIENT_ID` (text), `GITHUB_CLIENT_SECRET` (secret), `ALLOWED_USER` (text)
3. Open <https://manage.retenasa.dev/admin/>.

## Deploying the Worker

Only `worker.js` is deployed to Cloudflare (`npx wrangler deploy` from this folder, or the Cloudflare API). Existing secrets are kept.
