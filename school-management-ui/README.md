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

The matching API setup, administrator bootstrap, database, and CORS configuration are documented in the [API README](../school-management-api/README.md).

## Administrator workflow

After an administrator signs in, the home page is the **School management** dashboard. Each card navigates to its own page; use the brand link or **School management** link to return to the dashboard.

1. **School profile** — edit the school name and timezone.
2. **Classes & sections** — create classes and add or remove sections in each class.
3. **Students & teachers** — create student and teacher accounts. Student accounts require assignment to a class section; teacher accounts are not assigned as students to a section. Initial passwords must be at least 12 characters.
4. **Attendance** — choose a section and date, set each student's status to Present, Absent, or Late, and save the register. “Mark all present” is available as a convenience before individual adjustments.
5. **Exams & marks** — create an exam for a section with a subject and maximum score, then enter and save numeric scores for its students. Scores must be between zero and the exam maximum.

The UI uses URL hashes for admin page navigation (`#/admin`, `#/admin/school-profile`, `#/admin/classes-sections`, `#/admin/students-teachers`, `#/admin/attendance`, and `#/admin/exams-marks`). Admin pages are rendered independently so dashboard cards do not show their forms inline.

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

- `src/App.tsx` — sign-in, role-aware workspace, admin dashboard, and page routing.
- `src/AdminModules.tsx` — student/teacher, attendance, and exam/marks admin pages.
- `src/api.ts` — API types, session/CSRF handling, and endpoint clients.
- `src/styles.css` — responsive application styling.
- `src/App.test.tsx` — UI and admin navigation tests.

The workspace overview is in the [root README](../README.md).
