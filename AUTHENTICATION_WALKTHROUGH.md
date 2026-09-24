# Authentication walkthrough

## What changed

- Student and teacher signup require a password of at least 12 characters (at most 72 UTF-8 bytes). Common passwords, simple sequences, and repeated patterns are rejected in both the browser and API. A live Weak / Fair / Strong meter appears when creating or changing a password. The meter is a local estimate, not a guarantee that a password has never been leaked.
- Registration saves an inactive account and sends an email verification link. It does **not** create a login session. Links expire after one hour, work once, and are stored only as hashes. Resending has a 60-second cooldown and invalidates the previous link.
- Both roles must verify their email before signing in. Existing accounts keep their passwords and data, but must verify their email on the next login. New password rules apply when a password is created or changed.
- Google sign-in appears on login and both signup pages when configured. The server verifies Google's signed credential, audience, issuer, expiry, verified-email claim, and a single-use nonce. New users complete their name, unique mobile number, role, terms, and teacher information where applicable, then verify their TuroLink email.
- An existing email address is never silently linked to Google. The existing TuroLink password and a verified account are required to connect it. Google-only accounts manage their password with Google.
- Authentication now uses revocable MongoDB sessions with HttpOnly, SameSite=Lax cookies (also Secure in production). Old localStorage JWTs no longer authorize access. Logout revokes the current session; changing a password revokes other sessions.
- Dashboard access is checked after loading the session from the API. The API independently requires a valid, unexpired session, a verified account, and the correct role. Changing a URL cannot grant access to protected data.
- Unsafe API requests require the configured frontend Origin and a custom request header. Authentication endpoints are limited to 30 requests per IP per 15 minutes.

## Required setup before using real accounts

The local environment did not contain SMTP or Google settings during implementation. No real verification emails were sent and no live Google account was used in testing. Existing accounts will need email verification, so configure mail **before** rolling out these changes.

Merge the missing values from `server/.env.example` into `server/.env`; keep your current MongoDB connection. Do not replace the existing environment file or put SMTP credentials in the frontend.

```dotenv
CLIENT_URL=http://localhost:5173
SMTP_HOST=your-provider-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
MAIL_FROM=TuroLink <your-verified-sender@example.com>
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

Use your mail provider's exact settings and verified sender. Port 465 normally uses `SMTP_SECURE=true`; port 587 uses STARTTLS with `SMTP_SECURE=false`. Mail errors leave the account unverified and allow resending; there is no development shortcut that activates an account without verification.

Create a Google OAuth **Web application** client. Add the exact frontend origin (for local development, `http://localhost:5173`) to Authorized JavaScript origins. Configure the consent screen and test users if the Google project is in testing mode. This implementation uses Google's JavaScript credential callback, so it does not require a client secret or backend redirect URL. See [Google's setup guide](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) and [server-side credential verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

Restart the API after editing its environment. Use the same hostname for frontend and API locally; do not mix `localhost` with `127.0.0.1`.

```powershell
# In turolink/server
npm install
npm run dev

# In a second terminal, turolink/client
npm install
npm run dev
```

For deployment, set `NODE_ENV=production`, use HTTPS, and set `CLIENT_URL` to the exact frontend origin with no trailing slash. Host the API on the same site as the frontend (or reverse-proxy `/api`), and configure `VITE_API_URL` accordingly. Arbitrary cross-site hosting will not work with SameSite=Lax cookies. Configure the trusted reverse proxy explicitly if using one; use a shared rate-limit store for multiple API instances. MongoDB indexes on users, auth sessions, and auth challenges must be created as part of deployment if automatic index creation is disabled.

## Walkthrough

1. Open student or teacher signup. Enter `123456`: the meter shows **Weak** and signup rejects it. Enter a unique long passphrase; the meter and validation update immediately.
2. Complete signup, including the unique mobile number and terms. The app opens **Verify your email**, with no dashboard access yet.
3. Open the email link and select **Verify my email**. Confirmation requires this explicit click so email scanners do not consume the link automatically. Return to sign in.
4. Try an expired or previously used link: the page explains the problem and offers to resend. If an existing account needs verification, logging in routes to this same page.
5. Once Google is configured, select **Continue with Google**. New users complete their profile and verify their email. Existing local users confirm their TuroLink password before linking.
6. Sign in, reload, and move between authorized pages: the cookie session persists. Try the other role's dashboard URL: the app redirects to your own dashboard and the API denies the wrong-role request.
7. Sign out, then open a dashboard URL directly: you return to login. Reusing the old cookie cannot access the API.
8. In Account Settings, changing a local password applies the same password rules and signs out other sessions. Google-only accounts show that their password is managed through Google.

## Validation performed

- Production client build and lint of changed React files.
- `npm run test:validation`: task-specific field and password validation.
- `npm run test:auth`: real MongoDB session/verification persistence against the isolated `turolink_integration_checks` database; mocked SMTP; Google invalid-credential check plus mocked successful Google identities. Covers unverified login, token replay/expiry, resend cooldown, mail failure recovery, phone uniqueness, CSRF rejection, wrong roles, password changes, logout, Google nonce/replay, profile completion, and explicit linking.
- `node scripts/check-auth-security.js --browser`: Edge browser signup, strength meter, email verification, login, reload persistence, and direct URL/role checks. Requires the frontend on port 5173 and Playwright installed in the temporary browser-check environment used by this workspace.
- Existing account settings, student subjects, classwork, and tutor API checks were adapted to cookie sessions and run against isolated fixtures.

Test scripts delete only their own generated records. Live email delivery, Google consent, production HTTPS cookies, and provider-specific settings still require a smoke test after configuration.
