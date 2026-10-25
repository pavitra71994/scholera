import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createClass, createSection, deleteSection, getClassDirectory, getClasses } from "../../../services/api";
import type { ClassDirectory, SchoolClass } from "../../../types/api";

export function ClassesPanel() {

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [openClassId, setOpenClassId] = useState<number | null>(null);
  const [classDirectories, setClassDirectories] = useState<Record<number, ClassDirectory>>({});
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
    getClasses()
      .then(setClasses)
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
    } catch (cause) {
      setDirectoryErrors((current) => ({
        ...current,
        [schoolClass.id]: cause instanceof Error ? cause.message : "Could not load this class directory.",
      }));
    } finally {
      setDirectoryLoading(null);
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
