import { useEffect, useMemo, useState } from "react";
import { getClasses, getStudentToppers } from "../../../services/api";
import type { SchoolClass, StudentLeaderboardEntry, StudentToppers } from "../../../types/api";
import { DropdownSelect } from "../../shared/DropdownSelect";

function Leaderboard({
  title,
  subtitle,
  entries,
}: {
  title: string;
  subtitle: string;
  entries: StudentLeaderboardEntry[];
}) {
  return (
    <article className="leaderboard">
      <div className="section-heading"><div><h4>{title}</h4><p className="muted">{subtitle}</p></div></div>
      {entries.length ? (
        <ol>{entries.map((entry, index) => (
          <li className={entry.currentStudent ? "leaderboard-current-student" : undefined} key={`${entry.studentName}-${index}`}>
            <span className="leaderboard-rank">#{entry.rank}</span>
            <span className="leaderboard-name">{entry.studentName}</span>
            {entry.currentStudent && <span className="leaderboard-you">You</span>}
            <strong>{entry.totalMarks} marks</strong>
          </li>
        ))}</ol>
      ) : <p className="student-empty">No marks have been recorded for this group yet.</p>}
    </article>
  );
}

export function StudentToppersPanel() {
  const currentYear = new Date().getFullYear();
  const [toppers, setToppers] = useState<StudentToppers | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getStudentToppers()
      .then(setToppers)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load school toppers."));

    getClasses()
      .then((items) => {
        setClasses(items);
        const defaultClass = items.find((item) => item.name.toLowerCase() === "class 1") ?? items[0];
        if (defaultClass) {
          setSelectedClassId(String(defaultClass.id));
          const defaultSection = defaultClass.sections.find((section) => section.name.toLowerCase() === "a")
            ?? defaultClass.sections[0];
          setSelectedSectionId(defaultSection ? String(defaultSection.id) : "");
        }
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load classes."));
  }, []);

  const selectedClass = classes.find((item) => String(item.id) === selectedClassId);
  const selectedSection = selectedClass?.sections.find((section) => String(section.id) === selectedSectionId);
  const years = useMemo(() => {
    const availableYears = new Set<number>([currentYear]);
    toppers?.classToppers.forEach((entry) => availableYears.add(entry.academicYear));
    toppers?.sectionToppers.forEach((entry) => availableYears.add(entry.academicYear));
    return [...availableYears].sort((a, b) => b - a);
  }, [currentYear, toppers]);

  const classEntries = toppers?.classToppers.filter((entry) =>
    entry.academicYear === Number(selectedYear) && entry.className === selectedClass?.name,
  ) ?? [];
  const sectionEntries = toppers?.sectionToppers.filter((entry) =>
    entry.academicYear === Number(selectedYear)
      && entry.className === selectedClass?.name
      && entry.sectionName === selectedSection?.name,
  ) ?? [];

  function changeClass(classId: string) {
    setSelectedClassId(classId);
    const nextClass = classes.find((item) => String(item.id) === classId);
    const defaultSection = nextClass?.sections.find((section) => section.name.toLowerCase() === "a")
      ?? nextClass?.sections[0];
    setSelectedSectionId(defaultSection ? String(defaultSection.id) : "");
  }

  return (
    <section className="student-panel">
      <div className="section-heading">
        <div><p className="eyebrow">Celebrating achievement</p><h3>School Toppers</h3></div>
      </div>
      <p className="muted">View class and section rankings for the selected academic year. Tied marks share the same rank.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="toppers-filters">
        <DropdownSelect
          label="Academic year"
          onChange={setSelectedYear}
          options={years.map((year) => ({ value: String(year), label: String(year) }))}
          value={selectedYear}
        />
        <DropdownSelect
          label="Class"
          onChange={changeClass}
          options={classes.map((schoolClass) => ({ value: String(schoolClass.id), label: schoolClass.name }))}
          value={selectedClassId}
        />
        <DropdownSelect
          label="Section"
          disabled={!selectedClass?.sections.length}
          onChange={setSelectedSectionId}
          options={(selectedClass?.sections ?? []).map((section) => ({ value: String(section.id), label: section.name }))}
          value={selectedSectionId}
        />
      </div>
      {toppers ? (
        <div className="leaderboard-grid toppers-results">
          <Leaderboard
            entries={classEntries}
            subtitle="Total marks across the selected class"
            title={`${selectedClass?.name ?? "Class"} toppers`}
          />
          <Leaderboard
            entries={sectionEntries}
            subtitle="Total marks across the selected section"
            title={`${selectedClass?.name ?? "Class"} · Section ${selectedSection?.name ?? ""} toppers`}
          />
        </div>
      ) : !error ? <p className="muted">Loading toppers…</p> : null}
    </section>
  );
}
