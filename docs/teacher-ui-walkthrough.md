# Teacher UI walkthrough

The teacher workspace now uses a consistent forest-green, warm-neutral design, with clearer page headings, compact controls, softer cards, and responsive layouts.

## Dashboard

- A welcome panel includes the next session and a working link to schedules or availability.
- Summary cards show unique students enrolled in your subjects, completed teaching hours this week, the actual subject count, and student ratings. Weekly hours use Monday as the start of the week in Manila time.
- Upcoming sessions and pending requests are grouped into separate panels.
- Quick actions open My Subjects, Availability, and Account Settings.
- Previously inactive Start Class, View Students, and Reply in Chat buttons were replaced by supported navigation. This update does not add video calls or messaging.
- Loading, empty, and retry states explain what to do next.

## Navigation and subjects

1. Sign in as a teacher and open the hamburger menu. The active page has a clear green highlight; mobile navigation remains a drawer.
2. Open **My Subjects**. Subjects appear in a responsive card grid. Use the subject title button to open a subject; it also works with Tab and Enter.
3. Open **Announcements** or **Classwork**. Published content, forms, attachments, and Drafts and Archived use matching borders, spacing, and colors.
4. Create, edit, post, schedule, archive, or delete classwork using the existing controls. Delete confirmation and Cancel remain available.

## Requests, schedules, and availability

1. Open **Request** or select **Review requests** from the dashboard. Each request shows the student, subject, Manila session time, price, and status.
2. Select **Accept** or **Decline**. The button shows progress while saving, and a status message confirms the result. Accepted sessions appear in Schedules.
3. Open **Schedules** and switch between Upcoming, Requests, and Past sessions. Selected tabs are visually highlighted and expose their selected state to assistive technology.
4. Open **Availability**. The page separates **Your teaching rate** from **Open a new time slot**. Choose a subject, date, and 12-hour start time, then add the slot.

## Settings, dark mode, and mobile

- Account Settings uses the same teacher palette for profile fields, password controls, and Save Changes.
- Toggle dark mode on the dashboard, then navigate to other teacher pages. The saved theme remains active.
- On small screens, cards stack, forms fit the available width, and the hamburger menu opens over the page.
- Keyboard focus is visible, and reduced-motion preferences are respected.
- New visual rules are scoped to `.teacher-layout`; student pages retain their existing styling.

## Checks

- Production frontend build and lint passed for the changed React components.
- Tutor and classwork API regression checks passed against isolated MongoDB test fixtures.
- Browser checks covered real dashboard counts, request acceptance, rate persistence, keyboard subject navigation, classwork, dark mode, all six teacher pages at 390px width, and the hamburger menu.
- Classwork browser checks covered draft/edit/post, persistence after reload, archive, delete confirmation and cancel, quiz scheduling, and attachments.
- Shared account-settings checks cover both roles, including profile/photo persistence, password validation, dark mode, and mobile layout.

Run `node scripts/check-teacher-ui.js` from `server` with the frontend at `http://localhost:5173`. Like the existing browser checks, it uses the Playwright installation in this workspace's temporary `turolink-browser-check` folder and Microsoft Edge. It writes preview screenshots to the system temporary folder and removes its own database fixtures.

Restart the backend to load the dashboard statistics update; refresh the frontend to see the design changes. No database migration or new environment variables are required.
