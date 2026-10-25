# Implementation Plan: Student View and Four Dashboard Cards

**Date**: 2026-10-25 | **Spec**: User request and decisions recorded in [research.md](./research.md)

## Summary

Implement a student-facing portal in the existing React application, replacing the four placeholder cards with working student pages for My Profile, Exam Results & Progress, Attendance Summary, and School Toppers. Extend the student record and administrator enrollment flow to capture date of birth and both parent names, and assign each student a sequential roll number within their section.

The student API will derive the student identity from the authenticated session rather than accept a client-supplied student ID. Students can update their own display name and emergency contact only; DOB, parent names, class, section, and roll number remain read-only in the student view. Student-only endpoints will return only the signed-in student's profile, marks, and attendance, except for the requested leaderboards.

## Technical Context

**Language/Version**: TypeScript 5.8 / React 19; Java 21
**Primary Dependencies**: Vite 6, Spring Boot 3.5, Spring Data JPA, Spring Security, Jakarta Validation
**Storage**: PostgreSQL with Flyway migrations; `school_person` owns student-specific profile data and links to `school_section`
**Testing**: Existing UI uses Vitest and Testing Library; API uses Spring Boot Test, MockMvc, and H2
**Target Platform**: Existing web SPA and Spring REST API
**Performance Goals**: Student pages should fetch only the signed-in student's required data; leaderboard aggregates should be computed by the API in grouped queries rather than loading all marks into the browser.
**Constraints**: Preserve session-cookie and CSRF behavior; do not expose another student's profile, DOB, parent names, emergency contact, or individual marks through student endpoints. Existing student rows must remain migratable if they predate the new profile fields.

## Constitution Check

- No `constitution.md` or project constitution artifact was present in the repository.
- The approach follows existing conventions: Flyway schema changes, JPA entities/repositories, role-protected Spring controllers, the shared credentialed/CSRF-aware UI API client, and role-specific React rendering.
- New student endpoints must enforce `STUDENT` authorization and resolve ownership from the authenticated principal. No client-provided identity parameter is trusted for personal records.
- Existing student records are preserved by adding nullable database columns and enforcing required parent names and DOB at new student enrollment. Empty legacy values display as “Not provided” until populated through a supported administrative workflow.

## Applied Guidelines

- No framework-migration guidelines apply; this is an additive feature using the existing React, Spring Boot, JPA, and Flyway patterns.
- Continue the existing API error handling and form loading/saving/error-state conventions. Keep responsive layouts consistent with `school-management-ui/src/styles.css`.

## Implementation Steps

### Phase 1: Foundational student data

#### Step 1.1: Add student profile fields
- **Requirements**: REQ-002, REQ-003
- **Design inputs**: Existing `school_person` schema, `SchoolPerson` entity, and user-confirmed profile fields.
- **Description**: Add a Flyway migration and JPA mappings for DOB, mother name, father name, emergency contact, and section-scoped roll number. Keep new columns nullable for existing database rows, while new-student validation requires DOB and both parent names. Enforce uniqueness for non-null roll numbers within a section.

#### Step 1.2: Assign roll numbers safely
- **Requirements**: REQ-003
- **Design inputs**: User-confirmed automatic sequencing within a section; existing section ownership and transactional person creation.
- **Description**: Assign the next roll number when an administrator creates a student. Serialize sequence allocation per section within the enrollment transaction and back it with a database uniqueness constraint so concurrent enrollments cannot receive the same number. Teachers do not receive student roll numbers.

Tasks:
- [ ] T001 [Plan:1.1] Add a Flyway migration for nullable student DOB, mother/father names, optional emergency contact, and section-scoped roll number columns with a unique `(section_id, roll_number)` constraint in `school-management-api/src/main/resources/db/migration/V4__student_profile_fields.sql`.
- [ ] T002 [Plan:1.1] Map the new student fields and roll number in `school-management-api/src/main/java/com/schoolmanagement/school/SchoolPerson.java`.

### Phase 2: US1 — Administrator student enrollment

#### Step 2.1: Collect required student profile data during enrollment
- **Requirements**: REQ-003
- **Design inputs**: Existing `SchoolPeopleController.CreatePersonRequest` validation and `PeopleManagement` form.
- **Description**: Extend student creation to accept required DOB, mother name, and father name, plus an optional emergency contact. Update the admin form so these fields appear only when the account type is Student. Preserve the existing teacher creation behavior and section assignment requirement.

Tasks:
- [ ] T003 [Plan:1.2,2.1] Add transactional per-section roll-number allocation and required request validation for new student records in `school-management-api/src/main/java/com/schoolmanagement/school/SchoolPeopleController.java` and `school-management-api/src/main/java/com/schoolmanagement/school/SchoolSectionRepository.java`.
- [ ] T004 [Plan:2.1] Add conditional DOB, mother name, father name, and optional emergency-contact inputs to the student form in `school-management-ui/src/AdminModules.tsx`; send the values through `school-management-ui/src/api.ts` while leaving teacher creation unchanged.

### Phase 3: US2 — Student dashboard and profile

#### Step 3.1: Serve and update the signed-in student's own profile
- **Requirements**: REQ-002, REQ-007
- **Design inputs**: Session-based authentication in `AuthController`, the `AppUser`/`SchoolPerson` relation, and the user-confirmed edit policy.
- **Description**: Add a student-only profile endpoint that returns the student's name, DOB, parent names, emergency contact, class, section, and roll number. Add a partial update that accepts only display name and emergency contact. Resolve the student from the authenticated principal and reject access by other roles.

#### Step 3.2: Make student cards navigable and implement My Profile
- **Requirements**: REQ-001, REQ-002
- **Design inputs**: Existing `roleFeatures` labels in `App.tsx`, admin hash-navigation pattern, and `feature-grid` styles.
- **Description**: Add student-specific navigation and route state, redirect students to their own dashboard after sign-in, make the four existing student cards open their corresponding pages, and replace the profile placeholder with a view/edit form. Show class details and roll number as read-only and provide explicit loading, save, and error feedback.

Tasks:
- [ ] T005 [Plan:3.1] Add authenticated, student-role-only GET/PATCH profile handling that scopes reads and updates to the current principal in `school-management-api/src/main/java/com/schoolmanagement/school/StudentPortalController.java`; validate editable fields and never accept a student ID from the request.
- [ ] T006 [Plan:3.2] Add student profile types and GET/PATCH methods using the shared API client in `school-management-ui/src/api.ts`.
- [ ] T007 [Plan:3.2] Add student route parsing, role-aware post-login navigation, clickable student cards, and the profile view/edit page in `school-management-ui/src/App.tsx`; add responsive profile styles in `school-management-ui/src/styles.css`.

### Phase 4: US3 — Exam results and attendance history

#### Step 4.1: Provide the student's exam and marks history
- **Requirements**: REQ-004, REQ-007
- **Design inputs**: Existing exam/mark entities and section-linked student records.
- **Description**: Provide the signed-in student's exam name, subject, obtained marks, maximum marks, and percentage in a stable history order. Return only records belonging to that student and show a useful empty state before marks are entered.

#### Step 4.2: Provide attendance history and summary
- **Requirements**: REQ-005, REQ-007
- **Design inputs**: Existing `AttendanceRecord` date/status model and repository.
- **Description**: Return the signed-in student's recorded attendance entries and summary counts for Present, Absent, and Late. Calculate attendance percentage from recorded attendance entries only; do not treat dates without an attendance record as absences.

Tasks:
- [ ] T008 [Plan:4.1] Add a student-only exam history query and response scoped to the authenticated student in `school-management-api/src/main/java/com/schoolmanagement/school/StudentPortalController.java` and `school-management-api/src/main/java/com/schoolmanagement/school/ExamMarkRepository.java`.
- [ ] T009 [Plan:4.1] Add the exam-history API types/client method and replace the results-card placeholder with a responsive results list showing subject, exam, marks, maximum marks, percentage, and an empty state in `school-management-ui/src/api.ts`, `school-management-ui/src/App.tsx`, and `school-management-ui/src/styles.css`.
- [ ] T010 [Plan:4.2] Add a student-only attendance-history query and summary, scoped to the authenticated student and ordered by date, in `school-management-api/src/main/java/com/schoolmanagement/school/StudentPortalController.java` and `school-management-api/src/main/java/com/schoolmanagement/school/AttendanceRecordRepository.java`.
- [ ] T011 [Plan:4.2] Add the attendance-history API types/client method and replace the attendance-card placeholder with dated entries, Present/Absent/Late totals, recorded-days attendance percentage, and an empty state in `school-management-ui/src/api.ts`, `school-management-ui/src/App.tsx`, and `school-management-ui/src/styles.css`.

### Phase 5: US4 — Student toppers

#### Step 5.1: Display class, section, and subject toppers
- **Requirements**: REQ-006, REQ-007
- **Design inputs**: User-confirmed ranking scopes and raw total-marks rule; existing class/section/exam/mark relations.
- **Description**: Add student-visible leaderboards for class-wide total marks, section-wide total marks, and class-by-subject total marks. Rank by the sum of recorded obtained marks, omit students with no marks, and show the top-ranked student(s) in each group, including everyone tied at the top. Display only leaderboard name, class/section/subject grouping, and aggregate total—not profile or per-exam personal data.

Tasks:
- [ ] T012 [Plan:5.1] Add grouped mark aggregation and student-role-only leaderboard responses for class totals, section totals, and class/subject totals in `school-management-api/src/main/java/com/schoolmanagement/school/StudentPortalController.java`, `school-management-api/src/main/java/com/schoolmanagement/school/ExamMarkRepository.java`, and `school-management-api/src/main/java/com/schoolmanagement/school/SchoolPersonRepository.java`.
- [ ] T013 [Plan:5.1] Add the toppers API types/client method and implement the three leaderboard views with rank/tie handling and empty states in `school-management-ui/src/api.ts`, `school-management-ui/src/App.tsx`, and `school-management-ui/src/styles.css`.

## Project Structure

```text
school-management-api/
  src/main/resources/db/migration/
    V4__student_profile_fields.sql
  src/main/java/com/schoolmanagement/school/
    SchoolPerson.java
    SchoolPeopleController.java
    StudentPortalController.java
    SchoolSectionRepository.java
    ExamMarkRepository.java
    AttendanceRecordRepository.java
    SchoolPersonRepository.java
school-management-ui/src/
  AdminModules.tsx
  App.tsx
  api.ts
  styles.css
```

## Requirement Mapping

| REQ ID | Description | Plan Items | Implementation Evidence |
|--------|-------------|------------|------------------------|
| REQ-001 | Student dashboard presents four working cards for profile, results, attendance, and toppers. | 3.2 | `school-management-ui/src/App.tsx`, `school-management-ui/src/styles.css` |
| REQ-002 | Student profile shows name, DOB, mother/father names, class/section, roll number, and emergency contact; student can edit name and emergency contact only. | 1.1, 3.1, 3.2 | `SchoolPerson.java`, `StudentPortalController.java`, `school-management-ui/src/App.tsx`, `school-management-ui/src/api.ts` |
| REQ-003 | Admin student enrollment captures required DOB and parent names and automatically assigns a section-scoped roll number. | 1.1, 1.2, 2.1 | `V4__student_profile_fields.sql`, `SchoolPeopleController.java`, `SchoolSectionRepository.java`, `school-management-ui/src/AdminModules.tsx`, `school-management-ui/src/api.ts` |
| REQ-004 | Student can view their exam/marks history with obtained and maximum marks and percentage. | 4.1 | `StudentPortalController.java`, `ExamMarkRepository.java`, `school-management-ui/src/App.tsx`, `school-management-ui/src/api.ts` |
| REQ-005 | Student can view dated attendance history and a summary based on recorded days. | 4.2 | `StudentPortalController.java`, `AttendanceRecordRepository.java`, `school-management-ui/src/App.tsx`, `school-management-ui/src/api.ts` |
| REQ-006 | Student can view class-total, section-total, and class-by-subject toppers ranked by total marks. | 5.1 | `StudentPortalController.java`, `ExamMarkRepository.java`, `school-management-ui/src/App.tsx`, `school-management-ui/src/api.ts` |
| REQ-007 | Student data endpoints are role-protected and self-scoped; peer data is exposed only as the requested aggregate leaderboard. | 3.1, 4.1, 4.2, 5.1 | `StudentPortalController.java`, `ExamMarkRepository.java`, `AttendanceRecordRepository.java` |
