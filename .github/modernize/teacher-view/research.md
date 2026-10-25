# Resolved Scope Decisions: Teacher View

**Date**: 2026-10-25

The repository has no separate teacher feature specification, architecture report, or API contract. This plan is grounded in the existing React/Spring implementation and the user-confirmed scope below. The previous student implementation is present in the current worktree; its implementation did not include teacher-section assignments.

## Confirmed decisions

### Dashboard

The teacher workspace will provide five cards:

1. My Classes & Roster
2. Take Attendance
3. Exams & Marks
4. Class Progress
5. My Profile

The first four operational cards were proposed and accepted by the user; My Profile was added at the user's request.

### Assignments and permissions

- Administrators assign multiple sections to each teacher.
- Teachers may record/update attendance and view its history in assigned sections.
- Teachers may create exams and enter/update marks in assigned sections.
- Server endpoints must enforce the assignment boundary; hiding unauthorized sections in the UI is not sufficient.
- Preserve the existing administrator workflows and keep student authorization/data separate.

### Teacher profile

- Display teacher name, username, and assigned sections.
- Allow teacher self-edit of display name and optional phone number only.

### Class progress

- Recommended default: per-student recorded attendance percentage and exam/subject marks for a selected assigned section.
- Attendance percentage uses recorded attendance entries only; unrecorded dates are not absences.
- Do not expose student DOB, parent names, emergency contacts, or other sections' records.
- The user did not provide a different progress scope when asked; this plan uses the recommended default.

## Technical constraints discovered in the codebase

- `SchoolPerson.section` currently represents the student's single section; do not repurpose it for teachers.
- Attendance and exam controllers are currently administrator-only, while their validation and upsert behavior should be reused for teachers.
- The admin people flow creates teacher accounts without section assignments. It needs multi-section assignment support at creation and for existing teacher accounts.
- The existing role cards are placeholders. The student portal provides a pattern for role-specific pages and hash navigation.
