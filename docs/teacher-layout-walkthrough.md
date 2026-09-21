# Teacher layout walkthrough

1. Open the teacher Dashboard or My Subjects. The full-width topbar shows TuroLink, subject search, Settings, and the authenticated teacher's name/initial. Students and teachers now share the same saved light/dark preference. The theme switch appears on each role's dashboard and applies to My Subjects as well.
2. Both roles use the reference-style rounded green active item. Click the hamburger to reveal Dashboard, My Subjects, Messages, Schedules, and Request. Desktop content shifts beside the drawer. On mobile it overlays the content. Click the close button, press Escape, or click the mobile backdrop to dismiss it. Hidden navigation is excluded from keyboard focus.
3. Search My Subjects by code, title, or description. From Dashboard, enter a query and press Enter to open filtered subjects. Clear the query to restore all results.
4. Settings contains Log Out and its confirmation. Account Settings and the three unimplemented navigation destinations display explicit availability notices.
5. Existing subject and announcement operations continue to use the API and MongoDB. Subject routes now require a teacher role in addition to authentication; controller ownership checks remain in effect.

## Verification

- Client production build and ESLint for the changed React components passed.
- Headless Edge checks used mocked API data to verify desktop/mobile navigation, content resizing, search, Escape/backdrop dismissal, shared dark mode across navigation and refresh for both roles, Settings, and logout confirmation. No browser runtime errors were detected.
- Desktop and mobile screenshots were visually reviewed.
- Live MongoDB integration checks passed for subject create/read/update/delete, announcement persistence, unauthenticated requests, student rejection, and cross-teacher ownership restrictions.
- Re-run the integration check from server with: node scripts/check-subject-api.js. It requires the configured MONGO_URI and JWT_SECRET, uses the separate turolink_integration_checks database, and deletes only records created by the test. It uses the server's DNS settings.

## Scope limits

Assignment/quiz creation, drafts, archive, and scheduling have since been implemented; see teacher-classwork-walkthrough.md. Messages, Schedules, Request, and Account Settings still need dedicated pages. The browser checks did not use a real teacher login; database persistence was tested separately through authenticated HTTP requests using temporary test accounts.

Latest sidebar verification also passed at 320px and 390px widths for both roles, including five navigation items, desktop resizing, Escape, backdrop dismissal, and theme persistence.
