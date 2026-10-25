import { useEffect, useState } from "react";
import { getStudentToppers } from "../../../services/api";
import type { StudentLeaderboardEntry, StudentToppers } from "../../../types/api";

type LeaderboardView = "class" | "section" | "subject";

function groupEntries(
  entries: StudentLeaderboardEntry[],
  getKey: (entry: StudentLeaderboardEntry) => string,
) {
  const groups = new Map<string, StudentLeaderboardEntry[]>();
  for (const entry of entries) {
    const key = getKey(entry);
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }
  return [...groups.values()];
}

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
          <li className={entry.currentStudent ? "leaderboard-current-student" : undefined} key={`${entry.studentName}-${entry.subject ?? ""}-${index}`}>
            <span className="leaderboard-rank">#{entry.rank}</span>
            <span className="leaderboard-name">{entry.studentName}</span>
            {entry.subject && <span>{entry.subject}</span>}
            {entry.currentStudent && <span className="leaderboard-you">You</span>}
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
  const [view, setView] = useState<LeaderboardView>("class");

  useEffect(() => {
    getStudentToppers()
      .then(setToppers)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load school toppers."));
  }, []);

  const classGroups = toppers
    ? groupEntries(toppers.classToppers, (entry) => JSON.stringify([entry.className, entry.academicYear]))
    : [];
  const sectionGroups = toppers
    ? groupEntries(toppers.sectionToppers, (entry) => JSON.stringify([entry.className, entry.sectionName, entry.academicYear]))
    : [];
  const subjectGroups = toppers
    ? groupEntries(toppers.subjectToppers, (entry) => JSON.stringify([entry.className, entry.subject, entry.academicYear]))
    : [];
  const groups = view === "class" ? classGroups : view === "section" ? sectionGroups : subjectGroups;
  const groupTitle = view === "class" ? "Class rankings" : view === "section" ? "Section rankings" : "Subject toppers";
  const groupSubtitle = view === "class"
    ? "Class total marks"
    : view === "section" ? "Section total marks" : "Subject total marks";

  return (
    <section className="student-panel">
      <div className="section-heading">
        <div><p className="eyebrow">Celebrating achievement</p><h3>School Toppers</h3></div>
      </div>
      <p className="muted">Explore ranked student lists by class total, section total, and subject within each class. Tied marks share the same rank.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {toppers ? (
        <>
          <div className="toppers-summary" aria-label="Leaderboard summary">
            <div><strong>{classGroups.length}</strong><span>Classes ranked</span></div>
            <div><strong>{sectionGroups.length}</strong><span>Sections ranked</span></div>
            <div><strong>{subjectGroups.length}</strong><span>Subject leaderboards</span></div>
          </div>
          <div className="toppers-toolbar">
            <div className="toppers-tabs" aria-label="Leaderboard type">
              <button aria-pressed={view === "class"} className="quiet-button" onClick={() => setView("class")} type="button">
                By class <span>{classGroups.length}</span>
              </button>
              <button aria-pressed={view === "section"} className="quiet-button" onClick={() => setView("section")} type="button">
                By section <span>{sectionGroups.length}</span>
              </button>
              <button aria-pressed={view === "subject"} className="quiet-button" onClick={() => setView("subject")} type="button">
                By subject <span>{subjectGroups.length}</span>
              </button>
            </div>
            <p className="muted toppers-view-title">{groupTitle}</p>
          </div>
          <div className="leaderboard-grid">
            {groups.length ? groups.map((entries) => {
              const { className, sectionName, subject } = entries[0];
              const title = view === "class"
                ? `${entries[0].academicYear} · ${className ?? "Class"}`
                : view === "section"
                  ? `${entries[0].academicYear} · ${className ?? "Class"} · ${sectionName ?? "Section"}`
                  : `${entries[0].academicYear} · ${className ?? "Class"} · ${subject ?? "Subject"}`;
              return (
                <Leaderboard
                  entries={entries}
                  key={`${view}-${JSON.stringify([entries[0].academicYear, className, sectionName, subject])}`}
                  subtitle={groupSubtitle}
                  title={title}
                />
              );
            }) : (
              <p className="student-empty toppers-empty">No marks have been recorded for this leaderboard yet.</p>
            )}
          </div>
        </>
      ) : !error ? <p className="muted">Loading toppers…</p> : null}
    </section>
  );
}
