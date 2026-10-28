# MORPHOSPACE: XServer pull deployment

Canonical repository: `furuinu/morphospace` (`main`).

## Mechanism
The XServer cron job fetches the latest successful GitHub Pages workflow run on `main`, downloads the corresponding immutable `index.html`, checks its size and signature, then atomically replaces the site's `index.html`. The server intentionally does **not** fetch sibling JavaScript files. Accordingly, `index.html` embeds **both** `voice-styles.js` and `surface-reaction.js` inline; there must be no runtime `<script src="…">` dependencies. CI checks that each embedded script exactly matches its maintained source and runs a real Web Audio browser smoke test. The source files remain in the repository for modular tests and editing. It does not use inbound SSH or touch OGP data. It deploys source HTML, not the GitHub Pages workflow's build-number-stamped HTML; visible build suffix may differ from Pages.

## One-time setup
1. Keep XServer SSH foreign-access restriction **ON**.
2. Verify that XServer cron can execute `/bin/sh`, `curl`, and `python3`. If `python3` is unavailable, do not schedule this script until adapted.
3. Using XServer File Manager, upload `deploy/xserver-pull.sh` to a **non-public** directory such as `/home/hakatamasala/morphospace-deploy/xserver-pull.sh` (create it first). Do not put it under `public_html`.
4. In XServer's cron settings, add a job, for example every 5 minutes:
   `/bin/sh /home/hakatamasala/morphospace-deploy/xserver-pull.sh >> /home/hakatamasala/morphospace-deploy/deploy.log 2>&1`
5. Run it once manually if possible and confirm `https://morphospace.masalakitchen.jp/` serves the current organism app. If the path or cron command differs, adjust before scheduling.
6. Do not disable GitHub Pages until the new site is verified.

## Caveats
- The GitHub API is unauthenticated and subject to rate limits; every-five-minutes polling typically uses about 288 API requests/day. Use 10–15 minute intervals if limits are encountered.
- This job only updates `index.html`. Any new JavaScript module must be bundled inline into the HTML, with its source checked for identity by CI, **or** the server cron script itself must be upgraded before introducing a separate dependency. Updating this script in GitHub alone does not replace the copy already installed on XServer.
- Successful Pages runs are used as the release gate. An older successful commit can be selected if the newest commit fails tests; the deployment therefore may lag `main`.
- The current shell script trusts HTTPS to GitHub and the successful workflow's head SHA. For stricter supply-chain assurance, publish a signed manifest.
- Existing site files and future OGP storage are not deleted.
- Do not enable cron before verifying document root and dependencies.
- `XSERVER_*` SSH Secrets are no longer needed for this pull method, but do not delete them until the migration is verified.
