import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createExam, getExams, getTeacherRoster, saveExamMarks } from "../../../services/api";
import type { SchoolExam, TeacherStudent } from "../../../types/api";
import { useTeacherSections } from "../../../hooks/useTeacherSections";
import { SectionEmptyState, SectionPicker } from "./SectionPicker";

export function TeacherExamsPage() {
  const { sections, loading: sectionsLoading, error: sectionsError } = useTeacherSections();
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [exams, setExams] = useState<SchoolExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [name, setName] = useState("");
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

  useEffect(() => {
    if (!sections.length) return;
    setSectionId((selected) => selected && sections.some((section) => section.id === selected) ? selected : sections[0].id);
  }, [sections]);

  async function refresh(section: number, selectedId?: number) {
    const [roster, items] = await Promise.all([getTeacherRoster(section), getExams(section)]);
    setStudents(roster);
    setExams(items);
    setSelectedExamId(selectedId ?? items[0]?.id ?? null);
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
    if (!selectedExam) {
      setScores({});
      return;
    }
    setScores(Object.fromEntries(students.map((student) => {
      const existing = selectedExam.marks.find((mark) => mark.studentId === student.id);
      return [student.id, existing ? String(existing.obtainedMarks) : ""];
    })));
  }, [selectedExam, students]);

  async function addExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sectionId == null) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const created = await createExam({
        sectionId,
        name: name.trim(),
        subject: subject.trim(),
        maximumMarks: Number(maximumMarks),
      });
      await refresh(sectionId, created.id);
      setName("");
      setSubject("");
      setMaximumMarks("100");
      setMessage("Exam added.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create exam.");
    } finally {
      setSaving(false);
    }
  }

  async function submitMarks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedExam || students.some((student) => scores[student.id] == null || scores[student.id] === "")) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveExamMarks(selectedExam.id, students.map((student) => ({
        studentId: student.id,
        obtainedMarks: Number(scores[student.id]),
      })));
      if (sectionId != null) await refresh(sectionId, selectedExam.id);
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
      <p className="muted">Create section exams and enter or update marks for your students.</p>
      <SectionEmptyState error={sectionsError} loading={sectionsLoading} sections={sections} />
      {!sectionsLoading && !sectionsError && sections.length > 0 && (
        <>
          <SectionPicker onChange={setSectionId} sections={sections} selected={sectionId} />
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="success-message" role="status">{message}</p>}
          {loading ? <p className="muted">Loading exams and roster…</p> : (
            <>
              <form className="module-form exam-create-form" onSubmit={addExam}>
                <label className="module-field">Exam name
                  <input maxLength={100} onChange={(event) => setName(event.target.value)} required value={name} />
                </label>
                <label className="module-field">Subject
                  <input maxLength={100} onChange={(event) => setSubject(event.target.value)} required value={subject} />
                </label>
                <label className="module-field">Maximum marks
                  <input min="0.01" onChange={(event) => setMaximumMarks(event.target.value)} required step="0.01" type="number" value={maximumMarks} />
                </label>
                <button className="secondary-button" disabled={saving} type="submit">{saving ? "Saving…" : "Add exam"}</button>
              </form>
              {!students.length && <p className="class-empty">No students are enrolled in this section yet.</p>}
              {exams.length > 0 && (
                <label className="module-field teacher-exam-select">Exam
                  <select onChange={(event) => setSelectedExamId(event.target.value ? Number(event.target.value) : null)} value={selectedExamId ?? ""}>
                    {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name} · {exam.subject}</option>)}
                  </select>
                </label>
              )}
              {selectedExam && students.length > 0 && (
                <form onSubmit={submitMarks}>
                  <p className="muted">Maximum marks: {selectedExam.maximumMarks}</p>
                  <div className="module-table-wrap">
                    <table className="module-table">
                      <thead><tr><th>Student</th><th>Marks</th></tr></thead>
                      <tbody>{students.map((student) => (
                        <tr key={student.id}>
                          <td>{student.fullName}</td>
                          <td><input
                            aria-label={`Marks for ${student.fullName}`}
                            max={selectedExam.maximumMarks}
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
                </form>
              )}
              {!exams.length && students.length > 0 && <p className="class-empty">No exams have been created for this section yet.</p>}
            </>
          )}
        </>
      )}
    </section>
  );
}
