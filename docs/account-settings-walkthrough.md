# Account Settings walkthrough

Available to both students and teachers through the topbar **Settings > Account Settings** menu.

## Using the page

1. Sign in as a student or teacher and open Account Settings.
2. Edit your name, bio, and sex selection.
3. Click **Edit** below Profile Picture to choose a JPG, PNG, or WebP image, up to 2 MB. The preview is saved only after clicking **Save Changes**. **Remove photo** restores your initial after saving.
4. Email, contact number, and role are displayed read-only. The password row shows a placeholder, never the stored password.
5. To change your password, enter the current password, new password, and matching confirmation. Leave all three blank to keep the existing password. The new password must differ from the current one and contain at least six characters, with a maximum of 72 UTF-8 bytes.
6. Click **Save Changes**. A confirmation appears, and your name and photo update in the topbar. Reload to see the saved profile.

The page follows the existing light/dark preference and adapts to mobile screens. It keeps the shared hamburger navigation.

## Persistence and validation

- Authenticated `PUT /api/auth/me` updates only the signed-in account. The server validates profile fields and verifies the current password before changing it.
- Profile values and the photo URL are stored in MongoDB. Image files are stored in `server/uploads/avatars`; keep that directory on persistent storage when deploying.
- Email, phone, and role cannot be changed through this endpoint. Existing mobile uniqueness remains enforced during registration.
- Failed validation leaves the form available for correction. Saving disables duplicate submissions. Password fields clear after a successful save.

## Verification

- Client production build and targeted ESLint checks passed.
- `npm run test:account-settings` in `server` checks both roles against the isolated integration database: authentication, persistence, protected fields, password changes and login, and image upload/removal validation.
- `npm run test:account-settings -- --browser` additionally checks both pages in Edge: settings navigation, photo/name updates, persistence after reload, password errors/success, dark theme, and mobile overflow. This optional check uses the Playwright installation in `%TEMP%/turolink-browser-check` and a running client on localhost:5173.
- Existing registration/login validation regression checks passed with `npm run test:validation`.

Restart the backend if it was launched with `npm start`; `npm run dev` reloads server changes automatically.
