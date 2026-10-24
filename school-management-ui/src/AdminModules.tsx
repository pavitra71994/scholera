import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  createExam,
  createPerson,
  getAttendance,
  getClasses,
  getExams,
  getPeople,
  saveAttendance,
  saveExamMarks,
} from "./api";
import type {
  AttendanceStatus,
  SchoolClass,
  SchoolExam,
  SchoolPerson,
  SchoolSection,
  StudentAttendance,
} from "./api";

function useSections() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClasses()
      .then(setClasses)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load classes and sections."))
      .finally(() => setLoading(false));
  }, []);

  const sections = useMemo(
    () => classes.flatMap((schoolClass) => schoolClass.sections.map((section) => ({
      ...section,
      className: schoolClass.name,
    }))),
    [classes],
  );
  return { sections, error, loading };
}

function SectionSelect({
  sections,
  value,
  onChange,
  label = "Section",
}: {
  sections: Array<SchoolSection & { className?: string }>;
  value: number | null;
  onChange: (id: number | null) => void;
  label?: string;
}) {
  return (
    <label className="module-field">
      {label}
      <select value={value ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}>
        <option value="">Choose a section</option>
        {sections.map((section) => (
          <option key={section.id} value={section.id}>
            {section.className ? `${section.className} · ` : ""}{section.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PeopleManagement() {
  const { sections, error: sectionError, loading: sectionsLoading } = useSections();
  const [people, setPeople] = useState<SchoolPerson[]>([]);
  const [role, setRole] = useState<"TEACHER" | "STUDENT">("STUDENT");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function refreshPeople() {
    const [students, teachers] = await Promise.all([getPeople("STUDENT"), getPeople("TEACHER")]);
    setPeople([...students, ...teachers].sort((a, b) => a.fullName.localeCompare(b.fullName)));
  }

  useEffect(() => {
    refreshPeople()
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load students and teachers."))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await createPerson({
        fullName: fullName.trim(),
        username: username.trim(),
        password,
        role,
        sectionId: role === "STUDENT" ? sectionId : null,
      });
      await refreshPeople();
      setFullName("");
      setUsername("");
      setPassword("");
      setSectionId(null);
      setMessage(`${role === "STUDENT" ? "Student" : "Teacher"} account created.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="module-card">
      <div className="section-heading">
        <div><p className="eyebrow">School directory</p><h3>Students &amp; teachers</h3></div>
        <span className="status-pill">{people.length} {people.length === 1 ? "account" : "accounts"}</span>
      </div>
      <p className="muted">Create sign-in accounts for your school community. Students are assigned to a class section.</p>
      <form className="module-form people-form" onSubmit={submit}>
        <label className="module-field">Full name
          <input maxLength={160} onChange={(event) => setFullName(event.target.value)} required value={fullName} />
        </label>
        <label className="module-field">Account type
          <select value={role} onChange={(event) => setRole(event.target.value as "TEACHER" | "STUDENT")}>
            <option value="STUDENT">Student</option>
            <option value="TEACHER">Teacher</option>
          </select>
        </label>
        <label className="module-field">Username
          <input autoComplete="off" maxLength={100} onChange={(event) => setUsername(event.target.value)} required value={username} />
        </label>
        <label className="module-field">Initial password
          <input autoComplete="new-password" minLength={12} maxLength={100} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
        </label>
        {role === "STUDENT" && (
          <SectionSelect sections={sections} value={sectionId} onChange={setSectionId} />
        )}
        <button className="secondary-button" disabled={saving || (role === "STUDENT" && sections.length === 0)} type="submit">
          {saving ? "Creating…" : "Create account"}
        </button>
      </form>
      {sectionError && <p className="form-error" role="alert">{sectionError}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      {sectionsLoading || loading ? <p className="muted">Loading directory…</p> : people.length ? (
        <div className="module-table-wrap">
          <table className="module-table">
            <thead><tr><th>Name</th><th>Type</th><th>Username</th><th>Class / section</th></tr></thead>
            <tbody>{people.map((person) => (
              <tr key={person.id}>
                <td>{person.fullName}</td>
                <td>{person.role === "STUDENT" ? "Student" : "Teacher"}</td>
                <td>{person.username}</td>
                <td>{person.role === "STUDENT" ? `${person.className ?? ""} ${person.sectionName ?? "Unassigned"}` : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="class-empty">No student or teacher accounts yet.</p>}
    </section>
  );
}

function localDate() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

const attendanceOptions: Array<{ value: AttendanceStatus; label: string }> = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "Late" },
];

export function AttendanceManagement() {
  const { sections, error: sectionError, loading: sectionsLoading } = useSections();
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [date, setDate] = useState(localDate);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus | "">>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sectionId) {
      setStudents([]);
      return;
    }
    setLoading(true);
    setError("");
    getAttendance(sectionId, date)
      .then((rows) => {
        setStudents(rows);
        setStatuses(Object.fromEntries(rows.map((row) => [row.studentId, row.status ?? ""])));
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load attendance."))
      .finally(() => setLoading(false));
  }, [sectionId, date]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sectionId || students.some((student) => !statuses[student.studentId])) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const rows = await saveAttendance(sectionId, date, students.map((student) => ({
        studentId: student.studentId,
        status: statuses[student.studentId] as AttendanceStatus,
      })));
      setStudents(rows);
      setMessage("Attendance saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save attendance.");
    } finally {
      setSaving(false);
    }
  }

  function markAllPresent() {
    setStatuses(Object.fromEntries(students.map((student) => [student.studentId, "PRESENT"])));
  }

  return (
    <section className="module-card">
      <div className="section-heading">
        <div><p className="eyebrow">Daily register</p><h3>Attendance</h3></div>
        <span className="status-pill">{students.length} students</span>
      </div>
      <p className="muted">Choose a section and date, then record each student as present, absent, or late.</p>
      <div className="module-toolbar">
        <SectionSelect sections={sections} value={sectionId} onChange={setSectionId} />
        <label className="module-field">Date
          <input type="date" onChange={(event) => setDate(event.target.value)} required value={date} />
        </label>
        {students.length > 0 && <button className="quiet-button" onClick={markAllPresent} type="button">Mark all present</button>}
      </div>
      {sectionError && <p className="form-error" role="alert">{sectionError}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      {sectionsLoading ? <p className="muted">Loading sections…</p> : !sections.length ? (
        <p className="class-empty">Create a class and section before taking attendance.</p>
      ) : !sectionId ? <p className="class-empty">Choose a section to view its student register.</p> : loading ? (
        <p className="muted">Loading register…</p>
      ) : !students.length ? <p className="class-empty">No students are assigned to this section yet.</p> : (
        <form onSubmit={submit}>
          <div className="module-table-wrap">
            <table className="module-table">
              <thead><tr><th>Student</th><th>Attendance status</th></tr></thead>
              <tbody>{students.map((student) => (
                <tr key={student.studentId}>
                  <td>{student.fullName}</td>
                  <td>
                    <select
                      aria-label={`Attendance for ${student.fullName}`}
                      required
                      value={statuses[student.studentId] ?? ""}
                      onChange={(event) => setStatuses((current) => ({
                        ...current,
                        [student.studentId]: event.target.value as AttendanceStatus | "",
                      }))}
                    >
                      <option value="">Choose status</option>
                      {attendanceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <button className="secondary-button module-submit" disabled={saving} type="submit">{saving ? "Saving…" : "Save attendance"}</button>
        </form>
      )}
    </section>
  );
}

export function ExamsManagement() {
  const { sections, error: sectionError, loading: sectionsLoading } = useSections();
  const [people, setPeople] = useState<SchoolPerson[]>([]);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [exams, setExams] = useState<SchoolExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [maximumMarks, setMaximumMarks] = useState("100");
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getPeople("STUDENT").then(setPeople).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Could not load students.");
    });
  }, []);

  useEffect(() => {
    if (!sectionId) {
      setExams([]);
      setSelectedExamId(null);
      return;
    }
    setLoading(true);
    setError("");
    getExams(sectionId)
      .then((items) => {
        setExams(items);
        setSelectedExamId(items[0]?.id ?? null);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load exams."))
      .finally(() => setLoading(false));
  }, [sectionId]);

  const students = people.filter((person) => person.role === "STUDENT" && person.sectionId === sectionId);
  const selectedExam = exams.find((exam) => exam.id === selectedExamId) ?? null;

  useEffect(() => {
    if (!selectedExam) {
      setMarks({});
      return;
    }
    setMarks(Object.fromEntries(students.map((student) => {
      const saved = selectedExam.marks.find((mark) => mark.studentId === student.id);
      return [student.id, saved ? String(saved.obtainedMarks) : ""];
    })));
  }, [selectedExamId, students.length, exams]);

  async function refreshExams(selectId?: number) {
    if (!sectionId) return;
    const items = await getExams(sectionId);
    setExams(items);
    setSelectedExamId(selectId ?? items[0]?.id ?? null);
  }

  async function addExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sectionId) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const created = await createExam({
        sectionId,
        name: name.trim(),
        subject: subject.trim(),
        maximumMarks: Number(maximumMarks),
      });
      await refreshExams(created.id);
      setName("");
      setSubject("");
      setMaximumMarks("100");
      setMessage("Exam added.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create exam.");
    } finally {
      setSaving(false);
    }
  }

  async function submitMarks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedExam || students.some((student) => marks[student.id] === "" || marks[student.id] === undefined)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveExamMarks(selectedExam.id, students.map((student) => ({
        studentId: student.id,
        obtainedMarks: Number(marks[student.id]),
      })));
      await refreshExams(selectedExam.id);
      setMessage("Marks saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save marks.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="module-card">
      <div className="section-heading">
        <div><p className="eyebrow">Academic results</p><h3>Exams &amp; marks</h3></div>
        <span className="status-pill">{exams.length} exams</span>
      </div>
      <p className="muted">Create exams by section and subject, then record each student’s numeric score.</p>
      <SectionSelect sections={sections} value={sectionId} onChange={setSectionId} />
      {sectionError && <p className="form-error" role="alert">{sectionError}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      {sectionsLoading ? <p className="muted">Loading sections…</p> : !sections.length ? (
        <p className="class-empty">Create a class and section before setting up exams.</p>
      ) : !sectionId ? <p className="class-empty">Choose a section to manage its exams.</p> : (
        <>
          <form className="module-form exam-create-form" onSubmit={addExam}>
            <label className="module-field">Exam name
              <input maxLength={100} onChange={(event) => setName(event.target.value)} placeholder="e.g. Term 1" required value={name} />
            </label>
            <label className="module-field">Subject
              <input maxLength={100} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Mathematics" required value={subject} />
            </label>
            <label className="module-field">Maximum marks
              <input min="0.01" onChange={(event) => setMaximumMarks(event.target.value)} required step="0.01" type="number" value={maximumMarks} />
            </label>
            <button className="secondary-button" disabled={saving} type="submit">{saving ? "Saving…" : "Add exam"}</button>
          </form>
          {loading ? <p className="muted">Loading exams…</p> : !exams.length ? (
            <p className="class-empty">No exams have been created for this section.</p>
          ) : (
            <>
              <label className="module-field exam-select">Exam and subject
                <select value={selectedExamId ?? ""} onChange={(event) => setSelectedExamId(Number(event.target.value))}>
                  {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name} · {exam.subject}</option>)}
                </select>
              </label>
              {selectedExam && (
                <form onSubmit={submitMarks}>
                  <p className="exam-summary">{selectedExam.subject} · Maximum {selectedExam.maximumMarks} marks</p>
                  {students.length ? (
                    <>
                      <div className="module-table-wrap">
                        <table className="module-table">
                          <thead><tr><th>Student</th><th>Score / {selectedExam.maximumMarks}</th></tr></thead>
                          <tbody>{students.map((student) => (
                            <tr key={student.id}>
                              <td>{student.fullName}</td>
                              <td>
                                <input
                                  aria-label={`Marks for ${student.fullName}`}
                                  max={selectedExam.maximumMarks}
                                  min="0"
                                  onChange={(event) => setMarks((current) => ({ ...current, [student.id]: event.target.value }))}
                                  required
                                  step="0.01"
                                  type="number"
                                  value={marks[student.id] ?? ""}
                                />
                              </td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                      <button className="secondary-button module-submit" disabled={saving} type="submit">{saving ? "Saving…" : "Save marks"}</button>
                    </>
                  ) : <p className="class-empty">Add students to this section before entering marks.</p>}
                </form>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
