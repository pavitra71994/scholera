import { useEffect, useMemo, useState } from "react";
import { getStudentExamResults } from "../../../services/api";
import type { StudentExamResult } from "../../../types/api";
import { DropdownSelect } from "../../shared/DropdownSelect";

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
        <DropdownSelect
          label="Academic year"
          onChange={(year) => setSelectedYear(Number(year))}
          options={years.map((year) => ({ value: String(year), label: String(year) }))}
          value={String(selectedYear)}
          wrapperClassName="year-picker"
        />
      </div>
      <p className="muted">Choose a year to review your annual total and rank, then explore each exam’s subject marks.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {results ? yearResults.length ? (
        <>
          <section className="annual-result-summary" aria-label={`${selectedYear} annual results`}>
            <div className="annual-result-heading">
              <div><p className="eyebrow">{selectedYear} academic year</p><h4>Yearly performance</h4></div>
              {(yearResults[0].yearSectionRank <= 3 || yearResults[0].yearClassRank <= 3) && (
                <p className="annual-result-congratulations" role="status">
                  Congratulations! You are among the top 3 in your
                  {yearResults[0].yearClassRank <= 3 ? ` class (#${yearResults[0].yearClassRank})` : ` section (#${yearResults[0].yearSectionRank})`}
                  {" "}this year.
                </p>
              )}
            </div>
            <div className="annual-result-metrics">
              <div><span>Total marks</span><strong>{yearResults[0].yearTotalMarks} / {yearResults[0].yearMaximumMarks}</strong></div>
              <div><span>Year percentage</span><strong>{yearResults[0].yearPercentage}%</strong></div>
              <div><span>Section rank</span><strong>#{yearResults[0].yearSectionRank}</strong></div>
              <div><span>Class rank</span><strong>#{yearResults[0].yearClassRank}</strong></div>
            </div>
          </section>
          <div className="exam-result-list">
            {yearResults.map((result) => (
              <details className="exam-result-card" key={result.examId}>
                <summary>
                  <span className="exam-result-title">{result.examName}</span>
                  <span className="exam-result-total">{result.totalMarks} / {result.maximumMarks}</span>
                  <span className="exam-result-percentage">{result.percentage}%</span>
                  <span className="exam-result-ranks">Section rank: #{result.sectionRank} · Class rank: #{result.classRank}</span>
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
        </>
      ) : <p className="student-empty">No exam results recorded for {selectedYear}.</p> : !error ? <p className="muted">Loading your results…</p> : null}
    </section>
  );
}
