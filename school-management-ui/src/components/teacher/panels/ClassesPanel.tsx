import { useEffect, useState } from "react";
import { getTeacherRoster } from "../../../services/api";
import type { TeacherStudent } from "../../../types/api";
import { useTeacherSections } from "../../../hooks/useTeacherSections";
import { SectionEmptyState, SectionPicker } from "./SectionPicker";

export function TeacherClassesPage() {
  const { sections, loading, error } = useTeacherSections();
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [students, setStudents] = useState<TeacherStudent[] | null>(null);
  const [rosterError, setRosterError] = useState("");

  useEffect(() => {
    if (!sections.length) return;
    setSectionId((selected) => selected && sections.some((section) => section.id === selected) ? selected : sections[0].id);
  }, [sections]);

  useEffect(() => {
    if (sectionId == null) {
      setStudents(null);
      return;
    }
    setStudents(null);
    setRosterError("");
    getTeacherRoster(sectionId)
      .then(setStudents)
      .catch((cause: unknown) => setRosterError(cause instanceof Error ? cause.message : "Could not load this roster."));
  }, [sectionId]);

  const currentSection = sections.find((section) => section.id === sectionId);
  return (
    <section className="teacher-panel">
      <div className="section-heading"><div><p className="eyebrow">Teaching groups</p><h3>My Classes &amp; Roster</h3></div></div>
      <p className="muted">Student names and roll numbers for your assigned sections.</p>
      <SectionEmptyState error={error} loading={loading} sections={sections} />
      {!loading && !error && sections.length > 0 && (
        <>
          <SectionPicker onChange={setSectionId} sections={sections} selected={sectionId} />
          {currentSection && <h4 className="teacher-section-title">{currentSection.className} · {currentSection.name}</h4>}
          {rosterError && <p className="form-error" role="alert">{rosterError}</p>}
          {!students && !rosterError ? <p className="muted">Loading roster…</p> : students?.length ? (
            <div className="module-table-wrap">
              <table className="module-table">
                <thead><tr><th>Roll no.</th><th>Student</th></tr></thead>
                <tbody>{students.map((student) => (
                  <tr key={student.id}><td>{student.rollNumber ?? "—"}</td><td>{student.fullName}</td></tr>
                ))}</tbody>
              </table>
            </div>
          ) : students ? <p className="class-empty">No students are enrolled in this section yet.</p> : null}
        </>
      )}
    </section>
  );
}
