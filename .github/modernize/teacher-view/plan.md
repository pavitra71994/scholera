# Implementation Plan: Teacher View

**Date**: 2026-10-25 | **Spec**: User request and decisions recorded in [research.md](./research.md)

## Summary

Implement a teacher portal with five working cards: My Classes & Roster, Take Attendance, Exams & Marks, Class Progress, and My Profile. Administrators assign one or more sections to each teacher. Teachers can view student rosters and enter attendance, create exams, and manage marks only for assigned sections. Class Progress shows student attendance percentages and exam/subject marks for assigned sections. Teachers can view their name, username, and assigned sections and edit their display name and optional phone number.

Keep administrator access and existing student self-service behavior unchanged. Enforce section ownership on the server for every teacher read and write; a section ID supplied by the browser is never sufficient authorization.

## Technical Context

**Language/Version**: TypeScript 5.8 / React 19; Java 21
**Primary Dependencies**: Vite 6, Spring Boot 3.5, Spring Data JPA, Spring Security, Jakarta Validation
**Storage**: PostgreSQL with Flyway migrations; teachers are `SchoolPerson` records associated with `AppUser`; a join table represents teacher-to-section assignments
**Testing**: Existing UI uses Vitest and Testing Library; API uses Spring Boot Test, MockMvc, and H2
**Target Platform**: Existing web SPA and Spring REST API
**Performance Goals**: Fetch only assigned sections and the selected section's roster/academic data. Progress summaries should use bounded, section-scoped queries and must not load other sections' records.
**Constraints**: Preserve session-cookie and CSRF behavior, administrator access, student role boundaries, existing student profile fields and section relationship, and current attendance/exam data formats where possible. Do not reuse `school_person.section_id` for teacher assignments; that field represents a student's section.

## Constitution Check

- No `constitution.md` or project constitution artifact was present in the repository.
- Follow existing patterns: Flyway migrations, JPA repositories/entities, Spring role/method security, shared credentialed and CSRF-aware UI API client, role-specific dashboard rendering, and responsive styles.
- Teacher identity is resolved from the authenticated session. Every section-scoped teacher endpoint must verify that the teacher is assigned to the requested section or the section belonging to the exam.
- Preserve administrator permissions and keep parent names, DOB, emergency contacts, and student self-service APIs outside teacher responses.

## Applied Guidelines

- No framework-migration guidelines apply; this adds features to the existing React, Spring Boot, JPA, and Flyway implementation.
- Reuse attendance and exam workflows and validation rather than duplicating them. Factor section authorization into a shared helper/service if needed so both administrator and teacher entry points use one consistent ownership rule.
- Follow existing form conventions for loading, saving, success, validation, and API error states; keep the portal responsive using `school-management-ui/src/styles.css`.

## Implementation Steps

### Phase 1: Foundational teacher assignments and profile data

#### Step 1.1: Persist multiple teacher section assignments
- **Requirements**: REQ-002, REQ-008
- **Design inputs**: Existing `SchoolPerson` / `SchoolSection` relation, administrator-created people, user-confirmed multiple-section assignment.
- **Description**: Add a Flyway migration for a teacher-section assignment join table with foreign keys and a unique teacher/section pair. Map assignments without changing the student-specific `SchoolPerson.section` relation. Only teacher accounts may receive assignments; assignment to sections must be validated by service logic.

#### Step 1.2: Persist teacher phone number
- **Requirements**: REQ-003
- **Design inputs**: Existing `SchoolPerson` account/person model and user-confirmed profile edit policy.
- **Description**: Add an optional teacher phone field in a follow-on migration. Preserve existing teacher accounts and do not expose the field through student or administrator responses unless required by their existing contracts.

Tasks:
- [ ] T001 [Plan:1.1] Add `V5__teacher_section_assignments.sql` with a teacher-section join table, foreign keys, and unique assignment constraint in `school-management-api/src/main/resources/db/migration/V5__teacher_section_assignments.sql`.
- [ ] T002 [Plan:1.1] Map teacher section assignments and add repository queries for a teacher's sections and assignment checks in `school-management-api/src/main/java/com/schoolmanagement/school/SchoolPerson.java`, `school-management-api/src/main/java/com/schoolmanagement/school/TeacherSectionAssignment.java`, and `school-management-api/src/main/java/com/schoolmanagement/school/TeacherSectionAssignmentRepository.java`.
- [ ] T003 [Plan:1.2] Add a nullable teacher phone column and entity accessors in `school-management-api/src/main/resources/db/migration/V6__teacher_profile_phone.sql` and `school-management-api/src/main/java/com/schoolmanagement/school/SchoolPerson.java`.

### Phase 2: US1 — Administrator assigns teacher sections

#### Step 2.1: Assign and update multiple sections
- **Requirements**: REQ-002, REQ-008
- **Design inputs**: Existing `SchoolPeopleController` account creation flow and user-confirmed admin-managed multi-section assignments.
- **Description**: Add assignment management for teachers at creation and for existing teacher accounts in the admin directory. Accept a set of section IDs, validate every ID, reject duplicates and non-teacher targets, and persist updates transactionally. Preserve student creation and student section assignment behavior.

Tasks:
- [ ] T004 [Plan:2.1] Extend teacher account create/update handling to validate and persist a set of assigned section IDs without changing student behavior in `school-management-api/src/main/java/com/schoolmanagement/school/SchoolPeopleController.java` and `school-management-api/src/main/java/com/schoolmanagement/school/TeacherSectionAssignmentRepository.java`.
- [ ] T005 [Plan:2.1] Extend the admin people form and teacher directory to assign or update multiple sections per teacher, backed by explicit API request/response types in `school-management-ui/src/AdminModules.tsx` and `school-management-ui/src/api.ts`.

### Phase 3: US2 — Teacher profile, classes, and roster

#### Step 3.1: Serve teacher profile and assigned sections
- **Requirements**: REQ-003, REQ-008
- **Design inputs**: Session authentication, teacher-section assignments, profile edit scope confirmed by user.
- **Description**: Add teacher-only profile read/update operations returning display name, username, phone, and assigned section/class names. Permit updates only to display name and optional phone. Resolve teacher identity from the authentication principal.

#### Step 3.2: Serve assigned section rosters
- **Requirements**: REQ-004, REQ-008
- **Design inputs**: Existing student person, class/section, and roll number model.
- **Description**: Provide assigned sections and student rosters for those sections. Return only roster fields needed by teaching workflows (student name and roll number); do not return DOB, parent names, emergency contact, or other private profile data.

#### Step 3.3: Build teacher profile, class, and roster cards
- **Requirements**: REQ-001, REQ-003, REQ-004
- **Design inputs**: Existing role dashboard and student routing/card pattern in `school-management-ui/src/App.tsx`.
- **Description**: Add teacher-specific routes and make the five teacher cards navigable. Implement My Profile and My Classes & Roster with empty, loading, and error states. Redirect teachers to their workspace after sign-in and retain admin/student routing behavior.

Tasks:
- [ ] T006 [Plan:3.1] Add authenticated teacher-only profile GET/PATCH operations in `school-management-api/src/main/java/com/schoolmanagement/school/TeacherPortalController.java`, allowing edits only to name and phone.
- [ ] T007 [Plan:3.2] Add a teacher section and roster endpoint scoped to the authenticated teacher's assignment set in `school-management-api/src/main/java/com/schoolmanagement/school/TeacherPortalController.java` and `school-management-api/src/main/java/com/schoolmanagement/school/SchoolPersonRepository.java`.
- [ ] T008 [Plan:3.3] Add teacher profile, assigned section, and roster API types/client methods in `school-management-ui/src/api.ts`.
- [ ] T009 [Plan:3.3] Add teacher routing, dashboard navigation, My Profile, and My Classes & Roster views in `school-management-ui/src/App.tsx` and responsive styles in `school-management-ui/src/styles.css`.

### Phase 4: US3 — Attendance for assigned sections

#### Step 4.1: Allow assigned teachers to record and view attendance
- **Requirements**: REQ-005, REQ-008
- **Design inputs**: Existing attendance validation and upsert behavior in `AttendanceController`; user-confirmed record/update/history permission.
- **Description**: Reuse the existing attendance register behavior for teachers while preserving administrator access. Before reads and writes, verify the requested section is assigned to the authenticated teacher. Continue requiring complete attendance for every student in the section and reject duplicate or foreign student IDs.

#### Step 4.2: Implement the teacher attendance card
- **Requirements**: REQ-001, REQ-005
- **Design inputs**: Existing admin attendance form, date handling, and API client.
- **Description**: Add section selection from assigned sections, date selection, and present/absent/late entry and history. Provide empty states for unassigned teachers and sections without students; do not expose unassigned sections in the UI.

Tasks:
- [ ] T010 [Plan:4.1] Permit teacher attendance reads/writes only after assignment checks while retaining the admin path and existing register validation in `school-management-api/src/main/java/com/schoolmanagement/school/AttendanceController.java` and the section authorization helper.
- [ ] T011 [Plan:4.2] Add teacher attendance API client operations and assigned-section selection in `school-management-ui/src/api.ts` and `school-management-ui/src/TeacherModules.tsx`.
- [ ] T012 [Plan:4.2] Implement the Take Attendance view with date-based roster status editing, submission feedback, and history navigation in `school-management-ui/src/TeacherModules.tsx` and `school-management-ui/src/styles.css`.

### Phase 5: US4 — Exams and marks for assigned sections

#### Step 5.1: Allow assigned teachers to manage exams and marks
- **Requirements**: REQ-006, REQ-008
- **Design inputs**: Existing exam creation, mark validation, and mark upsert behavior in `SchoolExamController`; user-confirmed create-exam and enter/update-marks permission.
- **Description**: Preserve administrator access and let a teacher create exams only for assigned sections. Let teachers read exams and submit/update marks only for students belonging to the exam's assigned section. Validate every submitted student ID, reject duplicates and marks exceeding maximum marks, and reject unassigned sections/exams.

#### Step 5.2: Implement the teacher exams and marks card
- **Requirements**: REQ-001, REQ-006
- **Design inputs**: Existing `ExamsManagement` controls and API types.
- **Description**: Provide assigned-section selection, exam creation, exam selection, roster marks entry, and saved marks feedback. Keep the existing admin exam experience intact and show suitable no-section/no-student/no-exam states.

Tasks:
- [ ] T013 [Plan:5.1] Allow teachers to list/create exams for assigned sections and save marks only for the selected exam's assigned section, retaining existing admin access and validation in `school-management-api/src/main/java/com/schoolmanagement/school/SchoolExamController.java` and the section authorization helper.
- [ ] T014 [Plan:5.2] Add teacher exam/marks API client operations and build the Exams & Marks experience using assigned sections and student rosters in `school-management-ui/src/api.ts` and `school-management-ui/src/TeacherModules.tsx`.

### Phase 6: US5 — Class progress

#### Step 6.1: Serve assigned-section progress
- **Requirements**: REQ-007, REQ-008
- **Design inputs**: Existing attendance records, exams, marks, and user-confirmed progress scope.
- **Description**: Return per-student recorded attendance counts/percentage and exam/subject marks for a selected assigned section. Never infer absences from dates without attendance records; include maximum marks to contextualize results. Do not include student DOB, parent details, emergency contact, or data from unassigned sections.

#### Step 6.2: Implement Class Progress card
- **Requirements**: REQ-001, REQ-007
- **Design inputs**: Teacher section selector, attendance and exam history response patterns, responsive table conventions.
- **Description**: Add an assigned-section filter and a student progress view with attendance percentage and exam/subject marks. Present clear empty states when the section has no attendance or exam marks.

Tasks:
- [ ] T015 [Plan:6.1] Add teacher-only per-student attendance and exam/subject progress aggregation scoped to an assigned section in `school-management-api/src/main/java/com/schoolmanagement/school/TeacherPortalController.java`, `school-management-api/src/main/java/com/schoolmanagement/school/AttendanceRecordRepository.java`, and `school-management-api/src/main/java/com/schoolmanagement/school/ExamMarkRepository.java`.
- [ ] T016 [Plan:6.2] Add the class-progress API client and implement the assigned-section progress filter, attendance percentages, exam marks, and empty states in `school-management-ui/src/api.ts`, `school-management-ui/src/TeacherModules.tsx`, and `school-management-ui/src/styles.css`.

## Project Structure

```text
school-management-api/
  src/main/resources/db/migration/
    V5__teacher_section_assignments.sql
    V6__teacher_profile_phone.sql
  src/main/java/com/schoolmanagement/school/
    SchoolPerson.java
    TeacherSectionAssignment.java
    TeacherSectionAssignmentRepository.java
    SchoolPeopleController.java
    TeacherPortalController.java
    AttendanceController.java
    SchoolExamController.java
    AttendanceRecordRepository.java
    ExamMarkRepository.java
    SchoolPersonRepository.java
school-management-ui/src/
  AdminModules.tsx
  TeacherModules.tsx
  App.tsx
  api.ts
  styles.css
```

## Requirement Mapping

| REQ ID | Description | Plan Items | Implementation Evidence |
|--------|-------------|------------|------------------------|
| REQ-001 | Teacher dashboard provides five working cards and navigable pages. | 3.3, 4.2, 5.2, 6.2 | `school-management-ui/src/App.tsx`, `school-management-ui/src/TeacherModules.tsx`, `school-management-ui/src/styles.css` |
| REQ-002 | Administrators assign and update multiple sections for each teacher. | 1.1, 2.1 | `V5__teacher_section_assignments.sql`, `TeacherSectionAssignment.java`, `SchoolPeopleController.java`, `AdminModules.tsx` |
| REQ-003 | Teacher profile displays name, username, phone, and assigned sections; teacher can edit name and optional phone only. | 1.2, 3.1, 3.3 | `V6__teacher_profile_phone.sql`, `TeacherPortalController.java`, `App.tsx`, `TeacherModules.tsx` |
| REQ-004 | Teacher can view assigned classes and the roster for each assigned section. | 3.2, 3.3 | `TeacherPortalController.java`, `SchoolPersonRepository.java`, `TeacherModules.tsx` |
| REQ-005 | Teacher can record/update and view attendance only for assigned sections. | 4.1, 4.2 | `AttendanceController.java`, section authorization helper, `TeacherModules.tsx` |
| REQ-006 | Teacher can create exams and enter/update marks only for assigned sections. | 5.1, 5.2 | `SchoolExamController.java`, section authorization helper, `TeacherModules.tsx` |
| REQ-007 | Teacher can view assigned-section student attendance percentages and exam/subject marks. | 6.1, 6.2 | `TeacherPortalController.java`, `AttendanceRecordRepository.java`, `ExamMarkRepository.java`, `TeacherModules.tsx` |
| REQ-008 | All teacher data and actions are restricted to their assignments; existing administrator and student permissions remain intact. | 1.1, 2.1, 3.1, 3.2, 4.1, 5.1, 6.1 | `TeacherSectionAssignmentRepository.java`, `TeacherPortalController.java`, `AttendanceController.java`, `SchoolExamController.java` |
