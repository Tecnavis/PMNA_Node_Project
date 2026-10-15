# RSA images: Cloudinary → StackCP (simple guide)

You will do 4 things: **set up StackCP → copy old images → switch the backend and admin site → tidy up the database.**
Total time ≈ 1–2 hours. Nothing is deleted from Cloudinary, so you can always go back.

---

## Part A — StackCP (one time, ~20 min)

**A1. Create the subdomain**
- Log in to my.20i.com → **Manage Hosting** → on the package for *rsakerala.com* click **Options → Manage**.
- Open **Subdomains** and add `media` → you get **media.rsakerala.com**.
- If rsakerala.com's DNS is *not* managed in this StackCP account, add an **A record** for `media` pointing to the package's IP (shown in StackCP) at your DNS provider.
- Turn on **Free SSL** for media.rsakerala.com (SSL / TLS section). Wait until `https://media.rsakerala.com` opens without a warning.

**A2. Upload the files**
- Open **File Manager** and go to the subdomain's folder (usually `public_html/media` or a folder named after the subdomain — StackCP shows it on the Subdomains page).
- Upload everything inside `stackcp-media/public_html/` from the zip (folders `api`, `bookings`, `uploads`, … and the `.htaccess` files).
  - Tip: zip that folder on your PC, upload the zip, then use **Extract** in File Manager — this keeps the hidden `.htaccess` files.
  - Check: every folder (`bookings`, `uploads`, `profiles`, …) must contain a `.htaccess` file. The upload API refuses to save into a folder without one.

**A3. Add the secret key**
- Make a secret: on your PC run `openssl rand -hex 32` (or use any 64-character random password generator, letters + numbers).
- Open `stackcp-media/media-config.example.php`, paste the secret, save it as **`media-config.php`**.
- Upload `media-config.php` to the folder **one level above** the subdomain folder (so it can't be opened from a browser).
  If you can't find a folder above it, upload it as `api/config.php` instead — it's blocked from the web too.

**A4. PHP settings**
- Manage Hosting → package → **PHP Configuration**: set `upload_max_filesize` and `post_max_size` to **16M** or more.

**A5. Test**
- Open `https://media.rsakerala.com/api/upload.php` in the browser. You should see: `{"ok":false,"error":"POST only"}` ✅
- Open `https://media.rsakerala.com/` → "Forbidden" is correct (no file listing) ✅

---

## Part B — Copy the old images (on your PC, ~20–40 min depending on how many)

1. In the project folder `RSA with NODE JS`, put these in your `.env` (keep your existing ones):
   ```
   MEDIA_API_URL=https://media.rsakerala.com/api
   MEDIA_PUBLIC_URL=https://media.rsakerala.com
   MEDIA_SECRET=<the same secret as media-config.php>
   CLOUD_NAME=...        CLOUD_API_KEY=...        CLOUD_API_SECRET=...   (your current Cloudinary keys)
   MONGO_URI=...         (production database)
   ```
2. Run:
   ```bash
   cd "RSA with NODE JS"
   npm install
   node scripts/migrateCloudinaryToStackcp.js inventory          # shows how many images / MB
   node scripts/migrateCloudinaryToStackcp.js copy --limit=20    # try 20 first
   node scripts/migrateCloudinaryToStackcp.js copy               # copy everything
   ```
   If it says `failed: N`, just run `copy` again — finished files are skipped.

---

## Part C — Switch over (do C1 and C2 together, ~10 min)

**C1. Backend (Render)** → Environment → add:
```
MEDIA_API_URL=https://media.rsakerala.com/api
MEDIA_PUBLIC_URL=https://media.rsakerala.com
MEDIA_SECRET=<same secret>
```
Deploy. From now on every new photo goes to StackCP.

**C2. Admin website (Vercel)** → Settings → Environment Variables → add
`VITE_MEDIA_BASE_URL=https://media.rsakerala.com` → Redeploy.

**C3. Run `copy` once more** right after deploying — this picks up any photos uploaded to Cloudinary during the last hour:
```bash
node scripts/migrateCloudinaryToStackcp.js copy
node scripts/migrateCloudinaryToStackcp.js verify      # checks every image in the database loads from StackCP
```

**C4. Quick test**
- Admin site: open a booking with photos → photos show. Add a driver photo → it shows.
- Driver app: upload a pickup photo → it shows in the admin site.
- Admin site → **Case Photos** (new menu item) → search a case ID → photos show.

---

## Part D — Tidy up the database (~5 min)

Some records store full Cloudinary links (executive photos, showroom verifications, admin QR). This changes them to StackCP links:
```bash
mongodump --uri "<MONGO_URI>" --out backup-before-media      # backup first
node scripts/migrateCloudinaryToStackcp.js rewrite-db          # preview only
node scripts/migrateCloudinaryToStackcp.js rewrite-db --apply  # real change
```
To undo: `node scripts/migrateCloudinaryToStackcp.js rollback --file=migration-logs/rewrite-applied-<…>.json`

**Close Cloudinary only after 2–4 weeks**, once the driver app is updated (see below) and `verify` shows nothing missing.

---

## How new images are arranged on StackCP

You can browse these in StackCP **File Manager** — the folder name tells you the date and the case:

```
bookings/2026/10/15/RSA-1234/pickup-20261015-143210-k3f9q2.jpg     ← case RSA-1234, created 15 Oct 2026
bookings/2026/10/15/RSA-1234/dropoff-20261015-171544-a81c0d.jpg       file name = type + date + time (India time)
bookings/2026/10/15/RSA-1234/cancel-…   inventory-…   payment-qr-…
bookings/unassigned/2026/10/15/…           ← photo sent without a booking
expenses/2026/10/15/expense-…              diesel-expenses/2026/10/15/diesel-…
company-expenses/2026/10/15/company-expense-…
profiles/drivers/driver-rahul-k-…          profiles/staff/  profiles/providers/  profiles/companies/  profiles/showrooms/  profiles/executives/
vehicles/KL07AB1234/insurance-…  tax-…
verifications/2026/10/15/verification-…    rewards/reward-…    admin/payment-qr-…
uploads/                                   ← old photos copied from Cloudinary (unchanged names)
```

- The booking folder uses the **date the case was created**, so all photos of one case stay together even if the drop-off is the next day.
- Dates are India time.

## Finding photos in the admin site — "Case Photos"

Menu → **Case Photos**:
- Type a **case ID** (part is enough, e.g. `1234`) or a **vehicle number**, and/or pick a **date** (or a date range up to 2 months).
- Each case shows its pickup / drop-off / inventory / cancellation / payment-QR photos, with **Download All**, and the **StackCP folder** path (with a Copy button) for new cases.
- Works for **old Cloudinary photos too** (it reads the database, including archived bookings).

## Driver app note

Uploads from the driver app already work — no app change needed. If the app *shows* photos by adding the Cloudinary address in front of the stored name, change that address in the app to `https://media.rsakerala.com/uploads/`. That one address works for old photos and the new organised folders.

## Backups

Shared hosting isn't a backup. Once a week, copy the media folder somewhere else (download it from File Manager, or `rclone sync` over SFTP to Backblaze B2 or Google Drive).

---

<details>
<summary>Technical summary of the code changes</summary>

| Part | Change |
|---|---|
| `stackcp-media/` | Signed PHP upload/delete API; per-folder `.htaccess` (no scripts, CORS, caching, legacy extension-less IDs, `/uploads/<organised path>` compatibility) |
| `config/multer.js` | Memory upload → sharp (auto-rotate, max 1600px, JPEG q80, PNG kept) → StackCP. `upload.single(field, placement)` / `upload.array(field, n, placement)` |
| `config/mediaPlacement.js` | Folder + file-name rules per upload type (bookings by case date + case ID, India time) |
| `services/mediaStorage.js` | Signed client with retries; parses every stored format |
| `Controller/casePhotos.js`, `routes/media.js` | `GET /media/case-photos?q=&date=&from=&to=&withPhotos=` (Admin/Staff) |
| `scripts/migrateCloudinaryToStackcp.js` | inventory / copy / verify / rewrite-db / rollback |
| Fixes | company-expense double upload; diesel delete + update; tax/insurance cleanup hook; cancel-booking crash; auth before uploads; 10 MB limit; WebP; `message` in error responses |
| RSA Frontend | `getImageUrl()` everywhere; Case Photos page + menu item |
</details>
