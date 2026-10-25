# Scholora UI

React and TypeScript frontend for the single-school management MVP. It uses session-based authentication against the Spring Boot API and provides a role-aware workspace for administrators, teachers, and students.

## Requirements

- Node.js 24 or newer.
- npm.
- The API running locally, unless you are only running UI tests.

## Install and run

```sh
npm install
cp .env.example .env
npm run dev
```

Vite normally serves the UI at `http://localhost:5173`. Set the API URL in `.env` if the API is running somewhere else:

```dotenv
VITE_API_URL=http://localhost:8080/api/v1
```

Vite's development server provides hot module replacement: save a UI source file to see its changes in the browser without manually restarting the UI server. The API uses Spring Boot DevTools for restart-on-compiled-classpath changes; enable Java project auto-build in the IDE to compile saved Java edits.

The matching API setup, administrator bootstrap, database, and CORS configuration are documented in the [API README](../school-management-api/README.md).

## Administrator workflow

After an administrator signs in, the home page is the **School management** dashboard. Each card navigates to its own page; use the brand link or **School management** link to return to the dashboard.

1. **School profile** — edit the school name and timezone.
2. **Classes & sections** — create classes and add or remove sections in each class.
3. **Students & teachers** — create student and teacher accounts. Student accounts require assignment to a class section; teacher accounts are not assigned as students to a section. Passwords can be any non-empty length.
4. **Attendance** — choose a section and date, set each student's status to Present, Absent, or Late, and save the register. “Mark all present” is available as a convenience before individual adjustments.
5. **Exam Setup** — administrators add each school-wide exam name and academic year once; the API provisions it automatically for every existing section and for sections created later. Select a class, open a section card, and configure its subject list once for all exams in that section. Teachers can manage subjects only for their assigned sections.
6. **Marks Register** — administrators and assigned teachers select a class, section, exam, and subject to enter or update marks for every student in the section.

The UI uses URL hashes for admin page navigation (`#/admin`, `#/admin/school-profile`, `#/admin/classes-sections`, `#/admin/students-teachers`, `#/admin/attendance`, `#/admin/exam-setup`, and `#/admin/marks-register`). Admin pages are rendered independently so dashboard cards do not show their forms inline.

## Authentication and API behavior

- The frontend calls the API using `fetch` with `credentials: "include"` so the server session cookie is sent with requests.
- Mutating requests obtain a CSRF token and send it using the response's `headerName`.
- The default API base URL is `http://localhost:8080/api/v1`.
- Admin tools require an authenticated administrator session. A request error is shown in the affected page rather than silently treating the operation as successful.

## Project scripts

```sh
npm run dev          # Start the Vite development server
npm test             # Run the Vitest suite once
npm run test:watch   # Run Vitest in watch mode
npm run typecheck    # Run the TypeScript project checks
npm run build        # Type-check and create the production bundle in dist/
```

## Layout

- `public/` — files served directly without importing them.
- `src/assets/` — imported images, icons, and fonts.
- `src/components/` — reusable UI and role-specific dashboard panels.
- `src/pages/` — login and authenticated workspace screens.
- `src/routes/` — hash-route parsing; role-specific page access is selected in the workspace.
- `src/hooks/` — authentication and section-loading hooks.
- `src/services/` — API requests, session, and CSRF handling.
- `src/types/` — shared TypeScript API and domain types.
- `src/constants/` — fixed dashboard page definitions and labels.
- `src/utils/` — shared helpers such as local-date and person-class formatting.
- `src/styles/` — global responsive application styling.
- `src/tests/` — UI and navigation tests plus test setup.

`src/context/` and `src/store/` are intentionally not used yet: current shared session state is contained in the auth hook, and the application has no Context, Redux, or Zustand requirement.

The workspace overview is in the [root README](../README.md).
