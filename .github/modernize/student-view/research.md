# Resolved Scope Decisions: Student View

**Date**: 2026-10-25

The repository has no separate feature-spec, architecture, data-model, or API-contract artifact for this request. The plan uses the user-provided scope, the choices confirmed in chat, and the existing React/Spring implementation as its technical basis. No new design artifact is presented as upstream research.

## Confirmed decisions

### Student cards

- Keep the existing four student areas already named in `school-management-ui/src/App.tsx`:
  1. My Profile
  2. Exam Results & Progress
  3. Attendance Summary
  4. School Toppers
- Cards 2–4 are functional student-facing views rather than “Coming next” placeholders.

### Student profile and enrollment

- Required for new student enrollment: date of birth, mother name, and father name.
- Assign roll numbers automatically, sequentially within each section.
- Student self-service edits: display name and emergency contact only.
- Student-readable but not student-editable: DOB, parent names, class, section, and roll number.
- Add emergency contact as the suggested extra profile feature.
- Keep the new database columns nullable to avoid breaking existing student rows; enforce DOB and parent names in new-student request validation. Legacy rows without values show “Not provided”.
- A per-section unique constraint plus transactional sequence allocation was selected to prevent duplicate roll numbers if two student accounts are created concurrently.

### Results, attendance, and toppers

- Exam history presents exam, subject, obtained marks, maximum marks, and percentage for the signed-in student.
- Attendance history presents dated records and Present/Absent/Late totals. Percentage is calculated over recorded attendance entries only; an unrecorded date is not inferred to be an absence.
- The School Toppers card includes three ranking views:
  - Class-wise total marks
  - Section-wise total marks
  - Class-wise subject total marks
- Rank by the sum of recorded obtained marks, as requested. Exclude students without marks, show the top-ranked student(s) per group including ties, and expose aggregate leaderboard information only.

## Alternatives considered

- **Manually entered or global roll number**: not selected; automatic per-section sequencing was confirmed.
- **Allow editing parent data, DOB, class, or roll number in student self-service**: not selected; only name and emergency contact are editable.
- **Rank toppers by percentage or across the whole school**: not selected; the requested rankings use total marks within the specified class/section/subject scopes.
- **Treat missing attendance records as absences**: not selected because the current attendance model records entries only when attendance is submitted.
