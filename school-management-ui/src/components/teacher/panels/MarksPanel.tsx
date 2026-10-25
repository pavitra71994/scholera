import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getExams, getTeacherRoster, saveExamMarks } from "../../../services/api";
import type { SchoolExam, TeacherStudent } from "../../../types/api";
import { useTeacherSections } from "../../../hooks/useTeacherSections";
import { SectionEmptyState, SectionPicker } from "./SectionPicker";

export function TeacherMarksPage() {
  const { sections, loading: sectionsLoading, error: sectionsError } = useTeacherSections();
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [exams, setExams] = useState<SchoolExam[]>([]);
  const [examId, setExamId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedExam = useMemo(() => exams.find((exam) => exam.id === examId) ?? null, [exams, examId]);
  const selectedSubject = selectedExam?.subjects.find((subject) => subject.id === subjectId) ?? null;

  useEffect(() => {
    if (!sections.length) return;
    setSectionId((current) => current && sections.some((section) => section.id === current) ? current : sections[0].id);
  }, [sections]);

  useEffect(() => {
    if (sectionId === null) {
      setExams([]);
      setStudents([]);
      setExamId(null);
      setSubjectId(null);
      return;
    }
    setLoading(true);
    Promise.all([getExams(sectionId), getTeacherRoster(sectionId)])
      .then(([examList, roster]) => {
        setExams(examList);
        setStudents(roster);
        setExamId(examList[0]?.id ?? null);
        setSubjectId(examList[0]?.subjects[0]?.id ?? null);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load the marks register."))
      .finally(() => setLoading(false));
  }, [sectionId]);

  useEffect(() => {
    if (!selectedSubject) {
      setScores({});
      return;
    }
    setScores(Object.fromEntries(students.map((student) => {
      const saved = selectedSubject.marks.find((mark) => mark.studentId === student.id);
      return [student.id, saved ? String(saved.obtainedMarks) : ""];
    })));
  }, [selectedSubject, students]);

  async function submitMarks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSubject || students.some((student) => !scores[student.id])) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveExamMarks(selectedSubject.id, students.map((student) => ({
        studentId: student.id,
        obtainedMarks: Number(scores[student.id]),
      })));
      const [updatedExams] = await Promise.all([getExams(sectionId!)]);
      setExams(updatedExams);
      setMessage("Marks saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save marks.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="teacher-panel">
      <div className="section-heading"><div><p className="eyebrow">Student scores</p><h3>Marks Register</h3></div></div>
      <p className="muted">Choose an assigned section, common exam, and subject to enter or update marks.</p>
      <SectionEmptyState error={sectionsError} loading={sectionsLoading} sections={sections} />
      {!sectionsLoading && !sectionsError && sections.length > 0 && (
        <>
          <SectionPicker onChange={setSectionId} sections={sections} selected={sectionId} />
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="success-message" role="status">{message}</p>}
          {loading ? <p className="muted">Loading exam register…</p> : exams.length ? (
            <>
              <label className="module-field exam-select">Exam
                <select aria-label="Exam" onChange={(event) => {
                  const exam = exams.find((item) => item.id === Number(event.target.value)) ?? null;
                  setExamId(exam?.id ?? null);
                  setSubjectId(exam?.subjects[0]?.id ?? null);
                }} value={examId ?? ""}>
                  {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.academicYear} · {exam.name}</option>)}
                </select>
              </label>
              {selectedExam?.subjects.length ? (
                <>
                  <label className="module-field exam-select">Subject
                    <select aria-label="Subject" onChange={(event) => setSubjectId(Number(event.target.value))} value={subjectId ?? ""}>
                      {selectedExam.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.subject} · {subject.maximumMarks} marks</option>)}
                    </select>
                  </label>
                  {selectedSubject && students.length ? <form onSubmit={submitMarks}>
                    <div className="module-table-wrap">
                      <table className="module-table">
                        <thead><tr><th>Student</th><th>Score / {selectedSubject.maximumMarks}</th></tr></thead>
                        <tbody>{students.map((student) => <tr key={student.id}>
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
                        </tr>)}</tbody>
                      </table>
                    </div>
                    <button className="secondary-button module-submit" disabled={saving} type="submit">{saving ? "Saving…" : "Save marks"}</button>
                  </form> : <p className="class-empty">No students are enrolled in this section.</p>}
                </>
              ) : <p className="class-empty">No subjects are configured for this exam. Add them in Exam Setup.</p>}
            </>
          ) : <p className="class-empty">No exams are available for this section yet.</p>}
        </>
      )}
    </section>
  );
}
