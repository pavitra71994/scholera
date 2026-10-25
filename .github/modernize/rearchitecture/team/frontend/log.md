## [teacher-view] Implemented teacher portal and assignment-scoped workflows
- Codebase/domain discoveries: student section membership is already modeled by `SchoolPerson.section`, so teacher assignments require a separate join table; existing attendance and exam controllers already contain the required validation/upsert rules and can be reused with an authenticated assignment guard.
- Wrong assumptions and corrections: the UI module root is `school-management-ui`; the repository root has no `package.json`. The development port 8080 was already occupied, so the isolated live API probe used port 18080.
- Debugging dead-ends and what actually worked: Testing Library must set each `<option>.selected` before dispatching a multiple-select change to exercise controlled multiselect selection; switched the test to explicit option selection.
- Techniques/patterns worth reusing for future tasks: keep teacher page modules separate from the application shell; use assigned-section API responses for selectors; keep roster/progress DTOs limited to names, roll numbers, aggregate attendance, and marks.
- Learnings consumed: [backend/student-identity-and-roll-sequencing]
