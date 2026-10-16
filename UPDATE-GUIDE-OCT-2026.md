# RSA update: October 2026

This update doesn't delete or change any existing bookings, payments or images. New features add new fields or collections. Fixes only change how *new* actions are counted.

---

## 1. What's new

### Admin website
| Where | What |
|---|---|
| **Dashboard** | One compact live screen that refreshes every 30 s. It shows new showroom/WhatsApp/other bookings, cases in progress, delayed and unassigned cases, cases done today, approvals waiting, the live status pipeline, today's figures, free/busy drivers, a 14-day chart, "Needs attention", "Waiting for approval", **My day** and vehicle alerts. The beep for new bookings still works. |
| **Reports → Reports Centre** | Pick a period (Today, This month, Last month…) and filters (status, company, showroom, driver, provider, service, payment, verified, cash pending, search). It shows summary tiles, a chart and groupings (by driver, by client, by day). **Excel / PDF / CSV** export exactly what you see. |
| Old report pages | Excel and PDF buttons were added: driver, provider, company, showroom and staff reports. |
| **Reminders** (sidebar) | Set a reminder with a time, repeat, priority, case number and the person it's for. When it's due it pops up on any page (Done / Snooze). |
| **My day** (dashboard) | For each staff login: today's tasks (from Staff Tasks), reminders, their cash in hand, and their open or unverified bookings. |
| **Staff Tasks** (sidebar, admin) | The existing daily-task manager is now easy to reach. |
| **Rewards** | Rewritten page with clear labels: "Showroom gets X points per booking" and "Showroom staff gets Y points". The Redemptions page now has Pending / Approved / Rejected states. |
| **Showroom list** | New "Activity" column: bookings this month and total, last booking, points, executive, and whether the visit is done. Summary tiles show booked this month, quiet for 30+ days and not visited. |
| **Operations → 📺 TV screen** | Set the 8-digit TV passcode (see section 4). |
| All pages | If one page fails to load, you now see a friendly "Try again" box and the menu still works. Phone layouts no longer scroll sideways. |

### Showroom dashboard (showroom login)
- A new home screen with big quick buttons (New booking, Bookings, Staff, Staff QR, Cash report), the reward points card and **live bookings with a step tracker** (Received → Driver assigned → On the way → Picked up → Delivered), plus a monthly chart and recently finished bookings.
- A new header and mobile menu, and **Sign out now really logs out**.
- A showroom can only open its own dashboard.

### Reward fixes (real bugs found)
1. **Points per booking for showrooms and showroom staff were never given.** They are now given once, when the case is **verified**, using the numbers on the Rewards page. The old Rewards page had those two labels **swapped**, so please check both numbers after deploying.
2. Rejecting a redemption now **returns the points and the stock**, and it can't be done twice.
3. Approving an already-approved redemption used to crash. It now shows a message.
4. Editing a customer's feedback no longer gives the driver the points again or adds the salary twice.
5. Verifying a case twice no longer adds the cash in hand twice.
6. Editing a booking that used showroom reward points no longer deducts the points again.

### Other fixes
- The dashboard WhatsApp/showroom tiles were counting **every booking ever**. They now count only new bookings that are waiting.
- The showroom dashboard's "New bookings" was always 0.
- The showroom login no longer sends the password back to the browser.
- Driver app: **a push notification for a new case now pops up and beeps even while the app is open**. Before, it only did this when the app was in the background. The notification now says "New case RSA-123 assigned to you · Pickup: …".

### New apps
| App | Folder | For |
|---|---|---|
| **RSA Executive** | `rsa_executive` | Marketing executives: add showrooms, monthly GPS + photo visit, my showrooms and performance, share the staff QR/link |
| **RSA** (customer) | `rsa_customer` | Customers: log in with mobile OTP, book a tow truck, track live, cancel before a driver is assigned |

### WhatsApp booking (your own number)
Customers message your WhatsApp number. The bot asks for the vehicle number, the problem, the location (they can share it with one tap) and the drop-off, then shows a summary to confirm. The booking appears in the office as a new booking (file number `WA-…`). The customer gets a WhatsApp message at every status change (driver assigned with name and phone, on the way, picked, dropped, completed). Your current partner integration (pmnacranes.pravasisit.com) keeps working as before.

### TV screen
Open `https://<admin site>/#/tv` on the office TV and enter the 8-digit passcode. It shows open, delayed and no-driver counts, a column for each status, all drivers (free / busy / offline), today's activity feed and today's totals. It updates every 15 s and is view-only. No phone numbers are shown.

---

## 2. Release order
1. **Backend (Render)**: deploy, then add the new settings from section 3. Nothing breaks if they are missing; that feature just stays off.
2. **Admin website and Showroom dashboard (Vercel)**: deploy. Run `npm install` once, because the admin site has a new PDF package.
3. Rewards page: check the two "points per booking" numbers.
4. Operations → 📺 TV screen → set the passcode, then open `/#/tv` on the TV.
5. Driver app: build and publish the update (push-beep fix, location every 200 m / 3 min, StackCP images).
   ⚠️ Publish the app image changes only **after the old Cloudinary images have been copied to StackCP** (see MIGRATION-STACKCP.md).
6. Executive app and customer app: build them (each folder has a README with step-by-step commands). Run `flutter analyze` and send me any errors.
7. WhatsApp: set it up when you're ready (section 5).

---

## 3. New server settings (Render → Environment)
| Setting | Example | Needed for |
|---|---|---|
| `BACKEND_URL` | `https://api.rsakerala.com` | Correct staff links / QR codes |
| `SUPPORT_PHONE` | `+91 9xxxxxxxxx` | Help-line in the customer app and WhatsApp replies |
| `SUPPORT_WHATSAPP` | `91xxxxxxxxxx` | "WhatsApp" button in the customer app (optional) |
| `CUSTOMER_TEST_LOGIN` | `9000000001:123456` | Optional: Play Store reviewers log in without SMS |
| `VISIT_MAX_DISTANCE_M` | `500` | How far from the showroom an executive visit is accepted |
| `TV_TOKEN_DAYS` | `30` | How long the TV stays logged in |
| `WA_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_VERIFY_TOKEN`, `WA_APP_SECRET` | – | WhatsApp booking (section 5) |

---

## 4. TV screen in 3 steps
1. Admin login → **Operations** → **📺 TV screen** → type 8 digits (or tap Random) → **Save passcode**. Write the passcode down; it can't be shown again, only replaced.
2. On the TV's browser open `https://<your admin site>/#/tv`, enter the passcode, then tap **Full screen**.
3. To log every TV out, set a new passcode or tap **Turn off**.

*Optional short address:* create `tv.rsakerala.com` in your DNS pointing to the same Vercel project as the admin site (Vercel → Project → Domains → Add), then open `https://tv.rsakerala.com/#/tv`.

---

## 5. WhatsApp booking setup (Meta WhatsApp Cloud API)
You need a WhatsApp Business number that is **not** being used in the normal WhatsApp app, plus a Meta Business account.

1. Go to **developers.facebook.com** → My Apps → **Create app** → type **Business** → add the **WhatsApp** product.
2. WhatsApp → **API setup** → add your business phone number and verify it by SMS. Copy the **Phone number ID** and put it on Render as `WA_PHONE_NUMBER_ID`.
3. Create a **permanent token**:
   - In Business Settings → Users → **System users**, add a system user (Admin).
   - Choose Assign assets → your app → Full control.
   - Click **Generate new token** with `whatsapp_business_messaging` and `whatsapp_business_management`.
   - Put the token on Render as `WA_TOKEN`.
4. App settings → Basic → copy the **App secret** and put it on Render as `WA_APP_SECRET`.
5. Choose any long random word (e.g. `rsa-wa-7f3k9q`) and put it on Render as `WA_VERIFY_TOKEN`. Then redeploy.
6. WhatsApp → **Configuration** → Webhook → Edit:
   - Callback URL: `https://api.rsakerala.com/whatsapp/webhook`
   - Verify token: the same word as step 5.
   - Click Verify and save, then **Subscribe** to **messages**.
7. Test it: send "Hi" to your business number from another phone, then book. The booking appears on the dashboard (WhatsApp tile and beep).

The bot can reply freely within 24 h of the customer's last message, which covers normal bookings. For messages after a longer gap you would need an approved message template; ask me if you need that.

---

## 6. Quick checks after deploying
- [ ] Dashboard loads and the figures look right. Open Reports → Reports Centre → This month → Excel and PDF.
- [ ] Create a reminder for 2 minutes from now and check that it pops up.
- [ ] Rewards page shows the two points numbers. Redemptions shows the Pending / Approved / Rejected tabs.
- [ ] Showroom login → the new dashboard shows live bookings.
- [ ] Assign a test case to a driver: the driver's phone beeps with the app open **and** with the app closed (the latter needs the new driver app).
- [ ] TV: `/#/tv` with the passcode.
- [ ] Customer app with the test login: book → the booking appears in the office → assign a driver → the app shows the driver.
- [ ] WhatsApp (after section 5): Hi → book → confirm → the booking appears → status messages arrive.
