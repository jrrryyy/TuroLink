# Student My Subjects walkthrough

## Enroll through an accepted tutoring request

1. The teacher creates a subject in **My Subjects**, then publishes tutoring slots through **Availability**.
2. The student opens **Find Tutor**, opens the teacher's profile, and selects a subject in **Session subject** before choosing a time and sending the request.
3. The teacher opens **Request** and accepts. The same MongoDB transaction confirms the booking and adds the student to that exact subject's enrollment list. Repeated bookings do not duplicate enrollment.
4. The subject appears in **Student > My Subjects** and the dashboard's subject list. Pending and declined requests do not grant access.

Teachers must create a subject before publishing new availability, and each new slot is assigned to a subject. General tutoring and older requests without a subject reference do not automatically enroll students. Existing standalone Course records are preserved, but the student UI now displays actual enrolled teacher subjects; it does not guess relationships from teacher or subject names.

## Read announcements and materials

1. Open **My Subjects**. Cards show the teacher photo/name, subject, and upcoming topic. The upcoming topic comes from the next published material with a future due date; otherwise the card shows an empty-state message.
2. Click **View Announcements**. The subject page shows its code/title, enrollment count, and stored subject rating, or “Not rated yet.” Subject ratings are separate from tutor reviews.
3. Read teacher announcements, open external links, and download attachments. Dates use Manila time.
4. Click the heart to like or unlike a post. The server stores one like per student per announcement, including during repeated/concurrent requests.
5. Expand **Comments**, enter a comment of up to 2,000 characters, and click **Post Comment**. Blank comments are rejected. Likes and comments remain after reloading.
6. Open **Materials** to view published assignments and quizzes, instructions, points, due dates, links, and downloads. This page does not add assignment submission or quiz-taking workflows.
7. Use **Back to My Subjects** to return to the cards. Cards always open the Announcements tab, and the selected detail tab survives reloading.

The shared hamburger sidebar, topbar, mobile layout, and saved dark-mode preference remain available. Students cannot edit teacher-owned subject details.

## Access and files

- All student reads, likes, comments, and downloads require enrollment. Attachment endpoints independently check access; hiding a tab is not the permission check.
- Drafts, archived materials, and scheduled posts whose publication time has not arrived are excluded. Due scheduled posts become visible after their scheduled time.
- Announcement files now download through authenticated endpoints for both teachers and enrolled students. Raw `/uploads/announcements/...` links are blocked. Existing stored files are retained.
- Material storage keys and enrollment rosters are omitted from student responses.
- Subject selection is checked against the slot's teacher. If the selected subject has been deleted before acceptance, acceptance fails without partially confirming or enrolling the student.

## Verification

Run `npm run test:student-subjects` from `server` to test explicit subject selection, acceptance/enrollment, restricted access, content publication, duplicate likes, comment validation/persistence, downloads, and blocking raw announcement links. Test records and files are created in an isolated integration database and cleaned up.

Optional `npm run test:student-subjects -- --browser` uses a running client on localhost:5173 and Playwright installed at `%TEMP%/turolink-browser-check/node_modules/playwright`. It checks the booking subject selector, enrolled subject cards, tabs, likes/comments/reload, file downloads, mobile overflow, and dark mode.

Client build, targeted lint, and existing tutor/classwork API checks are also run. Restart the backend if using `npm start` so the new routes and download protection are loaded; `npm run dev` reloads automatically.
