import { useEffect, useState } from "react";
import { getStudentToppers } from "../../../services/api";
import type { StudentToppers } from "../../../types/api";

function Leaderboard({
  title,
  subtitle,
  entries,
}: {
  title: string;
  subtitle: string;
  entries: StudentToppers["classToppers"];
}) {
  return (
    <article className="leaderboard">
      <div className="section-heading"><div><h4>{title}</h4><p className="muted">{subtitle}</p></div></div>
      {entries.length ? (
        <ol>{entries.map((entry, index) => (
          <li key={`${entry.studentName}-${entry.subject ?? ""}-${index}`}>
            <span className="leaderboard-rank">#{entry.rank}</span>
            <span className="leaderboard-name">{entry.studentName}</span>
            {entry.subject && <span>{entry.subject}</span>}
            <strong>{entry.totalMarks} marks</strong>
          </li>
        ))}</ol>
      ) : <p className="student-empty">No marks have been recorded for this group yet.</p>}
    </article>
  );
}

export function StudentToppersPanel() {
  const [toppers, setToppers] = useState<StudentToppers | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getStudentToppers()
      .then(setToppers)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load school toppers."));
  }, []);

  return (
    <section className="student-panel">
      <div className="section-heading">
        <div><p className="eyebrow">Celebrating achievement</p><h3>School Toppers</h3></div>
      </div>
      <p className="muted">Leaders are ranked by raw total marks. Everyone tied for the top rank is shown.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {toppers ? (
        <div className="leaderboard-grid">
          <Leaderboard entries={toppers.classToppers} subtitle="Your class" title="Class total" />
          <Leaderboard entries={toppers.sectionToppers} subtitle="Your section" title="Section total" />
          <Leaderboard entries={toppers.subjectToppers} subtitle="Your class, by subject" title="Subject toppers" />
        </div>
      ) : !error ? <p className="muted">Loading toppers…</p> : null}
    </section>
  );
}
