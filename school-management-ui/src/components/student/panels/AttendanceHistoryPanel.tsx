import { useEffect, useState } from "react";
import { getStudentAttendanceHistory } from "../../../services/api";
import type { StudentAttendanceHistory } from "../../../types/api";

export function StudentAttendancePanel() {

  const [attendance, setAttendance] = useState<StudentAttendanceHistory | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getStudentAttendanceHistory()
      .then(setAttendance)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load attendance history."));
  }, []);

  return (
    <section className="student-panel">
      <div className="section-heading">
        <div><p className="eyebrow">Your school days</p><h3>Attendance Summary</h3></div>
      </div>
      <p className="muted">Your percentage is based only on days with a recorded attendance entry.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {attendance ? (
        <>
          <div className="attendance-summary" aria-label="Attendance summary">
            <div><strong>{attendance.attendancePercentage}%</strong><span>Attendance</span></div>
            <div><strong>{attendance.presentCount}</strong><span>Present</span></div>
            <div><strong>{attendance.absentCount}</strong><span>Absent</span></div>
            <div><strong>{attendance.lateCount}</strong><span>Late</span></div>
          </div>
          {attendance.history.length ? (
            <div className="student-table-wrap">
              <table className="student-table">
                <thead><tr><th>Date</th><th>Status</th></tr></thead>
                <tbody>{attendance.history.map((entry) => (
                  <tr key={`${entry.date}-${entry.status}`}><td>{entry.date}</td><td>{entry.status[0] + entry.status.slice(1).toLowerCase()}</td></tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="student-empty">No attendance has been recorded yet.</p>}
        </>
      ) : !error ? <p className="muted">Loading your attendance…</p> : null}
    </section>
  );

}
