# Security & stability update

**No data is deleted or changed by this update.** The only stored data that changes is a staff member's password: when they next log in, it is converted to a secure hash of the *same* password. They notice nothing.

## Deploy (backend on Render, admin site on Vercel)

1. Deploy the **admin website** first. It now sends the login token with every request. This is harmless on the old backend.
2. On Render, add `ACCESS_POLICY_MODE=report`, then deploy the **backend**.
3. For 2–3 days, use the driver app and admin site normally. Then search the Render logs for **`[access-policy] would block`**.
   - **No lines:** set `ACCESS_POLICY_MODE=enforce` (or delete the variable) and redeploy. Done.
   - **Lines appear:** send them to me. They show which app call would have been blocked, so the rule can be adjusted before enforcing.
   - Report mode only applies to the *role* checks. Endpoints that previously had no login check at all are protected immediately (see "Locked" below).
4. Optional settings on Render:

| Variable | What it does | Default |
|---|---|---|
| `ACCESS_POLICY_MODE` | `report` = only log, `enforce` = block | `enforce` |
| `WEB_TOKEN_EXPIRES` | How long an admin-website login lasts | `7d` |
| `CORS_ORIGINS` | Websites allowed to call the API, comma-separated (e.g. `https://admin.rsakerala.com`). Mobile apps aren't affected. | unset = all websites (as before) |
| `BOOKING_API_KEY` | Requires this key (`x-api-key` header) on the WhatsApp `/booking/new-booking` endpoint. **Set it only after the WhatsApp side sends the key.** | unset = open (as before) |
| `SALARY_VERIFY_PASSWORD` | Password for verifying bookings with driver salary > 1000 | `SALARY@RSA` (unchanged) |
| `OTP_VALID_MINUTES` / `OTP_MAX_ATTEMPTS` | OTP lifetime and wrong-try limit | `5` / `5` |

## What changed

### Locked (anyone on the internet could call these before)
- **Admin registration:** only the very first admin can be created without logging in. After that, a logged-in admin must create new admins.
- **Other endpoints that now require a login:**
  - `fix-passwords` (Admin only)
  - provider settlement
  - company update
  - feedback list/edit/delete (customers can still *submit* feedback)
  - vehicle status update
  - delete all drop-off photos
  - showroom staff add/edit/delete

### Role checks (`Middileware/accessPolicy.js` — one readable list)
- **80 of the 252 routes** now check *who* is calling. The other 172 are untouched.
- **Admin-website only (Admin, Staff):**
  - master data: base locations, service types, roles, staff, companies, petrol pumps, vehicles and their papers, rewards, marketing executives
  - creating and deleting drivers and providers
  - settlements and approvals: expense approve, diesel approve, company/staff/cash settlements, distribute amount, accountant verify
  - archive tools, work templates, admin check-in, company expenses
- **Drivers and providers** can still edit their own record, but not anyone else's.
- **Marketing executives** can still add and edit showrooms. **Showrooms** can manage their own staff.
- **Driver-app flows are deliberately left open** (tested: 35 typical driver-app requests all still go through):
  - login, bookings, pickup/drop-off/cancel/inventory photos
  - expenses, diesel, attendance, leaves, advances, cash entries
  - updating service KM, driver settle amount, file number

### Logins
- **Staff passwords** were stored and sent as plain text. Now:
  - they're stored as a hash (converted automatically at next login)
  - they're never sent by the API
  - they show as hidden on the staff page
  - on the edit form, a blank password keeps the current one
- **OTP:**
  - expires after 5 minutes
  - cancelled after 5 wrong tries
  - generated with a secure random source
  - no longer written to the logs
- **Admin-website logins expire after 7 days.**
  - People already logged in stay logged in; old tokens keep working.
  - When a session expires, the admin site sends the user to the login page. It used to crash silently.
- **Passwords, password hashes and tokens are no longer printed in logs** (admin, executive, jwt).

### Fixes
- **Showroom app download page:** showroom names and other details are now escaped. Before, a showroom name could inject script into the page.
- **Expense routes:** removed three duplicate lines that Express never used. Behaviour is unchanged.
- **Showroom dashboard:** now sends its login token too, so its staff management keeps working.

## Not changed on purpose (needs app updates first)
- **Driver and provider app tokens still don't expire.** Adding expiry now would log every driver out, and the app may not handle that. Add it once the app can refresh or re-login.
- **Showroom passwords are still plain text**, and the showroom dashboard keeps the password in browser storage. Fix both together when that dashboard is back in use.
- **UPI payments are still a placeholder.** The payment gateway needs choosing (Razorpay, Cashfree, …).
- **Unused template pages in the admin site** (Crypto, Mailbox, demo tables…) are still there. Cleanup only, no security impact.
