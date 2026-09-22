# Find Tutors walkthrough

## Student flow

1. Open the hamburger menu and select **Find Tutor**.
2. Search by teacher name or subject. Filter by subject, availability, or minimum rating. **Clear filters** resets the search.
3. Cards show real teacher profiles, hourly rates, available time categories, and review totals. Teachers without slots still have a **View Profile** link.
4. Choose **Book Now** to see the teacher's biography and reviews. The calendar opens at the next available month; only dates with open slots can be selected.
5. Select a date and time. Check the one-hour session details and total, then click **Send Tutoring Request**.
6. Open **Schedules > Requests** to track pending or declined requests. After teacher acceptance, the session appears under **Upcoming** and in both dashboards. The student sidebar no longer has a Request button.
7. Once the session's end time has passed, open **Rate Tutors** or **Schedules > Past sessions**. Choose 1–5 stars and submit a review. Each booking can be reviewed once.

## Teacher setup

1. Open **Availability** in the hamburger menu.
2. Enter an hourly rate in Philippine pesos and click **Save Rate**.
3. Choose a future date and start hour, then click **Add Slot**. Each slot lasts one hour. Publish individual slots up to one year ahead.
4. Open **Request** in the teacher sidebar. Review each student's name, subject, date, time, and rate, then **Accept** or **Decline**. Accepting confirms the session; declining releases the time slot. Only the assigned teacher can decide, and expired requests cannot be accepted.
5. Unreserved slots can be removed. Pending requests and confirmed bookings reserve the slot; these cannot be removed through Availability.
6. Open **Schedules** to see student names, subjects, dates, times, and booked prices. Existing bookings keep their original price when the hourly rate changes. The Requests tab keeps declined history visible.

## Details

- All session times use Asia/Manila (UTC+8), regardless of the browser's timezone.
- The layout uses the existing hamburger sidebar, topbar, and saved light/dark preference, with mobile layouts.
- Profiles and bookings use MongoDB. No sample teachers, invented reviews, or placeholder availability are added to the live database.
- A zero platform fee is shown. Booking reserves a time; no online payment is collected.
- Only accepted sessions become eligible for review after their end time. Pending and declined requests cannot be rated. Attendance tracking, cancellations, video calls, and payment processing are outside this implementation.
- Existing bookings from before the approval feature remain confirmed. New requests explicitly start pending. Declining atomically archives the record in `DeclinedRequest`, removes its active reservation, and releases the slot, so the student can request that time again without losing history.
- Slots start on the hour. Unique database indexes prevent duplicate teacher/student reservations. A MongoDB transaction claims the slot and saves the booking together, rolling back if the student already has a session at that time.
- MongoDB must support transactions (Atlas or a replica set). New `TutorSlot` and `Booking` collections/indexes are created by Mongoose. No existing accounts need migration; teachers start with no published rate or slots.
- Public tutor responses omit email, mobile number, password, and verification documents. Students can only review their own completed bookings.

## Validation performed

- API integration tests use the isolated `turolink_integration_checks` database and clean up their own records.
- Tests cover role restrictions, rates, past/invalid/duplicate slots, simultaneous booking attempts, student overlap rollback, price changes, private schedule access, dashboard integration, review eligibility, duplicate reviews, and calculated ratings.
- Approval tests cover teacher-only access, ownership, pending status, acceptance, expired requests, decline/rebooking, and review restrictions. Edge browser checks cover sending a student request, teacher acceptance, confirmed schedules after reload, and the student sidebar without Request.
- Client production build and targeted ESLint checks pass.

Run `npm run test:tutors` from `server` for API checks. Optional browser checks use `npm run test:tutors -- --browser`, a running client on localhost:5173, and the Playwright installation at `%TEMP%/turolink-browser-check/node_modules/playwright`.

Run the backend with `npm run dev` to reload changes automatically. If using `npm start`, restart it once to load the new API routes.
