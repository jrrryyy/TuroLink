# Subject availability walkthrough

1. Open **Teacher → Availability**.
2. Choose a **Subject** from the teacher's My Subjects records.
3. Choose the date and start time (12-hour AM/PM), then click **Add Slot**.
4. The subject code/title appears beside the slot under **Upcoming Availability**.
5. For an existing unreserved slot, choose **Assign subject** and click **Save Subject**. Reserved slots retain their current booking and cannot be reassigned.

Teachers without subjects see a link to **My Subjects**. A subject must be created before publishing new slots. Older unassigned slots remain stored but are hidden from student booking until assigned. Existing reserved slots and requests are preserved.

Students choose a subject on the tutor profile and see only that subject's available dates and times. The API checks that the chosen subject matches the slot and belongs to its teacher. Teacher acceptance still confirms the session and enrolls the student in that exact subject. The existing hourly rate applies to each new slot; Manila timezone and one-hour duration are unchanged.

Verified with the client build, targeted ESLint, MongoDB API checks, and Edge browser checks for teacher subject selection, student subject filtering, request/acceptance, and schedules. API checks also cover ownership, assigning legacy slots, rejecting changes to reserved slots, mismatched-subject rollback, and enrollment.

Restart the backend if running with `npm start`; `npm run dev` reloads changes automatically.
