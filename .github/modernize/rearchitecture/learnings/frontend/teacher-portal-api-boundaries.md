# Teacher Portal API Boundaries

Use assigned-section APIs to populate teacher controls and keep teacher page modules separate from the application shell.

## What Happened

In Scholora task `teacher-view`, the teacher portal was added alongside an existing student portal. Teacher modules use teacher-only profile, section, roster, and progress endpoints; attendance and exam operations reuse existing routes, with server checks against assignments. Roster/progress DTOs expose only teaching workflow fields.

## Takeaway

For role-specific school workflows, keep UI pages in a role module and drive section selectors from the authenticated role's API response. Treat that list as presentation only: every section-scoped read and write must still verify the authenticated user's assignment on the server.

## History

- 2026-10-25 (`scholora/teacher-view`): initial
