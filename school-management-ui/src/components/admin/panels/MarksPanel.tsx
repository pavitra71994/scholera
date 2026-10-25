import { useEffect, useState, type FormEvent } from "react";
import { getExams, getPeople, saveExamMarks } from "../../../services/api";
import type { SchoolExam, SchoolPerson } from "../../../types/api";
import { useAdminSections } from "../../../hooks/useAdminSections";
import { SectionSelect } from "./SectionSelect";
import { DropdownSelect } from "../../shared/DropdownSelect";

export function MarksRegisterPanel() {
  const { sections, error: sectionError, loading: sectionsLoading } = useAdminSections();
  const [people, setPeople] = useState<SchoolPerson[]>([]);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [exams, setExams] = useState<SchoolExam[]>([]);
  const [examId, setExamId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPeople("STUDENT").then(setPeople).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Could not load students.");
    });
  }, []);

  useEffect(() => {
    if (sectionId === null) {
      setExams([]);
      setExamId(null);
      setSubjectId(null);
      return;
    }
    setLoading(true);
    getExams(sectionId)
      .then((items) => {
        setExams(items);
        setExamId(items[0]?.id ?? null);
        setSubjectId(items[0]?.subjects[0]?.id ?? null);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load exam marks."))
      .finally(() => setLoading(false));
  }, [sectionId]);

  const students = people.filter((person) => person.role === "STUDENT" && person.sectionId === sectionId);
  const selectedExam = exams.find((exam) => exam.id === examId) ?? null;
  const selectedSubject = selectedExam?.subjects.find((subject) => subject.id === subjectId) ?? null;

  useEffect(() => {
    if (!selectedSubject) {
      setScores({});
      return;
    }
    setScores(Object.fromEntries(students.map((student) => {
      const saved = selectedSubject.marks.find((mark) => mark.studentId === student.id);
      return [student.id, saved ? String(saved.obtainedMarks) : ""];
    })));
  }, [selectedSubject, students.length]);

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
      const updated = await getExams(sectionId!);
      setExams(updated);
      setMessage("Marks saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save marks.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="module-card">
      <div className="section-heading"><div><p className="eyebrow">Student scores</p><h3>Marks Register</h3></div></div>
      <p className="muted">Choose a class section, common exam, and subject to enter or update marks.</p>
      <SectionSelect sections={sections} value={sectionId} onChange={setSectionId} />
      {sectionError && <p className="form-error" role="alert">{sectionError}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      {sectionsLoading ? <p className="muted">Loading sections…</p> : sectionId === null ? null : loading ? (
        <p className="muted">Loading exams…</p>
      ) : exams.length ? (
        <>
          <DropdownSelect
            label="Exam"
            onChange={(value) => {
              const selected = exams.find((exam) => exam.id === Number(value)) ?? null;
              setExamId(selected?.id ?? null);
              setSubjectId(selected?.subjects[0]?.id ?? null);
            }}
            options={exams.map((exam) => ({ value: String(exam.id), label: `${exam.academicYear} · ${exam.name}` }))}
            value={examId === null ? "" : String(examId)}
            wrapperClassName="exam-select"
          />
          {selectedExam?.subjects.length ? (
            <>
              <DropdownSelect
                label="Subject"
                onChange={(value) => setSubjectId(Number(value))}
                options={selectedExam.subjects.map((subject) => ({
                  value: String(subject.id),
                  label: `${subject.subject} · ${subject.maximumMarks} marks`,
                }))}
                value={subjectId === null ? "" : String(subjectId)}
                wrapperClassName="exam-select"
              />
              {students.length && selectedSubject ? (
                <form className="marks-entry-form" onSubmit={submitMarks}>
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
                </form>
              ) : <p className="class-empty">No students are enrolled in this section.</p>}
            </>
          ) : <p className="class-empty">No subjects configured for this exam and section yet. Add them in admin Exam Setup.</p>}
        </>
      ) : <p className="class-empty">No exams or marks are configured for this section yet.</p>}
    </section>
  );
}
