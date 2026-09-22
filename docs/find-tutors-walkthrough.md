# Find Tutors walkthrough

## Student flow

1. Open the hamburger menu and select **Find Tutor**.
2. Search by teacher name or subject. Filter by subject, availability, or minimum rating. **Clear filters** resets the search.
3. Cards show real teacher profiles, hourly rates, available time categories, and review totals. Teachers without slots still have a **View Profile** link.
4. Choose **Book Now** to see the teacher's biography and reviews. The calendar opens at the next available month; only dates with open slots can be selected.
5. Select a date and time. Check the one-hour session details and total, then click **Confirm and Book Session**.
6. Open **Schedules** to see the confirmed booking. It also appears in the student dashboard's next-class section and the teacher's schedule/dashboard.
7. Once the session's end time has passed, open **Rate Tutors** or **Schedules > Past sessions**. Choose 1–5 stars and submit a review. Each booking can be reviewed once.

## Teacher setup

1. Open **Availability** in the hamburger menu.
2. Enter an hourly rate in Philippine pesos and click **Save Rate**.
3. Choose a future date and start hour, then click **Add Slot**. Each slot lasts one hour. Publish individual slots up to one year ahead.
4. Unbooked slots can be removed. Booked slots cannot be removed through this page.
5. Open **Schedules** to see student names, subjects, dates, times, and booked prices. Existing bookings keep their original price when the hourly rate changes.

## Details

- All session times use Asia/Manila (UTC+8), regardless of the browser's timezone.
- The layout uses the existing hamburger sidebar, topbar, and saved light/dark preference, with mobile layouts.
- Profiles and bookings use MongoDB. No sample teachers, invented reviews, or placeholder availability are added to the live database.
- A zero platform fee is shown. Booking reserves a time; no online payment is collected.
- Sessions become eligible for review after their end time. Attendance tracking, cancellations, video calls, and payment processing are outside this implementation.
- Slots start on the hour. Unique database indexes prevent duplicate teacher/student reservations. A MongoDB transaction claims the slot and saves the booking together, rolling back if the student already has a session at that time.
- MongoDB must support transactions (Atlas or a replica set). New `TutorSlot` and `Booking` collections/indexes are created by Mongoose. No existing accounts need migration; teachers start with no published rate or slots.
- Public tutor responses omit email, mobile number, password, and verification documents. Students can only review their own completed bookings.

## Validation performed

- API integration tests use the isolated `turolink_integration_checks` database and clean up their own records.
- Tests cover role restrictions, rates, past/invalid/duplicate slots, simultaneous booking attempts, student overlap rollback, price changes, private schedule access, dashboard integration, review eligibility, duplicate reviews, and calculated ratings.
- Edge browser checks cover teacher availability, search and filters, tutor details, calendar selection, booking confirmation, both schedules, persistence after reload, mobile navigation/overflow, dark mode, and review submission.
- Client production build and targeted ESLint checks pass.

Run `npm run test:tutors` from `server` for API checks. Optional browser checks use `npm run test:tutors -- --browser`, a running client on localhost:5173, and the Playwright installation at `%TEMP%/turolink-browser-check/node_modules/playwright`.

Run the backend with `npm run dev` to reload changes automatically. If using `npm start`, restart it once to load the new API routes.
