# Validation walkthrough

## Login

- Email must have a valid format; surrounding whitespace is removed and case is normalized.
- Password is required, but registration length rules are not reapplied when logging in.
- Passwords are never trimmed or otherwise normalized.
- Unknown email and incorrect password receive the same credentials error.
- Submission is locked while the request runs. A failed request preserves the entered values.

## Student and teacher registration

- Names support Unicode letters, spaces, periods, hyphens, and straight/curly apostrophes, up to 100 characters. Blank names and digits-only names are rejected.
- Phone format follows the existing Philippine mobile placeholder: 09XXXXXXXXX or +639XXXXXXXXX. Spaces, parentheses, and hyphens are accepted; storage uses the 09 format.
- Password minimum remains six characters. A 72 UTF-8 byte maximum prevents bcrypt truncation. Confirmation must match exactly, including spaces.
- Terms acceptance is required on both the client and server.
- Duplicate email errors appear beside Email, including database uniqueness races.
- Mobile numbers are unique for new student/teacher registrations. Equivalent 09 and +639 formats share a canonical database key. Duplicate errors appear beside Phone Number; the unique index also protects simultaneous signups.
- Two pre-existing accounts currently share a mobile number. Their numbers were left unchanged pending a corrected number from the owner. The legacy-number check blocks new reuse of that number; a sparse unique canonical-key index protects new registrations without disabling the existing accounts.
- Teacher degree and subject fields are required (200 characters maximum); teaching bio is required (2,000 characters maximum).
- Teacher verification consent is required. A document remains optional. When provided, it must be PDF/JPG/PNG and no larger than 5 MB.
- Teacher registration validates account fields before Next and rechecks both steps before submitting. Server account-field errors return the form to step one without clearing it.
- Fixed teacher signup's incorrect response handling and redundant token storage/navigation. AuthContext owns token storage.

## Teaching tasks

- Subject creation requires nonblank code (30 characters maximum) and title (200 maximum). Description is optional, up to 5,000 characters. Partial updates validate supplied fields and reject non-string values. Creation locks duplicate submissions and shows field errors.
- Announcements allow text, an attachment, a link, or a combination. Text has a 20,000 character limit; links require HTTP(S); scheduled posting must be in the future. File/link-only announcements now work with the database schema.
- Classwork retains its title, type, instructions, points, optional due date, attachment, draft/post, and scheduling validation. API field errors now appear beside relevant editor fields; failed saves retain the editor. Scheduled posting requires a future time and a due date later than that time when one is supplied.
- Delete confirmation and ownership checks remain in place.

## Implementation

Shared rules live in shared/validation.mjs and are used by the React forms and Express validation middleware. The server rejects invalid direct API requests even if browser validation is bypassed. Rejected teacher registrations clean up newly uploaded verification files; profile-creation failures roll back the newly created teacher account.

## Verification

- Client production build and targeted ESLint checks passed for the changed forms/components.
- `npm run test:validation` from server verifies shared rules and real API/MongoDB behavior in the isolated test database.
- `node scripts/check-validation.js --browser` additionally tests inline errors, blocked invalid submissions, retained login inputs, student signup/login, and two-step teacher signup against the real API. This optional check requires the same local Playwright/Edge setup used by the existing browser scripts and a client at localhost:5173.
- Existing subject and classwork checks were rerun to verify persistence and task workflows.
- Tests clean up their own users, profiles, subjects, and attachments. They do not use real user accounts.
- AuthContext still has the pre-existing Fast Refresh lint warning about exporting a hook alongside a provider; targeted form/component lint passes.

Restart the backend if running with `npm start` to load the middleware. The registration API now requires confirmPassword and terms, plus verificationConsent for teachers; the updated forms send them.
