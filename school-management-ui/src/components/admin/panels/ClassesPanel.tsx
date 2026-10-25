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
  const [openClassId, setOpenClassId] = useState<number | null>(null);
  const [classDirectories, setClassDirectories] = useState<Record<number, ClassDirectory>>({});
  const [teachers, setTeachers] = useState<SchoolPerson[]>([]);
  const [classTeacherSelections, setClassTeacherSelections] = useState<Record<number, string>>({});
  const [directoryLoading, setDirectoryLoading] = useState<number | null>(null);
  const [directoryErrors, setDirectoryErrors] = useState<Record<number, string>>({});
  const [className, setClassName] = useState("");
  const [sectionNames, setSectionNames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refreshClasses() {
    setClasses(await getClasses());
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
      setMessage("Section removed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove section.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleClassDetails(schoolClass: SchoolClass) {
    if (openClassId === schoolClass.id) {
      setOpenClassId(null);
      return;
    }
    setOpenClassId(schoolClass.id);
    if (classDirectories[schoolClass.id]) return;
    setDirectoryLoading(schoolClass.id);
    setDirectoryErrors((current) => ({ ...current, [schoolClass.id]: "" }));
    try {
      const directory = await getClassDirectory(schoolClass.id);
      setClassDirectories((current) => ({ ...current, [schoolClass.id]: directory }));
      setClassTeacherSelections((current) => {
        const next = { ...current };
        directory.sections.forEach((section) => {
          next[section.id] = section.classTeacher ? String(section.classTeacher.id) : "";
        });
        return next;
      });
    } catch (cause) {
      setDirectoryErrors((current) => ({
        ...current,
        [schoolClass.id]: cause instanceof Error ? cause.message : "Could not load this class directory.",
      }));
    } finally {
      setDirectoryLoading(null);
    }
  }

  async function saveClassTeacher(schoolClass: SchoolClass, sectionId: number) {
    const selectedId = classTeacherSelections[sectionId] ?? "";
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await assignClassTeacher(schoolClass.id, sectionId, selectedId ? Number(selectedId) : null);
      const directory = await getClassDirectory(schoolClass.id);
      setClassDirectories((current) => ({ ...current, [schoolClass.id]: directory }));
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
    teacherId: string,
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await assignSubjectTeacher(schoolClass.id, sectionId, subjectId, teacherId ? Number(teacherId) : null);
      const directory = await getClassDirectory(schoolClass.id);
      setClassDirectories((current) => ({ ...current, [schoolClass.id]: directory }));
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
      <p className="muted">Create your school’s classes, then organize each one into sections.</p>
      <form className="class-create-form" onSubmit={addClass}>
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
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      {loading ? <p className="muted">Loading classes…</p> : error && classes.length === 0 ? null : classes.length ? (
        <div className="class-list">
          {classes.map((schoolClass) => (
            <article className="class-item" key={schoolClass.id}>
              <div className="class-item-header">
                <div>
                  <h4>{schoolClass.name}</h4>
                  <p className="muted">{schoolClass.sections.length} {schoolClass.sections.length === 1 ? "section" : "sections"}</p>
                </div>
                <div className="class-actions">
                  <button className="quiet-button" onClick={() => void toggleClassDetails(schoolClass)} type="button">
                    {openClassId === schoolClass.id ? "Close class details" : "Open class details"}
                  </button>
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
              {openClassId === schoolClass.id && (
                <div className="class-directory">
                  {directoryLoading === schoolClass.id && <p className="muted">Loading class directory…</p>}
                  {directoryErrors[schoolClass.id] && <p className="form-error" role="alert">{directoryErrors[schoolClass.id]}</p>}
                  {classDirectories[schoolClass.id]?.sections.map((section) => (
                    <section className="class-directory-section" key={section.id}>
                      <h5>{schoolClass.name} · {section.name}</h5>
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
                        <button
                          className="quiet-button"
                          disabled={busy}
                          onClick={() => void saveClassTeacher(schoolClass, section.id)}
                          type="button"
                        >Save class teacher</button>
                        <p className="muted">The class teacher can access this section.</p>
                      </div>
                      <div className="class-directory-columns">
                        <div>
                          <h6>Students</h6>
                          {section.students.length ? (
                            <ul className="directory-list">{section.students.map((student) => (
                              <li key={student.id}>{student.rollNumber == null ? "" : `#${student.rollNumber} · `}{student.fullName}</li>
                            ))}</ul>
                          ) : <p className="class-empty">No students in this section.</p>}
                        </div>
                        <div>
                          <h6>Teachers</h6>
                          {section.teachers.length ? (
                            <ul className="directory-list">{section.teachers.map((teacher) => (
                              <li key={teacher.id}>{teacher.fullName}</li>
                            ))}</ul>
                          ) : <p className="class-empty">No teachers assigned to this section.</p>}
                        </div>
                      </div>
                      <div className="class-subject-teachers">
                        <h6>Subject teachers</h6>
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
                                  onChange={(teacherId) => void saveSubjectTeacher(
                                    schoolClass,
                                    section.id,
                                    subject.id,
                                    teacherId,
                                  )}
                                  options={[
                                    { value: "", label: "Unassigned" },
                                    ...experts.map((teacher) => ({ value: String(teacher.id), label: teacher.fullName })),
                                  ]}
                                  value={subject.teacher ? String(subject.teacher.id) : ""}
                                  wrapperClassName="class-subject-teacher-select"
                                />
                                {!experts.length && <small>No teacher has matching subject expertise.</small>}
                              </li>
                            );
                          })}</ul>
                        ) : <p className="class-empty">Add subjects in Exam Setup before assigning subject teachers.</p>}
                      </div>
                    </section>
                  ))}
                  {classDirectories[schoolClass.id]?.sections.length === 0 && (
                    <p className="class-empty">Add sections to view their teachers and students.</p>
                  )}
                </div>
              )}
              {schoolClass.sections.length ? (
                <ul className="section-list">
                  {schoolClass.sections.map((section) => (
                    <li className="section-chip" key={section.id}>
                      <span>{section.name}</span>
                      <button
                        aria-label={`Remove section ${section.name} from ${schoolClass.name}`}
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
