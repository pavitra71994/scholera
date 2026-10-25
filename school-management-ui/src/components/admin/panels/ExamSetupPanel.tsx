import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createSchoolExamDefinition,
  createSectionSubject,
  getClasses,
  getSchoolExamDefinitions,
  getSectionSubjects,
} from "../../../services/api";
import type { SchoolClass, SchoolExamDefinition, SchoolSectionSubject } from "../../../types/api";

export function ExamSetupPanel() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [definitions, setDefinitions] = useState<SchoolExamDefinition[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [sectionSubjects, setSectionSubjects] = useState<SchoolSectionSubject[]>([]);
  const [name, setName] = useState("");
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()));
  const [subject, setSubject] = useState("");
  const [maximumMarks, setMaximumMarks] = useState("100");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getClasses(), getSchoolExamDefinitions()])
      .then(([classList, examDefinitions]) => {
        setClasses(classList);
        setSelectedClassId(classList[0]?.id ?? null);
        setDefinitions(examDefinitions);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load exam setup."));
  }, []);

  const selectedClass = classes.find((item) => item.id === selectedClassId) ?? null;
  const selectedSection = selectedClass?.sections.find((item) => item.id === selectedSectionId) ?? null;

  useEffect(() => {
    setSelectedSectionId(null);
    setSectionSubjects([]);
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedSectionId === null) {
      setSectionSubjects([]);
      return;
    }
    getSectionSubjects(selectedSectionId)
      .then(setSectionSubjects)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load section subjects."));
  }, [selectedSectionId]);

  const sortedDefinitions = useMemo(
    () => [...definitions].sort((a, b) => b.academicYear - a.academicYear || a.name.localeCompare(b.name)),
    [definitions],
  );

  async function addExamDefinition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const created = await createSchoolExamDefinition({ name: name.trim(), academicYear: Number(academicYear) });
      setDefinitions((items) => [...items, created]);
      setName("");
      setMessage(`${created.name} is now available in every class and section.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add the school-wide exam.");
    } finally {
      setSaving(false);
    }
  }

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
      setSectionSubjects((items) => [...items, created].sort((a, b) => a.subject.localeCompare(b.subject)));
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
    <section className="module-card">
      <div className="section-heading">
        <div><p className="eyebrow">Academic schedule</p><h3>Exam Setup</h3></div>
        <label className="module-field class-filter">Class
          <select aria-label="Class" onChange={(event) => setSelectedClassId(event.target.value ? Number(event.target.value) : null)} value={selectedClassId ?? ""}>
            {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}
          </select>
        </label>
      </div>
      <p className="muted">Add each school exam once. It is automatically available in every class and section. Subjects are configured once per section and appear in every exam there.</p>
      <form className="module-form exam-create-form" onSubmit={addExamDefinition}>
        <label className="module-field">Common exam name
          <input maxLength={100} onChange={(event) => setName(event.target.value)} placeholder="e.g. Term 1" required value={name} />
        </label>
        <label className="module-field">Academic year
          <input max="9999" min="2000" onChange={(event) => setAcademicYear(event.target.value)} required type="number" value={academicYear} />
        </label>
        <button className="secondary-button" disabled={saving} type="submit">{saving ? "Saving…" : "Add common exam"}</button>
      </form>
      {sortedDefinitions.length > 0 && (
        <div className="exam-definition-list">
          {sortedDefinitions.map((definition) => (
            <span className="status-pill" key={definition.id}>{definition.academicYear} · {definition.name}</span>
          ))}
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      {selectedClass ? selectedClass.sections.length ? (
        <>
          <h4 className="section-picker-heading">{selectedClass.name} sections</h4>
          <div className="exam-section-cards">
            {selectedClass.sections.map((section) => (
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
      ) : <p className="class-empty">This class has no sections yet.</p> : <p className="class-empty">Create a class and section to configure subjects.</p>}
      {selectedSection && (
        <div className="section-subject-editor">
          <div className="section-heading">
            <div><p className="eyebrow">{selectedClass?.name}</p><h4>Section {selectedSection.name} subjects</h4></div>
          </div>
          {sectionSubjects.length ? (
            <ul className="section-subject-list">
              {sectionSubjects.map((item) => (
                <li key={item.id}><span>{item.subject}</span><strong>Default maximum {item.defaultMaximumMarks}</strong></li>
              ))}
            </ul>
          ) : <p className="class-empty">No subjects configured for this section yet.</p>}
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
