# Scholora

Scholora is a single-school management MVP with a React web application and a Spring Boot API. Administrators use a School management dashboard to configure the school, organize classes and sections, provision student and teacher accounts, record attendance, and manage exams and marks.

## Repositories

This workspace contains two independent Git repositories:

- [school-management-ui](school-management-ui/README.md) — React, TypeScript, and Vite frontend.
- [school-management-api](school-management-api/README.md) — Spring Boot REST API, persistence, and database migrations.

The UI and API run separately during development. The browser UI calls the API at `http://localhost:8080/api/v1` by default.

## Features

- Session-based sign-in for administrator, teacher, and student roles.
- Admin dashboard with a separate page for each school-management area:
  - School profile and timezone.
  - Classes and sections.
  - Student and teacher accounts.
  - Daily attendance registers by section.
  - School-wide exam setup, section subject catalogs, and separate marks registers.
- Admin-only mutations for school data. Public account registration is disabled.
- Liquibase-managed database schema, with in-memory H2 for local development and PostgreSQL support for persistent data.

## Quick start

Requirements:

- Java 21 or newer and Maven 3.9+ (the API includes a Maven wrapper).
- Node.js 24 or newer and npm.

### 1. Start the API

From `school-management-api`, set a local administrator username and password, then run:

```sh
export APP_BOOTSTRAP_ADMIN_USERNAME=admin
export APP_BOOTSTRAP_ADMIN_PASSWORD='admin'
./mvnw spring-boot:run
```

The default profile uses an in-memory H2 database. It is suitable for development and tests; data does not persist across application restarts.

### 2. Start the UI

In another terminal, from `school-management-ui`:

```sh
npm install
cp .env.example .env
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`) and sign in with the administrator credentials configured for the API.

For PostgreSQL setup, persistent storage, environment variables, and project-specific commands, see the [API README](school-management-api/README.md). For UI configuration and frontend checks, see the [UI README](school-management-ui/README.md).

## Development checks

Run from the corresponding repository:

```sh
# Frontend
npm test
npm run typecheck
npm run build

# Backend
./mvnw test
```

## Current MVP boundaries

- The application is configured for one school.
- The initial admin is provisioned out of band using bootstrap environment variables. The administrator provisions student and teacher accounts from the UI.
- Student and teacher experiences are role-aware, but their dedicated day-to-day workflows are not part of this admin-focused MVP yet.
- Attendance is recorded per student, section, and date as Present, Absent, or Late.
- Exam definitions are school-wide and automatically provisioned to each section; section subjects are shared across that section's exams, with numeric student marks capped by each exam's subject maximum.
