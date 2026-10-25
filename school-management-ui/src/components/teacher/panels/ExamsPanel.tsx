import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  createExam,
  createExamSubject,
  getExams,
  getSchoolExamDefinitions,
  getTeacherRoster,
  saveExamMarks,
} from "../../../services/api";
import type { SchoolExam, SchoolExamDefinition, TeacherStudent } from "../../../types/api";
import { useTeacherSections } from "../../../hooks/useTeacherSections";
import { SectionEmptyState, SectionPicker } from "./SectionPicker";

export function TeacherExamsPage() {
  const { sections, loading: sectionsLoading, error: sectionsError } = useTeacherSections();
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [definitions, setDefinitions] = useState<SchoolExamDefinition[]>([]);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<number | null>(null);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [exams, setExams] = useState<SchoolExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [maximumMarks, setMaximumMarks] = useState("100");
  const [scores, setScores] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectedExam = useMemo(
    () => exams.find((exam) => exam.id === selectedExamId) ?? null,
    [exams, selectedExamId],
  );
  const availableDefinitions = definitions.filter(
    (definition) => !exams.some((exam) => exam.examDefinitionId === definition.id),
  );
  const selectedSubject = useMemo(
    () => selectedExam?.subjects.find((item) => item.id === selectedSubjectId) ?? null,
    [selectedExam, selectedSubjectId],
  );

  useEffect(() => {
    if (!sections.length) return;
    setSectionId((selected) => selected && sections.some((section) => section.id === selected) ? selected : sections[0].id);
  }, [sections]);

  useEffect(() => {
    if (!availableDefinitions.some((definition) => definition.id === selectedDefinitionId)) {
      setSelectedDefinitionId(availableDefinitions[0]?.id ?? null);
    }
  }, [availableDefinitions, selectedDefinitionId]);

  useEffect(() => {
    getSchoolExamDefinitions().then((items) => {
      setDefinitions(items);
      setSelectedDefinitionId(items[0]?.id ?? null);
    }).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Could not load school-wide exams.");
    });
  }, []);

  async function refresh(section: number, selectedId?: number, selectedSubject?: number) {
    const [roster, items] = await Promise.all([getTeacherRoster(section), getExams(section)]);
    setStudents(roster);
    setExams(items);
    setSelectedExamId(selectedId ?? items[0]?.id ?? null);
    const nextExam = items.find((exam) => exam.id === (selectedId ?? items[0]?.id));
    setSelectedSubjectId(selectedSubject ?? nextExam?.subjects[0]?.id ?? null);
    setScores({});
  }

  useEffect(() => {
    if (sectionId == null) {
      setExams([]);
      setStudents([]);
      setSelectedExamId(null);
      return;
    }
    setLoading(true);
    setError("");
    refresh(sectionId).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Could not load section exams.");
    }).finally(() => setLoading(false));
  }, [sectionId]);

  useEffect(() => {
    if (!selectedSubject) {
      setScores({});
      return;
    }
    setScores(Object.fromEntries(students.map((student) => {
      const existing = selectedSubject.marks.find((mark) => mark.studentId === student.id);
      return [student.id, existing ? String(existing.obtainedMarks) : ""];
    })));
  }, [selectedSubject, students]);

  async function addExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sectionId == null || selectedDefinitionId == null
      || !availableDefinitions.some((definition) => definition.id === selectedDefinitionId)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const created = await createExam({
        sectionId,
        examDefinitionId: selectedDefinitionId,
      });
      await refresh(sectionId, created.id);
      setMessage("Exam added.");
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
      if (sectionId != null) await refresh(sectionId, selectedExam.id, created.id);
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
    if (!selectedSubject || students.some((student) => scores[student.id] == null || scores[student.id] === "")) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveExamMarks(selectedSubject.id, students.map((student) => ({
        studentId: student.id,
        obtainedMarks: Number(scores[student.id]),
      })));
      if (sectionId != null) await refresh(sectionId, selectedExam?.id, selectedSubject.id);
      setMessage("Marks saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save marks.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="teacher-panel">
      <div className="section-heading"><div><p className="eyebrow">Academic results</p><h3>Exams &amp; Marks</h3></div></div>
      <p className="muted">Activate school-wide exams for your assigned sections, add subjects with their maximum marks, and record student scores.</p>
      <SectionEmptyState error={sectionsError} loading={sectionsLoading} sections={sections} />
      {!sectionsLoading && !sectionsError && sections.length > 0 && (
        <>
          <SectionPicker onChange={setSectionId} sections={sections} selected={sectionId} />
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="success-message" role="status">{message}</p>}
          {loading ? <p className="muted">Loading exams and roster…</p> : (
            <>
              {availableDefinitions.length ? (
                <form className="module-form exam-create-form exam-parent-form" onSubmit={addExam}>
                  <label className="module-field">Available school-wide exam
                    <select aria-label="Available school-wide exam" onChange={(event) => setSelectedDefinitionId(event.target.value ? Number(event.target.value) : null)} required value={selectedDefinitionId ?? ""}>
                      <option value="">Choose an exam</option>
                      {availableDefinitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.academicYear} · {definition.name}</option>)}
                    </select>
                  </label>
                  <button className="secondary-button" disabled={saving || selectedDefinitionId === null} type="submit">{saving ? "Saving…" : "Add exam to section"}</button>
                </form>
              ) : <p className="class-empty">{definitions.length ? "All school-wide exams are already active for this section." : "Ask an administrator to add school-wide exams first."}</p>}
              {!students.length && <p className="class-empty">No students are enrolled in this section yet.</p>}
              {exams.length > 0 && (
                <label className="module-field teacher-exam-select">Exam
                  <select onChange={(event) => {
                    const examId = event.target.value ? Number(event.target.value) : null;
                    const exam = exams.find((item) => item.id === examId);
                    setSelectedExamId(examId);
                    setSelectedSubjectId(exam?.subjects[0]?.id ?? null);
                  }} value={selectedExamId ?? ""}>
                    {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.academicYear} · {exam.name}</option>)}
                  </select>
                </label>
              )}
              {selectedExam && (
                <form className="module-form exam-create-form exam-subject-create-form" onSubmit={addSubject}>
                  <label className="module-field">Subject
                    <input maxLength={100} onChange={(event) => setSubject(event.target.value)} required value={subject} />
                  </label>
                  <label className="module-field">Maximum marks
                    <input min="0.01" onChange={(event) => setMaximumMarks(event.target.value)} required step="0.01" type="number" value={maximumMarks} />
                  </label>
                  <button className="secondary-button" disabled={saving} type="submit">{saving ? "Saving…" : "Add subject"}</button>
                </form>
              )}
              {selectedExam && selectedExam.subjects.length > 0 && (
                <>
                <label className="module-field teacher-exam-select">Subject
                  <select onChange={(event) => setSelectedSubjectId(event.target.value ? Number(event.target.value) : null)} value={selectedSubjectId ?? ""}>
                    {selectedExam.subjects.map((item) => <option key={item.id} value={item.id}>{item.subject} · {item.maximumMarks} marks</option>)}
                  </select>
                </label>
                {selectedSubject && students.length > 0 && <form onSubmit={submitMarks}>
                  <p className="muted">{selectedExam.academicYear} · {selectedExam.name} · Maximum marks: {selectedSubject.maximumMarks}</p>
                  <div className="module-table-wrap">
                    <table className="module-table">
                      <thead><tr><th>Student</th><th>Score / {selectedSubject.maximumMarks}</th></tr></thead>
                      <tbody>{students.map((student) => (
                        <tr key={student.id}>
                          <td>{student.fullName}</td>
                          <td><input
                            aria-label={`Marks for ${student.fullName}`}
                            max={selectedSubject.maximumMarks}
                            min="0"
                            onChange={(event) => setScores((current) => ({ ...current, [student.id]: event.target.value }))}
                            required
                            step="0.01"
                            type="number"
                            value={scores[student.id] ?? ""}
                          /></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  <button className="secondary-button module-submit" disabled={saving} type="submit">{saving ? "Saving…" : "Save marks"}</button>
                </form>}
                </>
              )}
              {selectedExam && !selectedExam.subjects.length && <p className="class-empty">Add a subject to this exam before entering marks.</p>}
              {!exams.length && students.length > 0 && definitions.length > 0 && <p className="class-empty">No exams have been activated for this section yet.</p>}
            </>
          )}
        </>
      )}
    </section>
  );
}
