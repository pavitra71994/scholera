import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createSectionSubject,
  getSchoolExamDefinitions,
  getSectionSubjects,
} from "../../../services/api";
import type { SchoolExamDefinition, SchoolSectionSubject, TeacherSection } from "../../../types/api";
import { useTeacherSections } from "../../../hooks/useTeacherSections";
import { SectionEmptyState } from "./SectionPicker";

export function TeacherExamSetupPanel() {
  const { sections, loading, error: sectionsError } = useTeacherSections();
  const [definitions, setDefinitions] = useState<SchoolExamDefinition[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<SchoolSectionSubject[]>([]);
  const [subject, setSubject] = useState("");
  const [maximumMarks, setMaximumMarks] = useState("100");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSchoolExamDefinitions()
      .then(setDefinitions)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load school exams."));
  }, []);

  const classNames = useMemo(
    () => [...new Set(sections.map((section) => section.className))].sort(),
    [sections],
  );
  const visibleSections = sections.filter((section) => section.className === selectedClass);
  const currentSection = visibleSections.find((section) => section.id === selectedSectionId) ?? null;
  const orderedDefinitions = [...definitions].sort((a, b) => b.academicYear - a.academicYear || a.name.localeCompare(b.name));

  useEffect(() => {
    if (!classNames.length) return;
    setSelectedClass((current) => classNames.includes(current) ? current : classNames[0]);
  }, [classNames]);

  useEffect(() => {
    setSelectedSectionId(null);
    setSubjects([]);
  }, [selectedClass]);

  useEffect(() => {
    if (selectedSectionId === null) {
      setSubjects([]);
      return;
    }
    getSectionSubjects(selectedSectionId)
      .then(setSubjects)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load section subjects."));
  }, [selectedSectionId]);

  async function addSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedSectionId === null) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const created = await createSectionSubject(selectedSectionId, {
        subject: subject.trim(),
        maximumMarks: Number(maximumMarks),
      });
      setSubjects((items) => [...items, created].sort((a, b) => a.subject.localeCompare(b.subject)));
      setSubject("");
      setMaximumMarks("100");
      setMessage(`${created.subject} was added to every exam for this section.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add the section subject.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="teacher-panel">
      <div className="section-heading">
        <div><p className="eyebrow">Academic schedule</p><h3>Exam Setup</h3></div>
        <label className="module-field class-filter">Class
          <select aria-label="Class" onChange={(event) => setSelectedClass(event.target.value)} value={selectedClass}>
            {classNames.map((className) => <option key={className} value={className}>{className}</option>)}
          </select>
        </label>
      </div>
      <p className="muted">School exams are shared across classes. Configure subjects once for each assigned section; they appear in every exam for that section.</p>
      <SectionEmptyState error={sectionsError} loading={loading} sections={sections} />
      {orderedDefinitions.length ? (
        <div className="exam-definition-list">{orderedDefinitions.map((exam) => (
          <span className="status-pill" key={exam.id}>{exam.academicYear} · {exam.name}</span>
        ))}</div>
      ) : !loading && !sectionsError ? <p className="class-empty">No school-wide exams have been set up yet.</p> : null}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      {visibleSections.length > 0 && (
        <>
          <h4 className="section-picker-heading">{selectedClass} sections</h4>
          <div className="exam-section-cards">
            {visibleSections.map((section: TeacherSection) => (
              <button
                aria-pressed={selectedSectionId === section.id}
                className={`exam-section-card${selectedSectionId === section.id ? " is-selected" : ""}`}
                key={section.id}
                onClick={() => setSelectedSectionId((current) => current === section.id ? null : section.id)}
                type="button"
              >
                <strong>Section {section.name}</strong>
                <span>{selectedSectionId === section.id ? "Selected · manage subjects" : "Open section subjects"}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {currentSection && (
        <div className="section-subject-editor">
          <div className="section-heading"><div><p className="eyebrow">{selectedClass}</p><h4>Section {currentSection.name} subjects</h4></div></div>
          {subjects.length ? <ul className="section-subject-list">{subjects.map((item) => (
            <li key={item.id}><span>{item.subject}</span><strong>Default maximum {item.defaultMaximumMarks}</strong></li>
          ))}</ul> : <p className="class-empty">No subjects configured for this section yet.</p>}
          <form className="module-form exam-create-form" onSubmit={addSubject}>
            <label className="module-field">Subject
              <input maxLength={100} onChange={(event) => setSubject(event.target.value)} required value={subject} />
            </label>
            <label className="module-field">Default maximum marks
              <input min="0.01" onChange={(event) => setMaximumMarks(event.target.value)} required step="0.01" type="number" value={maximumMarks} />
            </label>
            <button className="secondary-button" disabled={saving} type="submit">{saving ? "Saving…" : "Add section subject"}</button>
          </form>
        </div>
      )}
    </section>
  );
}
