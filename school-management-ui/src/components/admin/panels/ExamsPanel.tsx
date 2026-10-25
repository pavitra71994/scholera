import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createExam, getExams, getPeople, saveExamMarks } from "../../../services/api";
import type { SchoolExam, SchoolPerson } from "../../../types/api";
import { useAdminSections } from "../../../hooks/useAdminSections";
import { SectionSelect } from "./SectionSelect";

export function ExamsManagement() {
  const { sections, error: sectionError, loading: sectionsLoading } = useAdminSections();
  const [people, setPeople] = useState<SchoolPerson[]>([]);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [exams, setExams] = useState<SchoolExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [name, setName] = useState("");
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
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load exams."))
      .finally(() => setLoading(false));
  }, [sectionId]);

  const students = people.filter((person) => person.role === "STUDENT" && person.sectionId === sectionId);
  const selectedExam = exams.find((exam) => exam.id === selectedExamId) ?? null;

  useEffect(() => {
    if (!selectedExam) {
      setMarks({});
      return;
    }
    setMarks(Object.fromEntries(students.map((student) => {
      const saved = selectedExam.marks.find((mark) => mark.studentId === student.id);
      return [student.id, saved ? String(saved.obtainedMarks) : ""];
    })));
  }, [selectedExamId, students.length, exams]);

  async function refreshExams(selectId?: number) {
    if (!sectionId) return;
    const items = await getExams(sectionId);
    setExams(items);
    setSelectedExamId(selectId ?? items[0]?.id ?? null);
  }

  async function addExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sectionId) return;
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
      await refreshExams(created.id);
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
    if (!selectedExam || students.some((student) => marks[student.id] === "" || marks[student.id] === undefined)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await saveExamMarks(selectedExam.id, students.map((student) => ({
        studentId: student.id,
        obtainedMarks: Number(marks[student.id]),
      })));
      await refreshExams(selectedExam.id);
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
        <span className="status-pill">{exams.length} exams</span>
      </div>
      <p className="muted">Create exams by section and subject, then record each student’s numeric score.</p>
      <SectionSelect sections={sections} value={sectionId} onChange={setSectionId} />
      {sectionError && <p className="form-error" role="alert">{sectionError}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      {sectionsLoading ? <p className="muted">Loading sections…</p> : !sections.length ? (
        <p className="class-empty">Create a class and section before setting up exams.</p>
      ) : !sectionId ? <p className="class-empty">Choose a section to manage its exams.</p> : (
        <>
          <form className="module-form exam-create-form" onSubmit={addExam}>
            <label className="module-field">Exam name
              <input maxLength={100} onChange={(event) => setName(event.target.value)} placeholder="e.g. Term 1" required value={name} />
            </label>
            <label className="module-field">Subject
              <input maxLength={100} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Mathematics" required value={subject} />
            </label>
            <label className="module-field">Maximum marks
              <input min="0.01" onChange={(event) => setMaximumMarks(event.target.value)} required step="0.01" type="number" value={maximumMarks} />
            </label>
            <button className="secondary-button" disabled={saving} type="submit">{saving ? "Saving…" : "Add exam"}</button>
          </form>
          {loading ? <p className="muted">Loading exams…</p> : !exams.length ? (
            <p className="class-empty">No exams have been created for this section.</p>
          ) : (
            <>
              <label className="module-field exam-select">Exam and subject
                <select value={selectedExamId ?? ""} onChange={(event) => setSelectedExamId(Number(event.target.value))}>
                  {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name} · {exam.subject}</option>)}
                </select>
              </label>
              {selectedExam && (
                <form onSubmit={submitMarks}>
                  <p className="exam-summary">{selectedExam.subject} · Maximum {selectedExam.maximumMarks} marks</p>
                  {students.length ? (
                    <>
                      <div className="module-table-wrap">
                        <table className="module-table">
                          <thead><tr><th>Student</th><th>Score / {selectedExam.maximumMarks}</th></tr></thead>
                          <tbody>{students.map((student) => (
                            <tr key={student.id}>
                              <td>{student.fullName}</td>
                              <td>
                                <input
                                  aria-label={`Marks for ${student.fullName}`}
                                  max={selectedExam.maximumMarks}
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
                </form>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
