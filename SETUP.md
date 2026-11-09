# VIKRAM setup (about 15 minutes, once)

You can use VIKRAM on your laptop right now: open `HARD SKILLS/VIKRAM/index.html` in Chrome.
For phone + laptop sync and notifications, do the steps below once.

## 1. Two GitHub repos
1. **`vikram`** (public): the app. GitHub Pages needs a public repo on the free plan. It contains code and notes only; your personal data is never in it (`js/personal.js` and `_PRIVATE_DO_NOT_UPLOAD/` are git-ignored).
2. **`vikram-data`** (private): your data. Tick "Add a README" when creating it.

**Option A (easiest):** connect GitHub to Claude (claude.ai → Settings → Connectors → GitHub), create both repos, then tell Claude: *"Deploy VIKRAM to <your-username>/vikram"*. Claude pushes the code.
**Option B (manual):** in `vikram` click **Add file → Upload files**, drag in everything inside `HARD SKILLS/VIKRAM` **except** `js/personal.js` and the `_PRIVATE_DO_NOT_UPLOAD` folder, then commit. Then create the notification job: **Add file → Create new file**, name it `.github/workflows/nudges.yml`, and paste in the contents of `workflow/nudges.yml` from this folder. (Windows protects `.github` folders, so the file is kept in `workflow/` on your PC.)

## 2. Turn on GitHub Pages
`vikram` → Settings → Pages → Source: **Deploy from a branch** → `main` / `(root)` → Save.
After a minute your app lives at **https://YOUR-USERNAME.github.io/vikram/**.

## 3. A token for sync (stays on your devices)
GitHub → your photo → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate:
- Repository access: **Only select repositories → vikram-data**
- Permissions: **Contents: Read and write**
- Expiration: the longest offered (put a reminder to renew)
Copy the token.

## 4. Connect each device
Open the app (laptop: the GitHub Pages link, not the local file, so push works) → **More → Sync** → your username, `vikram-data`, token → **Save & sync now**. The dot next to VIKRAM turns green.
Do the same on your phone. The laptop's first sync uploads your profile and plan; the phone pulls them.

## 5. Push notifications (the GitHub Action)
`vikram` → Settings → Secrets and variables → Actions → **New repository secret**, add five:
| Name | Value |
|---|---|
| `DATA_TOKEN` | the token from step 3 |
| `DATA_REPO` | `YOUR-USERNAME/vikram-data` |
| `VAPID_PUBLIC` | from `_PRIVATE_DO_NOT_UPLOAD/vapid-keys.txt` |
| `VAPID_PRIVATE` | from the same file |
| `VAPID_SUBJECT` | from the same file |
Then **Actions tab → enable workflows → "VIKRAM nudges" → Run workflow** once.
On the phone: install the app (next step), then **More → Enable push on this device**.
GitHub runs this every 15 minutes, but scheduled runs can arrive a few minutes late, so treat push as the smart layer (check-ins, nap check, minimum-day rescue).

## 6. Install on the phone
- **Android (Chrome):** open the link → ⋮ → **Add to Home screen** (or Install app).
- **iPhone (Safari):** open the link → Share → **Add to Home Screen**. Push on iPhone works only from the installed app (iOS 16.4+).
Put VIKRAM where Instagram was. Move Instagram to the last screen and set a 20-minute daily limit (Digital Wellbeing / Screen Time). Grayscale after 21:00 helps.

## 7. Exact-time alarms (calendar)
**More → Download vikram-alarms.ics** → Google Calendar on the laptop → Settings → **Import & export** → Import into a new calendar called VIKRAM. Every block of the next 62 days gets an alert at its exact start time (5:00 wake, 13:30 lab, 20:45 phone away, 21:00 sleep) on phone and laptop. Re-download once a month (a roadmap task reminds you).

## Updating
New content from Claude lands in this folder and the repo. After each update, bump `VERSION` in `sw.js` so phones fetch the new files; VIKRAM refreshes itself on the next open.

## Privacy
- Personal data: your browser + your private `vikram-data` repo only. Every sync is a commit, so the repo's history is also a backup.
- The token can only touch `vikram-data`. If a phone is lost: revoke the token on GitHub and make a new one.
