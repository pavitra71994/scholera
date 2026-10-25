import { useEffect, useState } from "react";
import { getStudentExamHistory } from "../../../services/api";
import type { StudentExamHistoryEntry } from "../../../types/api";

export function StudentExamHistoryPanel() {

  const [entries, setEntries] = useState<StudentExamHistoryEntry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getStudentExamHistory()
      .then(setEntries)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load exam history."));
  }, []);

  return (
    <section className="student-panel">
      <div className="section-heading">
        <div><p className="eyebrow">Your progress</p><h3>Exam Results &amp; Progress</h3></div>
      </div>
      <p className="muted">Your recorded results are ordered by exam and subject.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {entries ? entries.length ? (
        <div className="student-table-wrap">
          <table className="student-table">
            <thead><tr><th>Exam</th><th>Subject</th><th>Marks</th><th>Percentage</th></tr></thead>
            <tbody>{entries.map((entry, index) => (
              <tr key={`${entry.examName}-${entry.subject}-${index}`}>
                <td>{entry.examName}</td>
                <td>{entry.subject}</td>
                <td>{entry.obtainedMarks} / {entry.maximumMarks}</td>
                <td>{entry.percentage}%</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="student-empty">No exam results have been recorded yet.</p> : !error ? <p className="muted">Loading your results…</p> : null}
    </section>
  );

}
