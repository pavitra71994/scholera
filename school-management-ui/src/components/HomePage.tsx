import { useEffect, useState } from "react";
import { AttendanceManagement } from "./admin/panels/AttendancePanel";
import { ClassesPanel } from "./admin/panels/ClassesPanel";
import { ExamsManagement } from "./admin/panels/ExamsPanel";
import { PeopleManagement } from "./admin/panels/PeoplePanel";
import { SchoolProfilePanel } from "./admin/panels/SchoolProfilePanel";
import {
  StudentAttendancePanel,
} from "./student/panels/AttendanceHistoryPanel";
import { StudentExamHistoryPanel } from "./student/panels/ExamHistoryPanel";
import { StudentProfilePanel } from "./student/panels/ProfilePanel";
import { StudentToppersPanel } from "./student/panels/ToppersPanel";
import { TeacherAttendancePage } from "./teacher/panels/AttendancePanel";
import { TeacherClassesPage } from "./teacher/panels/ClassesPanel";
import { TeacherExamsPage } from "./teacher/panels/ExamsPanel";
import { TeacherProfilePage } from "./teacher/panels/ProfilePanel";
import { TeacherProgressPage } from "./teacher/panels/ProgressPanel";
import { roleLabels } from "../constants/roleLabels";
import { getHealth, getTeacherProfile } from "../services/api";
import { adminPages, studentPages, teacherPages } from "../routes/dashboardRoutes";
import type { AdminPage, StudentPage, TeacherPage } from "../routes/dashboardRoutes";
import type { SessionUser } from "../types/api";
import { readRoutePage } from "../routes/readRoutePage";

export function HomePage({ user, onLogout }: { user: SessionUser; onLogout: () => Promise<void> }) {
  const [health, setHealth] = useState<boolean | null>(null);
  const [logoutError, setLogoutError] = useState("");
  const [adminPage, setAdminPage] = useState<AdminPage>(() => readRoutePage("#/admin", adminPages, "home"));
  const [studentPage, setStudentPage] = useState<StudentPage>(() => readRoutePage("#/student", studentPages, "home"));
  const [teacherPage, setTeacherPage] = useState<TeacherPage>(() => readRoutePage("#/teacher", teacherPages, "home"));
  const [teacherName, setTeacherName] = useState("");

  useEffect(() => {
    getHealth().then(setHealth);
  }, []);

  useEffect(() => {
    if (user.role !== "ADMIN") return;
    const updateRoute = () => setAdminPage(readRoutePage("#/admin", adminPages, "home"));
    window.addEventListener("hashchange", updateRoute);
    updateRoute();
    return () => window.removeEventListener("hashchange", updateRoute);
  }, [user.role]);

  useEffect(() => {
    if (user.role !== "STUDENT") return;
    const updateRoute = () => setStudentPage(readRoutePage("#/student", studentPages, "home"));
    window.addEventListener("hashchange", updateRoute);
    updateRoute();
    return () => window.removeEventListener("hashchange", updateRoute);
  }, [user.role]);

  useEffect(() => {
    if (user.role !== "TEACHER") return;
    const updateRoute = () => setTeacherPage(readRoutePage("#/teacher", teacherPages, "home"));
    window.addEventListener("hashchange", updateRoute);
    updateRoute();
    getTeacherProfile().then((profile) => setTeacherName(profile.displayName)).catch(() => setTeacherName(""));
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
        <a className="brand" href={user.role === "ADMIN" ? "#/admin" : user.role === "STUDENT" ? "#/student" : "#/teacher"} aria-label="Scholora home"><span className="brand-mark">S</span> Scholora</a>
        <div className="topbar-actions">
          {user.role === "ADMIN" && adminPage !== "home" && <a className="text-button dashboard-link" href="#/admin">← School management</a>}
          {user.role === "STUDENT" && studentPage !== "home" && <a className="text-button dashboard-link" href="#/student">← Your school life</a>}
          {user.role === "TEACHER" && teacherPage !== "home" && <a className="text-button dashboard-link" href="#/teacher">← Teaching workspace</a>}
          <span className="role-chip">{roleLabels[user.role]}</span>
          <button className="text-button" onClick={signOut} type="button">Sign out <span aria-hidden="true">↗</span></button>
        </div>
      </header>
      <div className="workspace-content">
        {user.role !== "ADMIN" && <section className="welcome-row">
          <div>
            <p className="eyebrow">{roleLabels[user.role]} workspace</p>
            <h1>Good day, {user.role === "TEACHER" && teacherName ? teacherName : user.username}.</h1>
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
        {user.role === "ADMIN" && adminPage === "school-profile" && <SchoolProfilePanel />}
        {user.role === "ADMIN" && adminPage === "classes-sections" && <ClassesPanel />}
        {user.role === "ADMIN" && adminPage === "students-teachers" && <PeopleManagement />}
        {user.role === "ADMIN" && adminPage === "attendance" && <AttendanceManagement />}
        {user.role === "ADMIN" && adminPage === "exams-marks" && <ExamsManagement />}
        {user.role === "STUDENT" && studentPage === "profile" && <StudentProfilePanel />}
        {user.role === "STUDENT" && studentPage === "exam-history" && <StudentExamHistoryPanel />}
        {user.role === "STUDENT" && studentPage === "attendance-history" && <StudentAttendancePanel />}
        {user.role === "STUDENT" && studentPage === "toppers" && <StudentToppersPanel />}
        {user.role === "TEACHER" && teacherPage === "classes-roster" && <TeacherClassesPage />}
        {user.role === "TEACHER" && teacherPage === "attendance" && <TeacherAttendancePage />}
        {user.role === "TEACHER" && teacherPage === "exams-marks" && <TeacherExamsPage />}
        {user.role === "TEACHER" && teacherPage === "class-progress" && <TeacherProgressPage />}
        {user.role === "TEACHER" && teacherPage === "profile" && <TeacherProfilePage />}
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
        {user.role === "TEACHER" && teacherPage === "home" && <section className="feature-section">
          <div className="section-heading">
            <div><p className="eyebrow">Your workspace</p><h3>Teaching workspace</h3></div>
            <span className="muted small-text">Teacher portal</span>
          </div>
          <div className="feature-grid">
            {teacherPages.map((item, index) => (
              <a className="feature-card feature-active feature-card-link" href={`#/teacher/${item.page}`} key={item.page}>
                <span className="feature-number">{String(index + 1).padStart(2, "0")}</span>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
                <span className="feature-link">Open {item.title.toLowerCase()} ↗</span>
              </a>
            ))}
          </div>
        </section>}
        {user.role === "STUDENT" && studentPage === "home" && <section className="feature-section">
          <div className="section-heading">
            <div><p className="eyebrow">Your workspace</p><h3>Your school life</h3></div>
            <span className="muted small-text">Student portal</span>
          </div>
          <div className="feature-grid student-feature-grid">
            {studentPages.map((item, index) => (
              <a className="feature-card feature-active feature-card-link" href={`#/student/${item.page}`} key={item.page}>
                <span className="feature-number">{String(index + 1).padStart(2, "0")}</span>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
                <span className="feature-link">Open {item.title.toLowerCase()} ↗</span>
              </a>
            ))}
          </div>
        </section>}
        <footer className="workspace-footer">Scholora <span>·</span> Single-school MVP</footer>
      </div>
    </main>
  );
}
