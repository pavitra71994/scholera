import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { getAttendance, getAttendanceHistory, saveAttendance } from "../../../services/api";
import type { AttendanceStatus } from "../../../types/api";
import { attendanceOptions } from "../../../constants/attendance";
import { useTeacherSections } from "../../../hooks/useTeacherSections";
import { localDate } from "../../../utils/attendance";
import { SectionEmptyState, SectionPicker } from "./SectionPicker";
import { DropdownSelect } from "../../shared/DropdownSelect";

export function TeacherAttendancePage() {
  const { sections, loading: sectionsLoading, error: sectionsError } = useTeacherSections();
  const attendanceSections = useMemo(
    () => sections.filter((section) => section.fullSectionAccess),
    [sections],
  );
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [date, setDate] = useState(localDate);
  const [students, setStudents] = useState<Array<{ studentId: number; fullName: string; status: AttendanceStatus | null }> | null>(null);
  const [history, setHistory] = useState<Array<{ date: string; studentId: number; fullName: string; status: AttendanceStatus }> | null>(null);
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus | "">>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!attendanceSections.length) {
      setSectionId(null);
      return;
    }
    setSectionId((selected) => selected && attendanceSections.some((section) => section.id === selected)
      ? selected
      : attendanceSections[0].id);
  }, [attendanceSections]);

  useEffect(() => {
    if (sectionId == null) {
      setStudents(null);
      setHistory(null);
      return;
    }
    setStudents(null);
    setHistory(null);
    setError("");
    Promise.all([getAttendance(sectionId, date), getAttendanceHistory(sectionId)])
      .then(([register, records]) => {
        setStudents(register);
        setStatuses(Object.fromEntries(register.map((student) => [
          student.studentId,
          student.status ?? "",
        ])));
        setHistory(records);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load attendance."));
  }, [sectionId, date]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sectionId == null || !students?.length) return;
    if (students.some((student) => !statuses[student.studentId])) {
      setError("Choose an attendance status for every student.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await saveAttendance(sectionId, date, students.map((student) => ({
        studentId: student.studentId,
        status: statuses[student.studentId] as AttendanceStatus,
      })));
      setStudents(updated);
      setHistory(await getAttendanceHistory(sectionId));
      setMessage("Attendance saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save attendance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="teacher-panel">
      <div className="section-heading"><div><p className="eyebrow">Daily register</p><h3>Take Attendance</h3></div></div>
      <p className="muted">Record and update attendance for every student in an assigned section.</p>
      {(!sections.length || attendanceSections.length > 0)
        && <SectionEmptyState error={sectionsError} loading={sectionsLoading} sections={attendanceSections} />}
      {!sectionsLoading && !sectionsError && sections.length > 0 && !attendanceSections.length && (
        <p className="class-empty">Attendance is available only to class teachers and teachers assigned to the full section.</p>
      )}
      {!sectionsLoading && !sectionsError && attendanceSections.length > 0 && (
        <>
          <div className="teacher-toolbar">
            <SectionPicker onChange={setSectionId} sections={attendanceSections} selected={sectionId} />
            <label className="module-field">Date
              <input onChange={(event) => setDate(event.target.value)} required type="date" value={date} />
            </label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="success-message" role="status">{message}</p>}
          {!students && !error ? <p className="muted">Loading attendance register…</p> : students?.length ? (
            <form onSubmit={submit}>
              <div className="module-table-wrap">
                <table className="module-table">
                  <thead><tr><th>Student</th><th>Status</th></tr></thead>
                  <tbody>{students.map((student) => (
                    <tr key={student.studentId}>
                      <td>{student.fullName}</td>
                      <td>
                        <DropdownSelect
                          hideLabel
                          label={`Attendance for ${student.fullName}`}
                          onChange={(value) => setStatuses((current) => ({
                            ...current,
                            [student.studentId]: value as AttendanceStatus | "",
                          }))}
                          options={[
                            { value: "", label: "Choose status" },
                            ...attendanceOptions.map((option) => ({ value: option.value, label: option.label })),
                          ]}
                          value={statuses[student.studentId] ?? ""}
                          wrapperClassName="table-dropdown"
                        />
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <button className="secondary-button module-submit" disabled={saving} type="submit">{saving ? "Saving…" : "Save attendance"}</button>
            </form>
          ) : students ? <p className="class-empty">No students are enrolled in this section yet.</p> : null}
          <section className="teacher-history">
            <h4>Recent attendance history</h4>
            {history?.length ? (
              <div className="module-table-wrap">
                <table className="module-table">
                  <thead><tr><th>Date</th><th>Student</th><th>Status</th></tr></thead>
                  <tbody>{history.map((record, index) => (
                    <tr key={`${record.date}-${record.studentId}-${index}`}>
                      <td>{record.date}</td><td>{record.fullName}</td><td>{record.status[0] + record.status.slice(1).toLowerCase()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : history ? <p className="class-empty">No attendance has been recorded for this section.</p> : null}
          </section>
        </>
      )}
    </section>
  );
}
