import { Fragment, useEffect, useState } from "react";
import { getClassTeacherStudents, getTeacherRoster, updateClassTeacherStudent } from "../../../services/api";
import type { ClassTeacherStudent } from "../../../types/api";
import { useTeacherSections } from "../../../hooks/useTeacherSections";
import { SectionEmptyState, SectionPicker } from "./SectionPicker";

export function TeacherClassesPage() {
  const { sections, loading, error } = useTeacherSections();
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [students, setStudents] = useState<ClassTeacherStudent[] | null>(null);
  const [rosterError, setRosterError] = useState("");
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [studentFullName, setStudentFullName] = useState("");
  const [studentDateOfBirth, setStudentDateOfBirth] = useState("");
  const [studentMotherName, setStudentMotherName] = useState("");
  const [studentFatherName, setStudentFatherName] = useState("");
  const [studentEmergencyContact, setStudentEmergencyContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const currentSection = sections.find((section) => section.id === sectionId);

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
    const request = currentSection?.classTeacher
      ? getClassTeacherStudents(sectionId)
      : getTeacherRoster(sectionId).then((roster) => roster.map((student) => ({
        ...student,
        dateOfBirth: null,
        motherName: null,
        fatherName: null,
        emergencyContact: null,
      })));
    request
      .then(setStudents)
      .catch((cause: unknown) => setRosterError(cause instanceof Error ? cause.message : "Could not load this roster."));
  }, [currentSection?.classTeacher, sectionId]);

  async function saveStudent(studentId: number) {
    if (sectionId == null || !studentDateOfBirth) {
      setSaveError("Enter the student's date of birth.");
      return;
    }
    setSaving(true);
    setSaveError("");
    setSaveMessage("");
    try {
      const updated = await updateClassTeacherStudent(sectionId, studentId, {
        fullName: studentFullName.trim(),
        dateOfBirth: studentDateOfBirth,
        motherName: studentMotherName.trim(),
        fatherName: studentFatherName.trim(),
        emergencyContact: studentEmergencyContact.trim() || null,
      });
      setStudents((current) => current?.map((student) => student.id === studentId ? updated : student) ?? null);
      setEditingStudentId(null);
      setSaveMessage("Student profile saved.");
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Could not update student profile.");
    } finally {
      setSaving(false);
    }
  }

  function editStudent(student: ClassTeacherStudent) {
    setEditingStudentId(student.id);
    setStudentFullName(student.fullName);
    setStudentDateOfBirth(student.dateOfBirth ?? "");
    setStudentMotherName(student.motherName ?? "");
    setStudentFatherName(student.fatherName ?? "");
    setStudentEmergencyContact(student.emergencyContact ?? "");
    setSaveError("");
    setSaveMessage("");
  }

  return (
    <section className="teacher-panel">
      <div className="section-heading"><div><p className="eyebrow">Teaching groups</p><h3>My Classes &amp; Roster</h3></div></div>
      <p className="muted">Student names and roll numbers for your assigned sections. Class teachers can review and update student profiles in their own section.</p>
      <SectionEmptyState error={error} loading={loading} sections={sections} />
      {!loading && !error && sections.length > 0 && (
        <>
          <SectionPicker onChange={setSectionId} sections={sections} selected={sectionId} />
          {currentSection && <h4 className="teacher-section-title">{currentSection.className} · {currentSection.name}</h4>}
          {rosterError && <p className="form-error" role="alert">{rosterError}</p>}
          {saveError && <p className="form-error" role="alert">{saveError}</p>}
          {saveMessage && <p className="success-message" role="status">{saveMessage}</p>}
          {!students && !rosterError ? <p className="muted">Loading roster…</p> : students?.length ? (
            <div className="module-table-wrap">
              <table className="module-table">
                <thead><tr>
                  <th>Roll no.</th><th>Student</th>
                  {currentSection?.classTeacher && <><th>Date of birth</th><th>Parent / guardian</th><th>Emergency contact</th><th>Profile</th></>}
                </tr></thead>
                <tbody>{students.map((student) => (
                  <Fragment key={student.id}>
                    <tr>
                      <td>{student.rollNumber ?? "—"}</td>
                      <td>{student.fullName}</td>
                      {currentSection?.classTeacher && (
                        <>
                          <td>{student.dateOfBirth || "—"}</td>
                          <td>{[student.motherName, student.fatherName].filter(Boolean).join(" / ") || "—"}</td>
                          <td>{student.emergencyContact || "—"}</td>
                          <td>
                            <button
                              className="quiet-button"
                              onClick={() => editingStudentId === student.id ? setEditingStudentId(null) : editStudent(student)}
                              type="button"
                            >{editingStudentId === student.id ? "Close" : "Edit"}</button>
                          </td>
                        </>
                      )}
                    </tr>
                    {currentSection?.classTeacher && editingStudentId === student.id && (
                      <tr>
                        <td colSpan={6}>
                          <div className="assignment-editor">
                            <label className="module-field">Full name
                              <input maxLength={160} onChange={(event) => setStudentFullName(event.target.value)} required value={studentFullName} />
                            </label>
                            <label className="module-field">Date of birth
                              <input max={new Date().toISOString().slice(0, 10)} onChange={(event) => setStudentDateOfBirth(event.target.value)} required type="date" value={studentDateOfBirth} />
                            </label>
                            <label className="module-field">Mother’s name
                              <input maxLength={160} onChange={(event) => setStudentMotherName(event.target.value)} required value={studentMotherName} />
                            </label>
                            <label className="module-field">Father’s name
                              <input maxLength={160} onChange={(event) => setStudentFatherName(event.target.value)} required value={studentFatherName} />
                            </label>
                            <label className="module-field">Emergency contact
                              <input maxLength={40} onChange={(event) => setStudentEmergencyContact(event.target.value)} value={studentEmergencyContact} />
                            </label>
                            <button className="quiet-button" disabled={saving} onClick={() => void saveStudent(student.id)} type="button">
                              {saving ? "Saving…" : "Save profile"}
                            </button>
                            <button className="text-button" onClick={() => setEditingStudentId(null)} type="button">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}</tbody>
              </table>
            </div>
          ) : students ? <p className="class-empty">No students are enrolled in this section yet.</p> : null}
        </>
      )}
    </section>
  );
}
