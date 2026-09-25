# Teacher notifications walkthrough

Teachers now have the same notification bell and permission controls as students. Restart the backend and refresh the frontend to load the changes.

## Try it

1. Sign in as a teacher and open the bell in the top bar. The badge shows the unread count.
2. Choose **Enable** to request browser notification permission, or decline the prompt to keep using notifications inside TuroLink. Notification preferences are also available in account settings.
3. From a student account, request a tutoring session with that teacher. The teacher receives **New tutoring request**; clicking it opens the teacher's Requests page.
4. Have an enrolled student comment on the teacher's published announcement. Clicking the teacher's comment notification opens the corresponding subject and scrolls to the announcement.
5. After a completed tutoring session, submit a student review. The teacher receives **New student review**; clicking it opens the past sessions tab.
6. Open an alert to mark it read, or use the mark-all-read control. Refresh to confirm the read state is retained.

## Behavior

- Notification history and read states are saved in MongoDB and restricted to the recipient. Students and teachers cannot read or update another user's notifications.
- Browser permission and notification preferences apply per user on the current browser. Declining browser alerts does not disable the in-app bell.
- The bell checks for updates every 30 seconds. Browser alerts require the app to be open; this implementation does not provide background push delivery when the app is closed.
- New requests, student comments, and completed-session reviews create notifications. Existing activity is not backfilled, and teachers do not receive notifications for their own comments or for likes.
- Comment notifications are hidden when their announcement is removed or is no longer associated with the teacher.
- No additional email or Google configuration is needed.
- The dropdown works on mobile and supports Escape and outside-click dismissal.

## Validation completed

- Production frontend build and ESLint checks for the changed React components passed.
- Notification API and browser checks passed for both roles, including recipient privacy, duplicate prevention, permission controls, unread counts, mobile behavior, and destination links.
- Tutor booking and student-subject regression checks passed, including request acceptance, enrollment, comments, and review restrictions.

Checks: `node scripts/check-notifications.js --browser`, `npm run test:tutors`, and `npm run test:student-subjects` from the server directory. Browser checks require the local frontend and the existing Playwright test setup.
