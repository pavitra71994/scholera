import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  AttendanceManagement,
  ExamsManagement,
  PeopleManagement,
} from "./AdminModules";
import {
  getHealth,
  getClasses,
  getSchoolProfile,
  getSession,
  login,
  logout,
  createClass,
  createSection,
  deleteSection,
  updateSchoolProfile,
} from "./api";
import type { Role, SchoolClass, SchoolProfile, SessionUser } from "./api";

const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  TEACHER: "Teacher",
  STUDENT: "Student",
};

const roleFeatures: Record<Role, string[]> = {
  ADMIN: ["School profile", "Classes & sections", "Students & teachers", "Attendance", "Exams & marks"],
  TEACHER: ["My attendance", "Attendance history"],
  STUDENT: ["My profile", "Exam & marks history", "Attendance history", "School toppers"],
};

type AdminPage = "home" | "school-profile" | "classes-sections" | "students-teachers" | "attendance" | "exams-marks";

const adminPages: Array<{ title: string; page: Exclude<AdminPage, "home">; description: string }> = [
  { title: "School profile", page: "school-profile", description: "Update school details and timezone." },
  { title: "Classes & sections", page: "classes-sections", description: "Organize classes and their sections." },
  { title: "Students & teachers", page: "students-teachers", description: "Manage school people and their accounts." },
  { title: "Attendance", page: "attendance", description: "Record daily attendance by section." },
  { title: "Exams & marks", page: "exams-marks", description: "Set up exams and record student marks." },
];

function readAdminPage(): AdminPage {
  const route = window.location.hash.replace("#/admin", "").replace(/^\/+/, "");
  return adminPages.some((item) => item.page === route) ? route as AdminPage : "home";
}

export function LoginForm({ onLogin }: { onLogin: (username: string, password: string) => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onLogin(username, password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label>
        Username
        <input
          autoComplete="username"
          name="username"
          onChange={(event) => setUsername(event.target.value)}
          required
          value={username}
        />
      </label>
      <label>
        Password
        <input
          autoComplete="current-password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" disabled={busy} type="submit">
        {busy ? "Signing in…" : "Sign in"}
        <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}

function SignIn({ onLogin }: { onLogin: (username: string, password: string) => Promise<void> }) {
  return (
    <main className="signin-page">
      <section className="signin-copy">
        <div className="brand brand-light"><span className="brand-mark">S</span> Scholora</div>
        <div>
          <p className="eyebrow">A calmer school day</p>
          <h1>Everything your school needs, in one place.</h1>
          <p className="intro">A simple space for school teams, teachers, and students to stay in sync.</p>
        </div>
        <div className="signin-footnote">One school. One shared community.</div>
        <div aria-hidden="true" className="sun-orbit"><span /><span /><span /></div>
      </section>
      <section className="signin-panel">
        <div className="mobile-brand brand"><span className="brand-mark">S</span> Scholora</div>
        <div className="signin-card">
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to your account</h2>
          <p className="muted">Use the account provided by your school administrator.</p>
          <LoginForm onLogin={onLogin} />
          <div className="role-note">
            <span className="role-dots" aria-hidden="true"><i /><i /><i /></span>
            One secure sign-in for admins, teachers, and students
          </div>
        </div>
        <p className="panel-footer">Need help? Please contact your school administrator.</p>
      </section>
    </main>
  );
}

function AdminSettings() {
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSchoolProfile()
      .then(setProfile)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load school settings."));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      setProfile(await updateSchoolProfile(profile));
      setMessage("School settings saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save school settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="settings-card" id="school-profile">
      <div className="section-heading">
        <div><p className="eyebrow">Getting started</p><h3>School profile</h3></div>
        <span className="status-pill">Setup</span>
      </div>
      <p className="muted">Set your school's name and local timezone. These settings are used across attendance and academic records.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {profile ? (
        <form className="settings-form" onSubmit={save}>
          <label>School name<input maxLength={160} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required value={profile.name} /></label>
          <label>Timezone<input maxLength={80} onChange={(event) => setProfile({ ...profile, timezone: event.target.value })} required value={profile.timezone} /></label>
          {message && <p className="success-message" role="status">{message}</p>}
          <button className="secondary-button" disabled={saving} type="submit">{saving ? "Saving…" : "Save changes"}</button>
        </form>
      ) : !error ? <p className="muted">Loading school profile…</p> : null}
    </section>
  );
}

export function ClassesManagement() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [className, setClassName] = useState("");
  const [sectionNames, setSectionNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refreshClasses() {
    setClasses(await getClasses());
  }

  useEffect(() => {
    getClasses()
      .then(setClasses)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load classes."))
      .finally(() => setLoading(false));
  }, []);

  async function addClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await createClass(className.trim());
      setClassName("");
      await refreshClasses();
      setMessage("Class added.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add class.");
    } finally {
      setBusy(false);
    }
  }

  async function addSection(event: FormEvent<HTMLFormElement>, schoolClass: SchoolClass) {
    event.preventDefault();
    const name = (sectionNames[schoolClass.id] ?? "").trim();
    if (!name) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await createSection(schoolClass.id, name);
      setSectionNames((current) => ({ ...current, [schoolClass.id]: "" }));
      await refreshClasses();
      setMessage(`Section added to ${schoolClass.name}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add section.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSection(schoolClass: SchoolClass, sectionId: number) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await deleteSection(schoolClass.id, sectionId);
      await refreshClasses();
      setMessage("Section removed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove section.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="classes-card" id="classes-sections">
      <div className="section-heading">
        <div><p className="eyebrow">Academic setup</p><h3>Classes &amp; sections</h3></div>
        <span className="status-pill">Administration</span>
      </div>
      <p className="muted">Create your school’s classes, then organize each one into sections.</p>
      <form className="class-create-form" onSubmit={addClass}>
        <label>
          Class name
          <input
            aria-label="Class name"
            maxLength={100}
            onChange={(event) => setClassName(event.target.value)}
            placeholder="e.g. Grade 1"
            required
            value={className}
          />
        </label>
        <button className="secondary-button" disabled={busy} type="submit">{busy ? "Saving…" : "Add class"}</button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      {loading ? <p className="muted">Loading classes…</p> : error && classes.length === 0 ? null : classes.length ? (
        <div className="class-list">
          {classes.map((schoolClass) => (
            <article className="class-item" key={schoolClass.id}>
              <div className="class-item-header">
                <div>
                  <h4>{schoolClass.name}</h4>
                  <p className="muted">{schoolClass.sections.length} {schoolClass.sections.length === 1 ? "section" : "sections"}</p>
                </div>
                <form className="section-create-form" onSubmit={(event) => addSection(event, schoolClass)}>
                  <label className="visually-hidden" htmlFor={`section-${schoolClass.id}`}>Section name for {schoolClass.name}</label>
                  <input
                    id={`section-${schoolClass.id}`}
                    maxLength={40}
                    onChange={(event) => setSectionNames((current) => ({ ...current, [schoolClass.id]: event.target.value }))}
                    placeholder="Section name"
                    required
                    value={sectionNames[schoolClass.id] ?? ""}
                  />
                  <button className="secondary-button" disabled={busy} type="submit">Add section</button>
                </form>
              </div>
              {schoolClass.sections.length ? (
                <ul className="section-list">
                  {schoolClass.sections.map((section) => (
                    <li className="section-chip" key={section.id}>
                      <span>{section.name}</span>
                      <button
                        aria-label={`Remove section ${section.name} from ${schoolClass.name}`}
                        disabled={busy}
                        onClick={() => removeSection(schoolClass, section.id)}
                        type="button"
                      >×</button>
                    </li>
                  ))}
                </ul>
              ) : <p className="class-empty">No sections yet. Add one to organize this class.</p>}
            </article>
          ))}
        </div>
      ) : (
        <p className="class-empty">No classes yet. Add your first class above.</p>
      )}
    </section>
  );
}

function Workspace({ user, onLogout }: { user: SessionUser; onLogout: () => Promise<void> }) {
  const [health, setHealth] = useState<boolean | null>(null);
  const [logoutError, setLogoutError] = useState("");
  const [adminPage, setAdminPage] = useState<AdminPage>(readAdminPage);

  useEffect(() => {
    getHealth().then(setHealth);
  }, []);

  useEffect(() => {
    if (user.role !== "ADMIN") return;
    const updateRoute = () => setAdminPage(readAdminPage());
    window.addEventListener("hashchange", updateRoute);
    updateRoute();
    return () => window.removeEventListener("hashchange", updateRoute);
  }, [user.role]);

  async function signOut() {
    setLogoutError("");
    try {
      await onLogout();
    } catch (cause) {
      setLogoutError(cause instanceof Error ? cause.message : "Could not sign out.");
    }
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="brand" href={user.role === "ADMIN" ? "#/admin" : "/"} aria-label="Scholora home"><span className="brand-mark">S</span> Scholora</a>
        <div className="topbar-actions">
          {user.role === "ADMIN" && adminPage !== "home" && <a className="text-button dashboard-link" href="#/admin">← School management</a>}
          <span className="role-chip">{roleLabels[user.role]}</span>
          <button className="text-button" onClick={signOut} type="button">Sign out <span aria-hidden="true">↗</span></button>
        </div>
      </header>
      <div className="workspace-content">
        {user.role !== "ADMIN" && <section className="welcome-row">
          <div>
            <p className="eyebrow">{roleLabels[user.role]} workspace</p>
            <h1>Good day, {user.username}.</h1>
            <p className="muted">Your school day, organized.</p>
          </div>
          <div className={`api-status ${health ? "is-online" : "is-offline"}`}><span />{health ? "Connected" : health === false ? "API unavailable" : "Connecting"}</div>
        </section>}
        {user.role === "ADMIN" && adminPage === "home" && <section className="welcome-row">
          <div>
            <p className="eyebrow">Administrator workspace</p>
            <h1>School management</h1>
            <p className="muted">Manage your school setup, people, and academic records.</p>
          </div>
          <div className={`api-status ${health ? "is-online" : "is-offline"}`}><span />{health ? "Connected" : health === false ? "API unavailable" : "Connecting"}</div>
        </section>}
        {logoutError && <p className="form-error" role="alert">{logoutError}</p>}
        {user.role === "ADMIN" && adminPage === "school-profile" && <AdminSettings />}
        {user.role === "ADMIN" && adminPage === "classes-sections" && <ClassesManagement />}
        {user.role === "ADMIN" && adminPage === "students-teachers" && <PeopleManagement />}
        {user.role === "ADMIN" && adminPage === "attendance" && <AttendanceManagement />}
        {user.role === "ADMIN" && adminPage === "exams-marks" && <ExamsManagement />}
        {user.role === "ADMIN" && adminPage === "home" && <section className="feature-section">
          <div className="section-heading">
            <div><p className="eyebrow">Your workspace</p><h3>School management</h3></div>
            <span className="muted small-text">Administrator tools</span>
          </div>
          <div className="feature-grid">
            {adminPages.map((item, index) => {
              return (
                <a className="feature-card feature-active feature-card-link" href={`#/admin/${item.page}`} key={item.page}>
                  <span className="feature-number">{String(index + 1).padStart(2, "0")}</span>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                  <span className="feature-link">Open {item.title.toLowerCase()} ↗</span>
                </a>
              );
            })}
          </div>
        </section>}
        {user.role !== "ADMIN" && <section className="feature-section">
          <div className="section-heading">
            <div><p className="eyebrow">Your workspace</p><h3>{user.role === "TEACHER" ? "Teaching tools" : "Your school life"}</h3></div>
            <span className="muted small-text">MVP setup in progress</span>
          </div>
          <div className="feature-grid">
            {roleFeatures[user.role].map((feature, index) => (
              <article className="feature-card" key={feature}>
                <span className="feature-number">{String(index + 1).padStart(2, "0")}</span>
                <h4>{feature}</h4>
                <p>Planned for the next implementation phase.</p>
                <span className="feature-coming">Coming next</span>
              </article>
            ))}
          </div>
        </section>}
        <footer className="workspace-footer">Scholora <span>·</span> Single-school MVP</footer>
      </div>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    getSession()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false));
  }, []);

  async function signIn(username: string, password: string) {
    setUser(await login(username, password));
    window.location.hash = "#/admin";
  }

  async function signOut() {
    await logout();
    setUser(null);
  }

  if (checkingSession) {
    return <main className="loading-page"><span className="brand-mark">S</span><p>Opening Scholora…</p></main>;
  }
  return user ? <Workspace user={user} onLogout={signOut} /> : <SignIn onLogin={signIn} />;
}
