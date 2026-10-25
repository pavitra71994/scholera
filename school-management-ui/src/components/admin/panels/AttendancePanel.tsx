import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getAttendance, saveAttendance } from "../../../services/api";
import type { AttendanceStatus, StudentAttendance } from "../../../types/api";
import { attendanceOptions } from "../../../constants/attendance";
import { useAdminSections } from "../../../hooks/useAdminSections";
import { localDate } from "../../../utils/attendance";
import { SectionSelect } from "./SectionSelect";

export function AttendanceManagement() {
  const { sections, error: sectionError, loading: sectionsLoading } = useAdminSections();
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
