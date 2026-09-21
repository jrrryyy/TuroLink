# Teacher Classwork / Materials

Open **My Subjects → a subject → Classwork**. This replaces the former Materials placeholder.

## Create and post

1. Open **Create** and choose **Assignment** or **Quiz Assignment**.
2. Enter a title and instructions. The selected subject and All Students recipient group are shown in the editor.
3. Choose 100 points, Ungraded, or Custom points, and an optional due date/time.
4. Attach a document/image up to 10 MB and/or an HTTP(S) link.
5. Choose **Post**, **Save Draft**, or enter a future posting date/time and choose **Schedule**.

Quiz Assignment is the attachment/instructions-based form in the supplied reference. This update does not include a question builder, automatic grading, or student submission UI.

## Manage classwork

- Posted cards show teacher, title, instructions, points, due date, and downloadable attachments/links.
- Expand **Drafts and Archived** to see drafts, scheduled work, and archived work.
- Use a card's three-dot menu to edit, archive, restore to drafts, or delete.
- Delete opens a confirmation with Cancel and Delete. Cancel leaves the record intact.
- Scheduling publishes automatically within approximately 30 seconds while the API runs. Reads also catch up overdue scheduled posts after downtime, and the open Classwork tab refreshes every 30 seconds.
- The form and cards use the shared light/dark theme and adapt to mobile screens.

## Storage and API

Classwork is stored in the Subject model's materials array. Existing material titles/file URLs remain compatible. New files are saved under server/storage/materials and downloaded through an authenticated teacher-owned subject route; this directory is ignored by Git. Keep that storage directory on persistent disk when deploying.

Routes under /api/subjects/:id/materials provide list/create, update, archive/restore, delete, and attachment download. Requests require teacher authentication and subject ownership. The server validates title, type, points, dates, schedules, links, and uploads.

Restart the server if running with npm start so it loads the new routes and scheduling loop. npm run dev normally restarts through nodemon.

## Verification

From server, run **npm run test:classwork**. The test uses the separate turolink_integration_checks database and cleans up its own users, subjects, and files. It verifies persistence, scheduling, draft editing, archive/restore, deletion, file download, validation, and authorization.

The optional --browser mode in scripts/check-classwork-api.js uses Playwright/Edge and a running client at localhost:5173. During implementation, it exercised the UI against real authenticated API requests and MongoDB test records, including refresh persistence, draft/post, archive/delete confirmation, quiz scheduling with attachments, dark mode, and mobile layout.
