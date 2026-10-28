# manage.retenasa.dev

Cloudflare Worker that serves [Sveltia CMS](https://github.com/sveltia/sveltia-cms) and the GitHub OAuth login used to edit the CV content in `src/data/content/*.json` and the PDFs in `public/certs/`.
Every save in the CMS is a commit on `main`, which triggers the normal GitHub Pages deploy.

## Access control

- Only the GitHub login in `ALLOWED_USER` (`dany80213`) can sign in; anyone else is rejected by the Worker even if they have write access to the repo.
- The OAuth token goes to the browser only after that check. It is never stored by the Worker.

## One-time setup

1. GitHub → Settings → Developer settings → OAuth Apps → New:
   - Homepage URL: `https://manage.retenasa.dev`
   - Authorization callback URL: `https://manage.retenasa.dev/callback`
2. Cloudflare → Workers → `cv-manage` → Settings → Variables and Secrets:
   - `GITHUB_CLIENT_ID` (text) = the app's Client ID
   - `GITHUB_CLIENT_SECRET` (secret) = a generated client secret
3. Open <https://manage.retenasa.dev/admin/> and sign in with GitHub.

## Deploying changes to the Worker

`worker.js` is uploaded with Wrangler (`npx wrangler deploy` from this folder) or the Cloudflare API. Existing secrets are kept across deploys.
The CMS script is pinned in `worker.js` (`CMS_URL`); bump it deliberately.

## Editing the schema

If you add a field to a JSON file in `src/data/content/`, add the matching field in the `config` object in `worker.js`, otherwise the CMS will drop it on the next save.
