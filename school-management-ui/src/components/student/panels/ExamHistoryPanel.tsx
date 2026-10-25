import { useEffect, useMemo, useState } from "react";
import { getStudentExamResults } from "../../../services/api";
import type { StudentExamResult } from "../../../types/api";

export function StudentExamHistoryPanel() {
  const [results, setResults] = useState<StudentExamResult[] | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [error, setError] = useState("");

  useEffect(() => {
    getStudentExamResults()
      .then(setResults)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load exam history."));
  }, []);

  const years = useMemo(() => [...new Set([
    new Date().getFullYear(),
    ...(results ?? []).map((result) => result.academicYear),
  ])].sort((left, right) => right - left), [results]);
  const yearResults = (results ?? []).filter((result) => result.academicYear === selectedYear);

  return (
    <section className="student-panel">
      <div className="section-heading">
        <div><p className="eyebrow">Your progress</p><h3>Exam Results &amp; Progress</h3></div>
        <label className="year-picker">Academic year
          <select aria-label="Academic year" onChange={(event) => setSelectedYear(Number(event.target.value))} value={selectedYear}>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
      </div>
      <p className="muted">Choose a year to review each exam total, percentage, and class and section rank.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {results ? yearResults.length ? (
        <div className="exam-result-list">
          {yearResults.map((result) => (
            <details className="exam-result-card" key={result.examId}>
              <summary>
                <span className="exam-result-title">{result.examName}</span>
                <span className="exam-result-total">{result.totalMarks} / {result.maximumMarks}</span>
                <span className="exam-result-percentage">{result.percentage}%</span>
                <span className="exam-result-ranks">Section #{result.sectionRank} · Class #{result.classRank}</span>
              </summary>
              <div className="student-table-wrap">
                <table className="student-table">
                  <thead><tr><th>Subject</th><th>Marks</th><th>Percentage</th></tr></thead>
                  <tbody>{result.subjects.map((subject) => (
                    <tr key={subject.subject}>
                      <td>{subject.subject}</td>
                      <td>{subject.obtainedMarks} / {subject.maximumMarks}</td>
                      <td>{subject.percentage}%</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      ) : <p className="student-empty">No exam results recorded for {selectedYear}.</p> : !error ? <p className="muted">Loading your results…</p> : null}
    </section>
  );
}
