# Student Identity And Roll Sequencing

Use the authenticated username to resolve a student’s `SchoolPerson`, and serialize section-local roll allocation by locking the section row before reading its current maximum.

## What Happened

In Scholora task `student-view`, student profile, exam, and attendance endpoints were implemented without accepting a student ID. The repository resolves the authenticated username, while a pessimistic write lock on the section is held through `max(rollNumber) + 1` allocation. The unique `(section_id, roll_number)` constraint provides a persistence-level guard for concurrent enrollment.

## Takeaway

For this application, keep personal student endpoints principal-scoped, keep roll numbers nullable for legacy rows and non-student accounts, and assign new values only inside the enrollment transaction after locking the target section.

## History

- 2026-10-25 (`scholora/student-view`): initial
