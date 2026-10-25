import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  createExam,
  createExamSubject,
  createSchoolExamDefinition,
  getExams,
  getPeople,
  getSchoolExamDefinitions,
  saveExamMarks,
} from "../../../services/api";
import type { SchoolExam, SchoolExamDefinition, SchoolPerson } from "../../../types/api";
import { useAdminSections } from "../../../hooks/useAdminSections";
import { SectionSelect } from "./SectionSelect";

export function ExamsManagement() {
  const { sections, error: sectionError, loading: sectionsLoading } = useAdminSections();
  const [people, setPeople] = useState<SchoolPerson[]>([]);
  const [definitions, setDefinitions] = useState<SchoolExamDefinition[]>([]);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<number | null>(null);
  const [exams, setExams] = useState<SchoolExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()));
  const [subject, setSubject] = useState("");
  const [maximumMarks, setMaximumMarks] = useState("100");
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getPeople("STUDENT").then(setPeople).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Could not load students.");
    });
    getSchoolExamDefinitions().then((items) => {
      setDefinitions(items);
      setSelectedDefinitionId(items[0]?.id ?? null);
    }).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Could not load school-wide exams.");
    });
  }, []);

  useEffect(() => {
    if (!sectionId) {
      setExams([]);
      setSelectedExamId(null);
      return;
    }
    setLoading(true);
    setError("");
    getExams(sectionId)
      .then((items) => {
        setExams(items);
        setSelectedExamId(items[0]?.id ?? null);
        setSelectedSubjectId(items[0]?.subjects[0]?.id ?? null);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load exams."))
      .finally(() => setLoading(false));
  }, [sectionId]);

  const students = people.filter((person) => person.role === "STUDENT" && person.sectionId === sectionId);
  const selectedExam = exams.find((exam) => exam.id === selectedExamId) ?? null;
  const selectedSubject = selectedExam?.subjects.find((item) => item.id === selectedSubjectId) ?? null;
  const availableDefinitions = definitions.filter(
    (definition) => !exams.some((exam) => exam.examDefinitionId === definition.id),
  );

  useEffect(() => {
    if (!availableDefinitions.some((definition) => definition.id === selectedDefinitionId)) {
      setSelectedDefinitionId(availableDefinitions[0]?.id ?? null);
    }
  }, [availableDefinitions, selectedDefinitionId]);

  useEffect(() => {
    if (!selectedSubject) {
      setMarks({});
      return;
    }
    setMarks(Object.fromEntries(students.map((student) => {
      const saved = selectedSubject.marks.find((mark) => mark.studentId === student.id);
      return [student.id, saved ? String(saved.obtainedMarks) : ""];
    })));
  }, [selectedSubjectId, students.length, exams]);

  async function refreshExams(selectId?: number, selectSubjectId?: number) {
    if (sectionId === null) return;
    const items = await getExams(sectionId);
    setExams(items);
    const nextExamId = selectId ?? items[0]?.id ?? null;
    const nextExam = items.find((exam) => exam.id === nextExamId);
    setSelectedExamId(nextExamId);
    setSelectedSubjectId(selectSubjectId ?? nextExam?.subjects[0]?.id ?? null);
  }

  async function addSchoolExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const created = await createSchoolExamDefinition({
        name: name.trim(),
        academicYear: Number(academicYear),
      });
      const items = await getSchoolExamDefinitions();
      setDefinitions(items);
      setSelectedDefinitionId(created.id);
      setName("");
      setMessage("School-wide exam added.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add school-wide exam.");
    } finally {
      setSaving(false);
    }
  }

  async function addExamToSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sectionId === null || !sections.some((section) => section.id === sectionId)
      || selectedDefinitionId === null
      || !availableDefinitions.some((definition) => definition.id === selectedDefinitionId)) {
      setError("Choose a section and a school-wide exam before adding it.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const created = await createExam({
        sectionId,
        examDefinitionId: selectedDefinitionId,
      });
      await refreshExams(created.id);
      setMessage("Exam added to this section.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create exam.");
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
      await refreshExams(selectedExam.id, created.id);
      setSubject("");
      setMaximumMarks("100");
      setMessage("Subject added to the exam.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add subject.");
    } finally {
      setSaving(false);
    }
  }

  async function submitMarks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSubject || students.some((student) => marks[student.id] === "" || marks[student.id] === undefined)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveExamMarks(selectedSubject.id, students.map((student) => ({
        studentId: student.id,
        obtainedMarks: Number(marks[student.id]),
      })));
      await refreshExams(selectedExam?.id, selectedSubject.id);
      setMessage("Marks saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save marks.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="module-card">
      <div className="section-heading">
        <div><p className="eyebrow">Academic results</p><h3>Exams &amp; marks</h3></div>
        <span className="status-pill">{definitions.length} school-wide exams</span>
      </div>
      <p className="muted">Add the school’s exam schedule once, then activate those exams for each section. Subjects and marks stay specific to each section.</p>
      <form className="module-form exam-create-form exam-parent-form" onSubmit={addSchoolExam}>
        <label className="module-field">School-wide exam name
          <input maxLength={100} onChange={(event) => setName(event.target.value)} placeholder="e.g. Term 1" required value={name} />
        </label>
        <label className="module-field">Academic year
          <input max="9999" min="2000" onChange={(event) => setAcademicYear(event.target.value)} required type="number" value={academicYear} />
        </label>
        <button className="secondary-button" disabled={saving} type="submit">{saving ? "Saving…" : "Add school-wide exam"}</button>
      </form>
      <SectionSelect sections={sections} value={sectionId} onChange={setSectionId} />
      {sectionError && <p className="form-error" role="alert">{sectionError}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      {sectionsLoading ? <p className="muted">Loading sections…</p> : !sections.length ? (
        <p className="class-empty">Create a class and section before setting up exams.</p>
      ) : !sectionId ? <p className="class-empty">Choose a section to manage its exams.</p> : (
        <>
          {availableDefinitions.length ? (
            <form className="module-form exam-create-form exam-parent-form" onSubmit={addExamToSection}>
              <label className="module-field">Available school-wide exam
                <select aria-label="Available school-wide exam" onChange={(event) => setSelectedDefinitionId(event.target.value ? Number(event.target.value) : null)} required value={selectedDefinitionId ?? ""}>
                  <option value="">Choose an exam</option>
                  {availableDefinitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.academicYear} · {definition.name}</option>)}
                </select>
              </label>
              <button className="secondary-button" disabled={saving || selectedDefinitionId === null} type="submit">{saving ? "Saving…" : "Add exam to section"}</button>
            </form>
          ) : <p className="class-empty">{definitions.length ? "All school-wide exams are already active for this section." : "Add a school-wide exam above before activating exams for a section."}</p>}
          {loading ? <p className="muted">Loading exams…</p> : !exams.length ? (
            <p className="class-empty">No exams have been created for this section.</p>
          ) : (
            <>
              <label className="module-field exam-select">Exam
                <select value={selectedExamId ?? ""} onChange={(event) => {
                  const nextExamId = Number(event.target.value);
                  const nextExam = exams.find((exam) => exam.id === nextExamId);
                  setSelectedExamId(nextExamId);
                  setSelectedSubjectId(nextExam?.subjects[0]?.id ?? null);
                }}>
                  {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.academicYear} · {exam.name}</option>)}
                </select>
              </label>
              {selectedExam && (
                <form className="module-form exam-create-form exam-subject-create-form" onSubmit={addSubject}>
                  <label className="module-field">Subject
                    <input maxLength={100} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Mathematics" required value={subject} />
                  </label>
                  <label className="module-field">Maximum marks
                    <input min="0.01" onChange={(event) => setMaximumMarks(event.target.value)} required step="0.01" type="number" value={maximumMarks} />
                  </label>
                  <button className="secondary-button" disabled={saving} type="submit">{saving ? "Saving…" : "Add subject"}</button>
                </form>
              )}
              {selectedExam && (
                selectedExam.subjects.length ? (
                <>
                  <label className="module-field exam-select">Subject
                    <select value={selectedSubjectId ?? ""} onChange={(event) => setSelectedSubjectId(Number(event.target.value))}>
                      {selectedExam.subjects.map((item) => <option key={item.id} value={item.id}>{item.subject} · {item.maximumMarks} marks</option>)}
                    </select>
                  </label>
                  {selectedSubject && <form onSubmit={submitMarks}>
                  <p className="exam-summary">{selectedExam.academicYear} · {selectedExam.name} · {selectedSubject.subject} · Maximum {selectedSubject.maximumMarks} marks</p>
                  {students.length ? (
                    <>
                      <div className="module-table-wrap">
                        <table className="module-table">
                          <thead><tr><th>Student</th><th>Score / {selectedSubject.maximumMarks}</th></tr></thead>
                          <tbody>{students.map((student) => (
                            <tr key={student.id}>
                              <td>{student.fullName}</td>
                              <td>
                                <input
                                  aria-label={`Marks for ${student.fullName}`}
                                  max={selectedSubject.maximumMarks}
                                  min="0"
                                  onChange={(event) => setMarks((current) => ({ ...current, [student.id]: event.target.value }))}
                                  required
                                  step="0.01"
                                  type="number"
                                  value={marks[student.id] ?? ""}
                                />
                              </td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                      <button className="secondary-button module-submit" disabled={saving} type="submit">{saving ? "Saving…" : "Save marks"}</button>
                    </>
                  ) : <p className="class-empty">Add students to this section before entering marks.</p>}
                </form>}
                </>
                ) : <p className="class-empty">Add subjects to this exam to enter marks.</p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
