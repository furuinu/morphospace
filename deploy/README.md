# MORPHOSPACE: XServer pull deployment

Canonical repository: `furuinu/morphospace` (`main`).

## Mechanism
The existing XServer cron job downloads the latest **successful** GitHub Pages workflow revision on `main` using HTTPS. From that same immutable commit, it downloads both `about-i18n.js` and `index.html`, validates the pair, stages both, backs up any previous files and moves the JavaScript **before** the HTML. This preserves the Actions pass/fail release gate without needing Git, SSH or Node.js on XServer. Both public files and the recorded deployed SHA are mode `0644`.

The `index.html` retains embedded `surface-reaction.js` and the inert old XServer compatibility marker for `voice-styles.js`. Only the local `about-i18n.js` script reference is permitted. The experimental voice-style code is not loaded. No other public files or OGP data are removed. The mirrored release is the source revision rather than the GitHub Pages build-number-stamped artifact; its visible version suffix may differ.

### Upgrading an existing XServer installation (replace only the script)
1. Download the updated `deploy/xserver-pull.sh`.
2. Open XServer File Manager and locate the script the **existing cron command** invokes, typically `/home/hakatamasala/morphospace-deploy/xserver-pull.sh`.
3. Upload the updated file **over the existing script at that exact path**. Do not place it under `public_html`. Do not rename it to `sync-xserver.sh`.
4. Preserve existing cron settings (e.g. `/bin/sh /home/hakatamasala/morphospace-deploy/xserver-pull.sh >> /home/hakatamasala/morphospace-deploy/deploy.log 2>&1`). The script file itself can be mode `0600` or `0644` because it is invoked with `/bin/sh`; it does not require execute permission, but must be readable by the cron user.
5. Invoke the script once or let the next scheduled cron run. Check its log for `deployed <SHA> (index.html + about-i18n.js; permissions 644)`. Verify `https://morphospace.masalakitchen.jp/` and the 13-language About dialog.

If the installed cron command points elsewhere, replace that file rather than changing cron paths blindly. GitHub repository commits **do not** overwrite an already-installed XServer cron script.

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
- This job currently deploys the exact pair `index.html` and `about-i18n.js`. Additional external production dependencies require updates to both the Pages allowlist and the server pull script before deployment. Updating the script in GitHub does not replace a copy already installed on XServer.
- Successful Pages runs are used as the release gate. An older successful commit can be selected if the newest commit fails tests; the deployment therefore may lag `main`.
- The current shell script trusts HTTPS to GitHub and the successful workflow's head SHA. For stricter supply-chain assurance, publish a signed manifest.
- Existing unrelated site files and future OGP storage are not deleted. A failed download or validation leaves the previous published HTML unchanged.
- Do not enable cron before verifying document root and dependencies.
- `XSERVER_*` SSH Secrets are no longer needed for this pull method, but do not delete them until the migration is verified.

## Audio preset experiment (archived 2026-10-28)
Production plays the original organism voice only. The five-style experiment, its research and old test fixtures remain as source under `experimental/voice-styles.js`, `docs/voice-styles-spec.md` and `tests/voice-styles.test.cjs`. The production About dialog uses the separately deployed same-origin `about-i18n.js`; other external production scripts must not be added without first updating the Pages allowlist and the XServer release script. Once all installed historical cron checkers have been updated, the inert legacy compatibility comment can be removed.
