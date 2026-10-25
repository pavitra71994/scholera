import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createSchoolExamDefinition,
  createExamSubject,
  deleteExamFromSection,
  deleteExamSubject,
  deleteSchoolExamDefinition,
  getClasses,
  getExams,
  getSchoolExamDefinitions,
} from "../../../services/api";
import type { SchoolClass, SchoolExam, SchoolExamDefinition } from "../../../types/api";
import { DropdownSelect } from "../../shared/DropdownSelect";

export function ExamSetupPanel() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [definitions, setDefinitions] = useState<SchoolExamDefinition[]>([]);
  const [sectionExams, setSectionExams] = useState<SchoolExam[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<number | null>(null);
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
        setSelectedSectionId(classList[0]?.sections[0]?.id ?? null);
        const ordered = [...examDefinitions].sort(
          (left, right) => right.academicYear - left.academicYear || left.name.localeCompare(right.name),
        );
        setDefinitions(ordered);
        setSelectedDefinitionId(ordered[0]?.id ?? null);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load exam setup."));
  }, []);

  useEffect(() => {
    if (selectedSectionId === null) {
      setSectionExams([]);
      return;
    }
    getExams(selectedSectionId)
      .then((exams) => {
        setSectionExams(exams);
        setSelectedDefinitionId((current) =>
          current !== null && exams.some((exam) => exam.examDefinitionId === current)
            ? current
            : exams[0]?.examDefinitionId ?? null);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load section exams."));
  }, [selectedSectionId]);

  const selectedClass = classes.find((item) => item.id === selectedClassId) ?? null;
  const selectedSection = selectedClass?.sections.find((section) => section.id === selectedSectionId) ?? null;
  const selectedExam = sectionExams.find((exam) => exam.examDefinitionId === selectedDefinitionId) ?? null;
  const sortedDefinitions = useMemo(
    () => [...definitions].sort((left, right) =>
      right.academicYear - left.academicYear || left.name.localeCompare(right.name)),
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
      setSelectedDefinitionId(created.id);
      setName("");
      if (selectedSectionId !== null) {
        const exams = await getExams(selectedSectionId);
        setSectionExams(exams);
      }
      setMessage(`${created.name} is now available in every class and section.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add the school-wide exam.");
    } finally {
      setSaving(false);
    }
  }

  async function removeExamDefinition() {
    if (!selectedDefinitionId) return;
    const definition = definitions.find((item) => item.id === selectedDefinitionId);
    if (!definition || !window.confirm(
      `Remove ${definition.name} (${definition.academicYear}) from every class and section? This also permanently deletes its recorded marks.`,
    )) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await deleteSchoolExamDefinition(definition.id);
      const remaining = definitions.filter((item) => item.id !== definition.id);
      setDefinitions(remaining);
      setSectionExams((items) => items.filter((exam) => exam.examDefinitionId !== definition.id));
      setSelectedDefinitionId(remaining[0]?.id ?? null);
      setMessage(`${definition.name} was removed from every class and section.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove the school-wide exam.");
    } finally {
      setSaving(false);
    }
  }

  async function removeExamFromSection() {
    if (!selectedExam || !selectedSection) return;
    const recordedMarks = selectedExam.subjects.reduce((count, item) => count + item.marks.length, 0);
    const consequence = recordedMarks
      ? ` This also permanently deletes ${recordedMarks} recorded mark${recordedMarks === 1 ? "" : "s"}.`
      : "";
    if (!window.confirm(
      `Remove ${selectedExam.name} (${selectedExam.academicYear}) from ${selectedClass?.name}, section ${selectedSection.name}? It will remain available in other sections.${consequence}`,
    )) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await deleteExamFromSection(selectedExam.id);
      setSectionExams((items) => items.filter((exam) => exam.id !== selectedExam.id));
      setMessage(`${selectedExam.name} was removed from section ${selectedSection.name}. It remains available in other sections.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove the exam from this section.");
    } finally {
      setSaving(false);
    }
  }

  async function addSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedExam) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const created = await createExamSubject(selectedExam.id, {
        subject: subject.trim(),
        maximumMarks: Number(maximumMarks),
      });
      setSectionExams((items) => items.map((exam) =>
        exam.id === selectedExam.id
          ? { ...exam, subjects: [...exam.subjects, created].sort((left, right) => left.subject.localeCompare(right.subject)) }
          : exam));
      setSubject("");
      setMaximumMarks("100");
      setMessage(`${created.subject} was added to ${selectedExam.name} for ${selectedSection?.name}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add the exam subject.");
    } finally {
      setSaving(false);
    }
  }

  async function removeSubject(subjectId: number, subjectName: string, recordedMarks: number) {
    if (!selectedExam) return;
    const consequence = recordedMarks
      ? ` This will also permanently delete ${recordedMarks} recorded mark${recordedMarks === 1 ? "" : "s"}.`
      : "";
    if (!window.confirm(`Remove ${subjectName} from ${selectedExam.name}?${consequence}`)) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await deleteExamSubject(selectedExam.id, subjectId);
      setSectionExams((items) => items.map((exam) =>
        exam.id === selectedExam.id
          ? { ...exam, subjects: exam.subjects.filter((item) => item.id !== subjectId) }
          : exam));
      setMessage(`${subjectName} was removed from ${selectedExam.name}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove the exam subject.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="module-card exam-setup-panel">
      <div className="section-heading">
        <div><p className="eyebrow">Academic schedule</p><h3>Exam Setup</h3></div>
      </div>
      <p className="muted">Create school-wide exams, then choose a class, section, and exam to manage that exam’s subjects.</p>
      <form className="module-form exam-create-form" onSubmit={addExamDefinition}>
        <label className="module-field">Common exam name
          <input maxLength={100} onChange={(event) => setName(event.target.value)} placeholder="e.g. Term 1" required value={name} />
        </label>
        <label className="module-field">Academic year
          <input max="9999" min="2000" onChange={(event) => setAcademicYear(event.target.value)} required type="number" value={academicYear} />
        </label>
        <button className="secondary-button" disabled={saving} type="submit">{saving ? "Saving…" : "Add common exam"}</button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      <div className="exam-setup-filters">
        <DropdownSelect
          label="Class"
          onChange={(selected) => {
            const classId = selected ? Number(selected) : null;
            const schoolClass = classes.find((item) => item.id === classId);
            setSelectedClassId(classId);
            setSelectedSectionId(schoolClass?.sections[0]?.id ?? null);
          }}
          options={classes.map((schoolClass) => ({ value: String(schoolClass.id), label: schoolClass.name }))}
          value={selectedClassId === null ? "" : String(selectedClassId)}
        />
        <DropdownSelect
          label="Section"
          onChange={(selected) => setSelectedSectionId(selected ? Number(selected) : null)}
          options={(selectedClass?.sections ?? []).map((section) => ({ value: String(section.id), label: section.name }))}
          value={selectedSectionId === null ? "" : String(selectedSectionId)}
        />
        <DropdownSelect
          label="Exam"
          onChange={(selected) => setSelectedDefinitionId(selected ? Number(selected) : null)}
          options={sortedDefinitions.map((definition) => ({
            value: String(definition.id),
            label: `${definition.academicYear} · ${definition.name}`,
          }))}
          value={selectedDefinitionId === null ? "" : String(selectedDefinitionId)}
        />
        <button className="danger-button" disabled={!selectedDefinitionId || saving} onClick={removeExamDefinition} type="button">
          Remove exam everywhere
        </button>
        <button className="danger-button" disabled={!selectedExam || saving} onClick={removeExamFromSection} type="button">
          Remove from this section
        </button>
      </div>
      {selectedExam ? (
        <div className="section-subject-editor">
          <div className="section-heading">
            <div><p className="eyebrow">{selectedClass?.name} · Section {selectedSection?.name}</p><h4>{selectedExam.name} subjects</h4></div>
          </div>
          {selectedExam.subjects.length ? (
            <ul className="section-subject-list">
              {selectedExam.subjects.map((item) => (
                <li key={item.id}>
                  <span>{item.subject}<small>{item.marks.length} marks recorded · maximum {item.maximumMarks}</small></span>
                  <button aria-label={`Remove ${item.subject} from ${selectedExam.name}`} className="danger-button" disabled={saving} onClick={() =>
                    void removeSubject(item.id, item.subject, item.marks.length)} type="button">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="class-empty">No subjects configured for this exam and section yet.</p>}
          <form className="module-form exam-create-form" onSubmit={addSubject}>
            <label className="module-field">Subject
              <input maxLength={100} onChange={(event) => setSubject(event.target.value)} required value={subject} />
            </label>
            <label className="module-field">Maximum marks
              <input min="0.01" onChange={(event) => setMaximumMarks(event.target.value)} required step="0.01" type="number" value={maximumMarks} />
            </label>
            <button className="secondary-button" disabled={saving} type="submit">{saving ? "Saving…" : "Add subject to exam"}</button>
          </form>
        </div>
      ) : selectedSection ? (
        <p className="class-empty">No exam is available for this section. Add a common exam to create it.</p>
      ) : (
        <p className="class-empty">Create a class and section before configuring exam subjects.</p>
      )}
    </section>
  );
}
