# School Management API

Spring Boot REST API for a single-school management system. It provides session-based authentication, role-aware access, school and academic administration endpoints, and Liquibase-managed database schema.

## Requirements

- Java 21 or newer.
- Maven 3.9+ (or use the included `./mvnw` wrapper).
- PostgreSQL only if using the persistent PostgreSQL profile; local H2 requires no separate database service.

## Run locally with H2

The default profile uses an in-memory H2 database in PostgreSQL compatibility mode. Configure a bootstrap administrator before starting the app:

```sh
export APP_BOOTSTRAP_ADMIN_USERNAME=admin
export APP_BOOTSTRAP_ADMIN_PASSWORD='admin'
./mvnw spring-boot:run
```

The app listens on port `8080` by default. Configure `SERVER_PORT` to use a different port. Spring Boot DevTools restarts the API when the running classpath changes. In VS Code, enable Java project auto-build so saved Java changes are compiled and trigger a restart. DevTools is development-only and is not included as a transitive dependency for consumers. The bootstrap operation inserts the admin only if the username does not already exist; it does not reset an existing account's password. H2 is in-memory, so its application data is lost when the API process stops.

The sample bootstrap password `admin` is for local development only. Choose a strong secret for any shared or production environment. Account passwords must be non-empty but can be any length; new passwords are pre-hashed before BCrypt so they are not limited by BCrypt's input length. Existing BCrypt password hashes continue to work.

### Optional demo school data

To seed a fresh database with one bootstrap admin, Classes 1–5, sections A/B/C, 10 students per section, 10 days of randomized attendance, five exams, five subjects per section, and randomized marks, enable the demo seeder before the first API start:

```sh
export APP_BOOTSTRAP_ADMIN_USERNAME=admin
export APP_BOOTSTRAP_ADMIN_PASSWORD='admin'
export APP_DEMO_DATA_ENABLED=true
read -s "APP_DEMO_STUDENT_PASSWORD?Shared demo student password: "
export APP_DEMO_STUDENT_PASSWORD
./mvnw spring-boot:run
```

For PostgreSQL instead of the default in-memory H2 database, start with `./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres` after setting `DATABASE_PASSWORD`.

Student usernames follow `demo-class-<class>-<section>-student-<roll>` (for example, `demo-class-1-a-student-01`). The configured student password is shared across the seeded student accounts and is never stored in the changelog. Demo seeding is disabled by default, only runs when no classes exist, and is safe to rerun after a successful seed. Use it only with a fresh local/test database, not production.

## Run with PostgreSQL

The PostgreSQL profile connects to `localhost:5434`, database `school_management`, as user `postgres` by default. Set the database password in your shell without saving it in the repository, then start the API with the `postgres` profile:

```sh
read -s "DATABASE_PASSWORD?PostgreSQL password: "
export DATABASE_PASSWORD

export APP_BOOTSTRAP_ADMIN_USERNAME=admin
export APP_BOOTSTRAP_ADMIN_PASSWORD='admin'
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres
```

The API restarts on saved Java changes when IDE auto-build is enabled. This uses an existing PostgreSQL server; it does not start the included Docker Compose database. The Compose service is a separate development option on port `5432`. Override `DATABASE_URL`, `DATABASE_USER`, or `DATABASE_PASSWORD` when your database name or connection settings differ. Never commit local secrets or use development passwords in production.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `SERVER_PORT` | `8080` | HTTP port |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed credentialed CORS origin |
| `APP_BOOTSTRAP_ADMIN_USERNAME` | empty | Optional initial administrator username |
| `APP_BOOTSTRAP_ADMIN_PASSWORD` | empty | Optional initial administrator password; must be non-empty |
| `APP_DEMO_DATA_ENABLED` | `false` | Seed sample classes, students, attendance, exams, and marks on a fresh database |
| `APP_DEMO_STUDENT_PASSWORD` | empty | Shared password required for sample student accounts when demo seeding is enabled |
| `DATABASE_URL` | `jdbc:postgresql://localhost:5434/school_management` | PostgreSQL JDBC URL in the `postgres` profile |
| `DATABASE_USER` | `postgres` | PostgreSQL username in the `postgres` profile |
| `DATABASE_PASSWORD` | required | PostgreSQL password in the `postgres` profile and compose |

Both bootstrap admin variables must be set together or both left empty. The UI origin must match `FRONTEND_ORIGIN` when the UI is hosted somewhere other than the default.

## API reference

All routes use the `/api/v1` base path. Except for health and CSRF-token retrieval, endpoints require an authenticated session. Access is role-specific: school configuration, account management, and school-wide exam definitions are admin-only; teachers can access assigned-section attendance, subject setup, and marks. JSON examples below show request/response shapes; IDs are generated by the API.

### Health and authentication

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Returns API status, for example `{"status":"UP"}` |
| `GET` | `/auth/csrf` | Public | Returns `token` and `headerName` for subsequent writes |
| `POST` | `/auth/login` | Public + CSRF | Authenticates and creates a session |
| `GET` | `/auth/me` | Authenticated | Returns the signed-in `username` and `role` |
| `POST` | `/auth/logout` | Authenticated + CSRF | Invalidates the current session; returns `204` |

Login request:

```json
{"username":"admin","password":"your-local-password"}
```

Successful login response:

```json
{"username":"admin","role":"ADMIN"}
```

The UI keeps the session cookie by sending credentialed requests. For manual API use, retain the cookie returned at login. For state-changing requests, first call `/auth/csrf` and send the returned token in the header named by `headerName`. The API does not provide public registration.

### School profile

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/school` | Authenticated | Read school name and timezone |
| `PATCH` | `/school` | Admin | Update school name and IANA timezone |

```json
{"name":"North School","timezone":"Asia/Kolkata"}
```

### Classes and sections

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/classes` | Authenticated | List classes and nested sections |
| `POST` | `/classes` | Admin | Create a class |
| `POST` | `/classes/{classId}/sections` | Admin | Add a section to a class |
| `DELETE` | `/classes/{classId}/sections/{sectionId}` | Admin | Remove a section; returns `204` |

Create requests:

```json
{"name":"Grade 1"}
```

```json
{"name":"Section A"}
```

Class names are unique without regard to case. Section names are unique within their class, without regard to case. The list response contains class `id`, `name`, and a `sections` array with section `id` and `name`.

### Students and teachers

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/people?role=STUDENT` | Admin | List students |
| `GET` | `/people?role=TEACHER` | Admin | List teachers |
| `POST` | `/people` | Admin | Create a student or teacher account |

Student request:

```json
{
  "fullName":"Jordan Lee",
  "username":"jordan.lee",
  "password":"initial-password-at-least-12",
  "role":"STUDENT",
  "sectionId":1
}
```

Teacher request:

```json
{
  "fullName":"Taylor Morgan",
  "username":"taylor.morgan",
  "password":"initial-password-at-least-12",
  "role":"TEACHER",
  "sectionId":null
}
```

Passwords can be any non-empty length. Usernames must be unique, and only `STUDENT` and `TEACHER` roles can be created through this endpoint. A student must be assigned to an existing section; a teacher has no student section assignment. The response includes the person's ID, full name, username, role, and (for students) section and class details.

### Attendance

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/attendance?sectionId={id}&date=YYYY-MM-DD` | Admin | List students for the section with any saved status for the date |
| `POST` | `/attendance` | Admin | Save or update the complete section register for a date |

```json
{
  "sectionId":1,
  "date":"2026-10-25",
  "records":[
    {"studentId":4,"status":"PRESENT"},
    {"studentId":5,"status":"LATE"},
    {"studentId":6,"status":"ABSENT"}
  ]
}
```

Each student can have one status per date: `PRESENT`, `ABSENT`, or `LATE`. Submit one record for every student currently assigned to the selected section, without duplicates. GET returns students even when there is no saved record yet; their `status` is `null` until attendance is recorded.

### Exams and marks

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/exams/definitions` | Admin/teacher | List the school-wide exam schedule |
| `POST` | `/exams/definitions` | Admin | Add a common exam name and academic year; automatically provision it for every section |
| `GET` | `/exams?sectionId={id}` | Admin/assigned teacher | List yearly exams, subjects, maximum marks, and saved scores for a section |
| `POST` | `/exams` | Admin/assigned teacher | Ensure a common exam exists for a section (idempotent compatibility endpoint) |
| `GET` | `/exams/sections/{sectionId}/subjects` | Admin/assigned teacher | List the shared subject catalog for a section |
| `POST` | `/exams/sections/{sectionId}/subjects` | Admin/assigned teacher | Add a section subject to every exam in that section |
| `POST` | `/exams/{examId}/subjects` | Admin/assigned teacher | Compatibility endpoint that adds a subject to every exam in the section |
| `POST` | `/exams/subjects/{subjectId}/marks` | Admin/assigned teacher | Save or update marks for all students in that subject's section |

Add a school-wide exam:

```json
{"name":"Term 1","academicYear":2026}
```

Creating a definition automatically provisions an exam record for each existing section. New sections also receive all existing definitions. Section subjects are shared across every exam in the section; their default maximum marks are used when creating exam-subject entries. Each exam retains its own maximum marks once provisioned.

Add subjects separately, each with its own maximum:

```json
{"subject":"Mathematics","maximumMarks":100}
```

Save marks:

```json
{
  "marks":[
    {"studentId":4,"obtainedMarks":92.5},
    {"studentId":5,"obtainedMarks":81}
  ]
}
```

School-wide exam names are unique per year and are automatically provisioned to every section. Subject names are unique within a section and are shared across all exams there. Their default maximum marks initialize each exam's subject entry; marks use decimal numbers with up to two places, and scores may not exceed the exam-specific maximum. Submit one score for every student in the exam's section. Existing exam and mark records are migrated into school-wide definitions for their current calendar year.

### Error responses

Validation and request errors are returned as JSON with a `message` field. Typical status codes include `400` for invalid input, `401` for unauthenticated requests, `403` for a role without access, `404` for a missing resource, and `409` for duplicate names or usernames where detected.

## Database and migrations

Liquibase applies the changesets in `src/main/resources/db/changelog/db.changelog-master.xml` at startup and tracks them in its `DATABASECHANGELOG` tables. Hibernate validates the schema; it does not generate tables. Add schema changes as new Liquibase changesets. The current baseline creates users, school profile, classes and sections, people, attendance, school-wide exams, section subjects, and marks.

This Liquibase baseline is intended for a fresh database. It replaces the former Flyway migration history; existing databases containing Flyway-managed data must be backed up and recreated/migrated separately before switching to this baseline. Liquibase records each changeset after successful execution, so application restarts do not replay already-applied schema changes.

## Tests

```sh
./mvnw test
```

The integration test suite uses an isolated in-memory H2 database and MockMvc to exercise authentication, role restrictions, school settings, class/section management, accounts, attendance, and exam marks.

The workspace overview and UI setup are in the [root README](../README.md) and [UI README](../school-management-ui/README.md).
