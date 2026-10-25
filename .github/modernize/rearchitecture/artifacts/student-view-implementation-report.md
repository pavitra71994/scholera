# Student View Implementation Report — Detail

## Summary

Implemented the student portal and enrollment changes from the existing student-view plan. The four student dashboard cards now navigate to profile, exam history, attendance, and topper pages. Student profile/history endpoints derive the student from the authenticated username; only name and emergency contact are editable. Enrollment validates DOB and parent names and allocates section-local roll numbers while locking the section row in the enrollment transaction.

## Upstream Artifacts Consumed

- `.github/modernize/student-view/plan.md` — implementation phases, task breakdown T001–T013, REQ-001–REQ-007 contracts, and repository conventions.
- `.github/modernize/student-view/research.md` — confirmed scope decisions for required enrollment fields, self-edit limits, attendance calculation, ranking basis, and tied top ranks.
- `.github/modernize/student-view/checkpoints/plan-to-tasks.yaml` — validated all eight plan items are covered by 13 tasks.
- `.github/modernize/student-view/checkpoints/spec-to-plan.yaml` — confirmed seven requirements are mapped to the plan.

## Evidence Mapping

- `plan.md#Phase 1 / T001–T003` → V4 schema migration, entity fields, section-row locking, transactional per-section roll allocation, enrollment validation, and API test coverage.
- `plan.md#Phase 2 / T004` → conditional student-only enrollment inputs and expanded create-person API payload.
- `plan.md#Phase 3 / T005–T007` → role-protected self-scoped profile API, editable-field whitelist, profile API client, hash routes, profile view, and responsive styling.
- `plan.md#Phase 4 / T008–T011` → student-only exam/attendance history APIs, per-student result query, recorded-day attendance summary, and UI history/empty states.
- `plan.md#Phase 5 / T012–T013` → grouped raw-mark aggregates, top-rank tie inclusion, and class/section/subject leaderboard views.
- `research.md#Confirmed decisions / Results, attendance, and toppers` → recorded attendance entries only; late is counted as attended; toppers use raw total marks and show ties; peer-specific results/profile/attendance are not returned.
- `spec-to-plan.yaml#requirements` → REQ-001 through REQ-007 covered by source changes and test evidence below.

## Changed Files

### API

- `school-management-api/src/main/resources/db/migration/V4__student_profile_fields.sql` — nullable student DOB/parent/emergency/roll columns and section-roll uniqueness.
- `school-management-api/src/main/java/com/schoolmanagement/school/SchoolPerson.java` — student fields and permitted self-edit operation.
- `school-management-api/src/main/java/com/schoolmanagement/school/SchoolPeopleController.java` — enrollment validation, locked per-section allocation, and admin roll-number response.
- `school-management-api/src/main/java/com/schoolmanagement/school/SchoolSectionRepository.java` — pessimistic section-row lock lookup.
- `school-management-api/src/main/java/com/schoolmanagement/school/SchoolPersonRepository.java` — authenticated username lookup and current maximum roll query.
- `school-management-api/src/main/java/com/schoolmanagement/school/StudentPortalController.java` — student profile, exam history, attendance summary/history, and top-rank aggregates.
- `school-management-api/src/main/java/com/schoolmanagement/school/ExamMark.java` — exam accessor for scoped history mapping.
- `school-management-api/src/main/java/com/schoolmanagement/school/ExamMarkRepository.java` — ordered student history and grouped leaderboard projections.
- `school-management-api/src/main/java/com/schoolmanagement/school/AttendanceRecord.java` — attendance date accessor.
- `school-management-api/src/main/java/com/schoolmanagement/school/AttendanceRecordRepository.java` — ordered student attendance history query.
- `school-management-api/src/test/java/com/schoolmanagement/SchoolManagementApiTest.java` — required enrollment fields, section sequencing, self-scope, editable profile fields, attendance ratio, raw-total ties, and role restrictions.

### UI

- `school-management-ui/src/api.ts` — student portal DTOs and session/CSRF-aware client functions; enrollment fields in request type.
- `school-management-ui/src/AdminModules.tsx` — conditional student profile inputs and roll-number display in directory.
- `school-management-ui/src/App.tsx` — four navigable student dashboard cards and profile/results/attendance/toppers pages with loading/error/empty states.
- `school-management-ui/src/styles.css` — responsive profile, history, attendance, and leaderboard styles.
- `school-management-ui/src/App.test.tsx` — student dashboard navigation, profile edit/read-only fields, attendance/results/toppers views, and enrollment form tests.

## Test Results

- API command: `cd school-management-api && ./mvnw -B test`
  - Passed: 11
  - Failed: 0
  - Skipped: 0
- API build command: `cd school-management-api && ./mvnw -B package`
  - Result: passed; the package lifecycle also ran 11 tests (0 failures, 0 skipped).
- UI command: `cd school-management-ui && npm test`
  - Passed: 5
  - Failed: 0
  - Skipped: 0
- UI build command: `cd school-management-ui && npm run build`
  - Result: passed (`tsc -b` and Vite production build).
- Runtime API probes against a temporarily started Spring application:
  - `GET /api/v1/health` — 200.
  - `GET /api/v1/student/profile` — 200.
  - `PATCH /api/v1/student/profile` — 200.
  - `GET /api/v1/student/exam-history` — 200.
  - `GET /api/v1/student/attendance-history` — 200.
  - `GET /api/v1/student/toppers` — 200.
  - Temporary API process stopped after probes.

## Validation Errors and Resolutions

- The first UI test run exposed two test-harness issues: tests were not cleaning up prior rendered React trees, and the enrollment component was imported from the wrong module. Added explicit Testing Library cleanup and corrected the import; the final UI suite passes.
- The first API test run had one failure because an existing test selected the first student in a shared H2 database rather than the student it had just enrolled. It now uses the response from its own enrollment; the final API suite passes.
- Initial test commands were launched from the workspace parent rather than their module directories and returned `ENOENT`; rerunning from each project directory succeeded.
- The first runtime probe shell command wrote and read different temporary filenames; the probe was rerun with the corrected path and all student endpoints returned 200.

## Warnings and Partial Changes

- No implementation task remains partially applied.
- The active Node runtime is `v23.8.0`, while `school-management-ui/package.json` declares `^24.0.0 || >=26.0.0`. The test suite and build nevertheless completed successfully; do not treat the runtime as satisfying the declared engine range.
- No unresolved endpoint failures or test failures remain.
