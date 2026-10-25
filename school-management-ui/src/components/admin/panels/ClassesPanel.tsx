import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  assignClassTeacher,
  assignSubjectTeacher,
  createClass,
  createSection,
  deleteSection,
  getClassDirectory,
  getClasses,
  getPeople,
} from "../../../services/api";
import type { ClassDirectory, SchoolClass, SchoolPerson } from "../../../types/api";
import { DropdownSelect } from "../../shared/DropdownSelect";

export function ClassesPanel() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedSection, setSelectedSection] = useState<{ classId: number; sectionId: number } | null>(null);
  const [classDirectories, setClassDirectories] = useState<Record<number, ClassDirectory>>({});
  const [teachers, setTeachers] = useState<SchoolPerson[]>([]);
  const [classTeacherSelections, setClassTeacherSelections] = useState<Record<number, string>>({});
  const [subjectTeacherSelections, setSubjectTeacherSelections] = useState<Record<number, string>>({});
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState("");
  const [className, setClassName] = useState("");
  const [sectionNames, setSectionNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refreshClasses() {
    setClasses(await getClasses());
  }

  async function refreshClassDirectory(classId: number) {
    const directory = await getClassDirectory(classId);
    setClassDirectories((current) => ({ ...current, [classId]: directory }));
    setClassTeacherSelections((current) => {
      const next = { ...current };
      directory.sections.forEach((section) => {
        next[section.id] = section.classTeacher ? String(section.classTeacher.id) : "";
      });
      return next;
    });
    setSubjectTeacherSelections((current) => {
      const next = { ...current };
      directory.sections.forEach((section) => {
        section.subjects.forEach((subject) => {
          next[subject.id] = subject.teacher ? String(subject.teacher.id) : "";
        });
      });
      return next;
    });
    return directory;
  }

  useEffect(() => {
    Promise.all([getClasses(), getPeople("TEACHER")])
      .then(([classList, teacherList]) => {
        setClasses(classList);
        setTeachers(teacherList);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load classes."))
      .finally(() => setLoading(false));
  }, []);

  async function addClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await createClass(className.trim());
      setClassName("");
      await refreshClasses();
      setMessage("Class added.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add class.");
    } finally {
      setBusy(false);
    }
  }

  async function addSection(event: FormEvent<HTMLFormElement>, schoolClass: SchoolClass) {
    event.preventDefault();
    const name = (sectionNames[schoolClass.id] ?? "").trim();
    if (!name) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await createSection(schoolClass.id, name);
      setSectionNames((current) => ({ ...current, [schoolClass.id]: "" }));
      await refreshClasses();
      if (classDirectories[schoolClass.id]) await refreshClassDirectory(schoolClass.id);
      setMessage(`Section added to ${schoolClass.name}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add section.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSection(schoolClass: SchoolClass, sectionId: number) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await deleteSection(schoolClass.id, sectionId);
      await refreshClasses();
      if (classDirectories[schoolClass.id]) await refreshClassDirectory(schoolClass.id);
      if (selectedSection?.sectionId === sectionId) setSelectedSection(null);
      setMessage("Section removed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove section.");
    } finally {
      setBusy(false);
    }
  }

  async function openSection(schoolClass: SchoolClass, sectionId: number) {
    setSelectedSection({ classId: schoolClass.id, sectionId });
    setDirectoryError("");
    if (classDirectories[schoolClass.id]) return;
    setDirectoryLoading(true);
    try {
      await refreshClassDirectory(schoolClass.id);
    } catch (cause) {
      setDirectoryError(cause instanceof Error ? cause.message : "Could not load this section.");
    } finally {
      setDirectoryLoading(false);
    }
  }

  async function saveClassTeacher(schoolClass: SchoolClass, sectionId: number) {
    const selectedId = classTeacherSelections[sectionId] ?? "";
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await assignClassTeacher(schoolClass.id, sectionId, selectedId ? Number(selectedId) : null);
      await refreshClassDirectory(schoolClass.id);
      setMessage(`Class teacher updated for ${schoolClass.name}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not assign the class teacher.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSubjectTeacher(
    schoolClass: SchoolClass,
    sectionId: number,
    subjectId: number,
  ) {
    const selectedId = subjectTeacherSelections[subjectId] ?? "";
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await assignSubjectTeacher(schoolClass.id, sectionId, subjectId, selectedId ? Number(selectedId) : null);
      await refreshClassDirectory(schoolClass.id);
      setMessage("Subject teacher updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not assign the subject teacher.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="classes-card" id="classes-sections">
      <div className="section-heading">
        <div><p className="eyebrow">Academic setup</p><h3>Classes &amp; sections</h3></div>
        <span className="status-pill">Administration</span>
      </div>
      <p className="muted">{selectedSection
        ? "Review the student roster and manage teacher assignments for this section."
        : "Create classes and sections. Select a section to view its roster and manage its teachers."}</p>
      {!selectedSection && <form className="class-create-form" onSubmit={addClass}>
        <label>
          Class name
          <input
            aria-label="Class name"
            maxLength={100}
            onChange={(event) => setClassName(event.target.value)}
            placeholder="e.g. Grade 1"
            required
            value={className}
          />
        </label>
        <button className="secondary-button" disabled={busy} type="submit">{busy ? "Saving…" : "Add class"}</button>
      </form>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      {selectedSection ? (
        (() => {
          const schoolClass = classes.find(({ id }) => id === selectedSection.classId);
          const section = classDirectories[selectedSection.classId]?.sections
            .find(({ id }) => id === selectedSection.sectionId);
          if (directoryLoading) return <p className="muted">Loading section roster…</p>;
          if (directoryError) return <div>
            <p className="form-error" role="alert">{directoryError}</p>
            <button className="quiet-button" onClick={() => setSelectedSection(null)} type="button">Back to classes &amp; sections</button>
          </div>;
          if (!schoolClass || !section) return <div>
            <p className="class-empty">This section could not be found.</p>
            <button className="quiet-button" onClick={() => setSelectedSection(null)} type="button">Back to classes &amp; sections</button>
          </div>;
          return (
            <article className="class-directory section-detail-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{schoolClass.name}</p>
                  <h4>{schoolClass.name} · Section {section.name}</h4>
                </div>
                <button className="quiet-button" onClick={() => setSelectedSection(null)} type="button">
                  Back to classes &amp; sections
                </button>
              </div>
              <p className="muted">Manage the class teacher and subject teachers, and review every student in this section.</p>
              <div className="class-teacher-assignment">
                <DropdownSelect
                  label={`Class teacher for ${schoolClass.name} ${section.name}`}
                  onChange={(value) => setClassTeacherSelections((current) => ({
                    ...current,
                    [section.id]: value,
                  }))}
                  options={[
                    { value: "", label: "Unassigned" },
                    ...teachers.map((teacher) => ({ value: String(teacher.id), label: teacher.fullName })),
                  ]}
                  value={classTeacherSelections[section.id] ?? ""}
                />
                <button className="quiet-button" disabled={busy} onClick={() => void saveClassTeacher(schoolClass, section.id)} type="button">
                  Save class teacher
                </button>
                <p className="muted">The class teacher can access this section.</p>
              </div>
              <div className="class-subject-teachers">
                <h5>Subject teachers</h5>
                {section.subjects.length ? (
                  <ul className="directory-list">{section.subjects.map((subject) => {
                    const experts = teachers.filter((teacher) =>
                      teacher.subjectExpertise?.some((expertise) => expertise.toLocaleLowerCase() === subject.subject.toLocaleLowerCase()),
                    );
                    return (
                      <li className="class-subject-teacher" key={subject.id}>
                        <span>{subject.subject}</span>
                        <DropdownSelect
                          disabled={!experts.length || busy}
                          hideLabel
                          label={`Teacher for ${schoolClass.name} ${section.name} ${subject.subject}`}
                          onChange={(teacherId) => setSubjectTeacherSelections((current) => ({
                            ...current,
                            [subject.id]: teacherId,
                          }))}
                          options={[
                            { value: "", label: "Unassigned" },
                            ...experts.map((teacher) => ({ value: String(teacher.id), label: teacher.fullName })),
                          ]}
                          value={subjectTeacherSelections[subject.id] ?? ""}
                          wrapperClassName="class-subject-teacher-select"
                        />
                        <button
                          aria-label={`Save teacher for ${schoolClass.name} ${section.name} ${subject.subject}`}
                          className="quiet-button"
                          disabled={!experts.length || busy}
                          onClick={() => void saveSubjectTeacher(schoolClass, section.id, subject.id)}
                          type="button"
                        >Save teacher</button>
                        {!experts.length && <small>No teacher has matching subject expertise.</small>}
                      </li>
                    );
                  })}</ul>
                ) : <p className="class-empty">Add subjects in Exam Setup before assigning subject teachers.</p>}
              </div>
              <div className="class-directory-columns section-roster">
                <details className="student-roster-accordion">
                  <summary>
                    <span>Student roster</span>
                    <span className="status-pill">{section.students.length} {section.students.length === 1 ? "student" : "students"}</span>
                  </summary>
                  {section.students.length ? (
                    <ul className="directory-list">{section.students.map((student) => (
                      <li key={student.id}>{student.rollNumber == null ? "" : `#${student.rollNumber} · `}{student.fullName}</li>
                    ))}</ul>
                  ) : <p className="class-empty">No students in this section.</p>}
                </details>
                <div>
                  <h5>Teachers assigned to this section</h5>
                  {section.teachers.length ? (
                    <ul className="directory-list">{section.teachers.map((teacher) => (
                      <li key={teacher.id}>{teacher.fullName}</li>
                    ))}</ul>
                  ) : <p className="class-empty">No teachers assigned to this section.</p>}
                </div>
              </div>
            </article>
          );
        })()
      ) : loading ? <p className="muted">Loading classes…</p> : error && classes.length === 0 ? null : classes.length ? (
        <div className="class-list">
          {classes.map((schoolClass) => (
            <article className="class-item" key={schoolClass.id}>
              <div className="class-item-header">
                <div>
                  <h4>{schoolClass.name}</h4>
                  <p className="muted">{schoolClass.sections.length} {schoolClass.sections.length === 1 ? "section" : "sections"}</p>
                </div>
                <div className="class-actions">
                  <form className="section-create-form" onSubmit={(event) => addSection(event, schoolClass)}>
                  <label className="visually-hidden" htmlFor={`section-${schoolClass.id}`}>Section name for {schoolClass.name}</label>
                  <input
                    id={`section-${schoolClass.id}`}
                    maxLength={40}
                    onChange={(event) => setSectionNames((current) => ({ ...current, [schoolClass.id]: event.target.value }))}
                    placeholder="Section name"
                    required
                    value={sectionNames[schoolClass.id] ?? ""}
                  />
                  <button className="secondary-button" disabled={busy} type="submit">Add section</button>
                  </form>
                </div>
              </div>
              {schoolClass.sections.length ? (
                <ul className="section-list">
                  {schoolClass.sections.map((section) => (
                    <li className="section-chip" key={section.id}>
                      <button
                        className="section-open-button"
                        onClick={() => void openSection(schoolClass, section.id)}
                        type="button"
                      >{section.name}</button>
                      <button
                        aria-label={`Remove section ${section.name} from ${schoolClass.name}`}
                        className="section-remove-button"
                        disabled={busy}
                        onClick={() => removeSection(schoolClass, section.id)}
                        type="button"
                      >×</button>
                    </li>
                  ))}
                </ul>
              ) : <p className="class-empty">No sections yet. Add one to organize this class.</p>}
            </article>
          ))}
        </div>
      ) : (
        <p className="class-empty">No classes yet. Add your first class above.</p>
      )}
    </section>
  );
}
