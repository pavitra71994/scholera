import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createPerson, getPeople, updateTeacherSections } from "../../../services/api";
import type { SchoolPerson } from "../../../types/api";
import { useAdminSections } from "../../../hooks/useAdminSections";
import { personClassNames } from "../../../utils/people";
import { SectionSelect } from "./SectionSelect";

export function PeopleManagement() {
  const { sections, error: sectionError, loading: sectionsLoading } = useAdminSections();
  const [people, setPeople] = useState<SchoolPerson[]>([]);
  const [role, setRole] = useState<"TEACHER" | "STUDENT">("STUDENT");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [teacherSectionIds, setTeacherSectionIds] = useState<number[]>([]);
  const [editingTeacherId, setEditingTeacherId] = useState<number | null>(null);
  const [editingSectionIds, setEditingSectionIds] = useState<number[]>([]);
  const [directoryRole, setDirectoryRole] = useState<"STUDENT" | "TEACHER" | null>(null);
  const [directoryView, setDirectoryView] = useState<"by-class" | "all">("all");
  const [directorySearch, setDirectorySearch] = useState("");
  const [directorySort, setDirectorySort] = useState<"name" | "class">("name");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [motherName, setMotherName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function refreshPeople() {
    const [students, teachers] = await Promise.all([getPeople("STUDENT"), getPeople("TEACHER")]);
    setPeople([...students, ...teachers].sort((a, b) => a.fullName.localeCompare(b.fullName)));
  }

  useEffect(() => {
    refreshPeople()
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load students and teachers."))
      .finally(() => setLoading(false));
  }, []);

  const directoryPeople = useMemo(() => {
    if (!directoryRole) return [];
    const search = directorySearch.trim().toLocaleLowerCase();
    return people
      .filter((person) => person.role === directoryRole)
      .filter((person) => {
        if (!search) return true;
        const classes = person.role === "STUDENT"
          ? [person.className ?? "Unassigned"]
          : person.assignedSections.map((section) => section.className);
        return [person.fullName, ...classes].some((value) => value.toLocaleLowerCase().includes(search));
      })
      .sort((first, second) => {
        if (directorySort === "class") {
          const classComparison = personClassNames(first).join(", ").localeCompare(personClassNames(second).join(", "));
          if (classComparison !== 0) return classComparison;
        }
        return first.fullName.localeCompare(second.fullName);
      });
  }, [directoryRole, directorySearch, directorySort, people]);

  const directoryGroups = useMemo(() => {
    if (directoryView === "all") {
      return [{ name: directoryRole === "STUDENT" ? "All students" : "All teachers", people: directoryPeople }];
    }
    const groups = new Map<string, SchoolPerson[]>();
    for (const person of directoryPeople) {
      for (const className of personClassNames(person)) {
        groups.set(className, [...(groups.get(className) ?? []), person]);
      }
    }
    return [...groups.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([name, groupedPeople]) => ({ name, people: groupedPeople }));
  }, [directoryPeople, directoryRole, directoryView]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await createPerson({
        fullName: fullName.trim(),
        username: username.trim(),
        password,
        role,
        sectionId: role === "STUDENT" ? sectionId : null,
        sectionIds: role === "TEACHER" ? teacherSectionIds : [],
        dateOfBirth: role === "STUDENT" ? dateOfBirth : null,
        motherName: role === "STUDENT" ? motherName.trim() : null,
        fatherName: role === "STUDENT" ? fatherName.trim() : null,
        emergencyContact: role === "STUDENT" && emergencyContact.trim() ? emergencyContact.trim() : null,
      });
      await refreshPeople();
      setFullName("");
      setUsername("");
      setPassword("");
      setSectionId(null);
      setTeacherSectionIds([]);
      setDateOfBirth("");
      setMotherName("");
      setFatherName("");
      setEmergencyContact("");
      setMessage(`${role === "STUDENT" ? "Student" : "Teacher"} account created.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create account.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAssignments(personId: number) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateTeacherSections(personId, editingSectionIds);
      await refreshPeople();
      setEditingTeacherId(null);
      setMessage("Teacher section assignments saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update teacher assignments.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="module-card">
      <div className="section-heading">
        <div><p className="eyebrow">School directory</p><h3>Students &amp; teachers</h3></div>
        <span className="status-pill">{people.length} {people.length === 1 ? "account" : "accounts"}</span>
      </div>
      <p className="muted">Create sign-in accounts for your school community. Students are assigned to a class section.</p>
      <div className="directory-role-cards" aria-label="Choose a directory">
        <button
          aria-pressed={directoryRole === "STUDENT"}
          className={`directory-role-card${directoryRole === "STUDENT" ? " is-selected" : ""}`}
          onClick={() => { setDirectoryRole("STUDENT"); setDirectoryView("all"); }}
          type="button"
        >
          <span className="feature-number">01</span><strong>Students</strong><span>Browse student accounts by class or all students.</span>
        </button>
        <button
          aria-pressed={directoryRole === "TEACHER"}
          className={`directory-role-card${directoryRole === "TEACHER" ? " is-selected" : ""}`}
          onClick={() => { setDirectoryRole("TEACHER"); setDirectoryView("all"); }}
          type="button"
        >
          <span className="feature-number">02</span><strong>Teachers</strong><span>Browse teacher accounts by assigned class or all teachers.</span>
        </button>
      </div>
      <form className="module-form people-form" onSubmit={submit}>
        <label className="module-field">Full name
          <input maxLength={160} onChange={(event) => setFullName(event.target.value)} required value={fullName} />
        </label>
        <label className="module-field">Account type
          <select value={role} onChange={(event) => setRole(event.target.value as "TEACHER" | "STUDENT")}>
            <option value="STUDENT">Student</option>
            <option value="TEACHER">Teacher</option>
          </select>
        </label>
        <label className="module-field">Username
          <input autoComplete="off" maxLength={100} onChange={(event) => setUsername(event.target.value)} required value={username} />
        </label>
        <label className="module-field">Initial password
          <input autoComplete="new-password" minLength={12} maxLength={100} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
        </label>
        {role === "STUDENT" && (
          <>
            <SectionSelect sections={sections} value={sectionId} onChange={setSectionId} />
            <label className="module-field">Date of birth
              <input max={new Date().toISOString().slice(0, 10)} onChange={(event) => setDateOfBirth(event.target.value)} required type="date" value={dateOfBirth} />
            </label>
            <label className="module-field">Mother’s name
              <input maxLength={160} onChange={(event) => setMotherName(event.target.value)} required value={motherName} />
            </label>
            <label className="module-field">Father’s name
              <input maxLength={160} onChange={(event) => setFatherName(event.target.value)} required value={fatherName} />
            </label>
            <label className="module-field">Emergency contact <span className="muted">(optional)</span>
              <input maxLength={40} onChange={(event) => setEmergencyContact(event.target.value)} value={emergencyContact} />
            </label>
          </>
        )}
        {role === "TEACHER" && (
          <label className="module-field full-width-field">Assigned sections <span className="muted">(choose one or more)</span>
            <select
              aria-label="Assigned sections"
              multiple
              onChange={(event) => setTeacherSectionIds(Array.from(event.currentTarget.selectedOptions, (option) => Number(option.value)))}
              size={Math.min(Math.max(sections.length, 2), 6)}
              value={teacherSectionIds.map(String)}
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>{section.className} · {section.name}</option>
              ))}
            </select>
          </label>
        )}
        <button className="secondary-button" disabled={saving || (role === "STUDENT" && sections.length === 0)} type="submit">
          {saving ? "Creating…" : "Create account"}
        </button>
      </form>
      {sectionError && <p className="form-error" role="alert">{sectionError}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}
      {directoryRole && (
        <section className="people-directory" aria-label={`${directoryRole === "STUDENT" ? "Student" : "Teacher"} directory`}>
          <div className="section-heading">
            <div><p className="eyebrow">Directory</p><h4>{directoryRole === "STUDENT" ? "Students" : "Teachers"}</h4></div>
            <span className="status-pill">{directoryPeople.length} {directoryPeople.length === 1 ? "person" : "people"}</span>
          </div>
          <div className="directory-toolbar">
            <div className="directory-view-toggle" aria-label="Directory view">
              <button aria-pressed={directoryView === "by-class"} className="quiet-button" onClick={() => setDirectoryView("by-class")} type="button">
                By class
              </button>
              <button aria-pressed={directoryView === "all"} className="quiet-button" onClick={() => setDirectoryView("all")} type="button">
                {directoryRole === "STUDENT" ? "All students" : "All teachers"}
              </button>
            </div>
            <label className="module-field">Search name or class
              <input onChange={(event) => setDirectorySearch(event.target.value)} placeholder="Search…" value={directorySearch} />
            </label>
            <label className="module-field">Sort by
              <select onChange={(event) => setDirectorySort(event.target.value as "name" | "class")} value={directorySort}>
                <option value="name">Name</option>
                <option value="class">Class</option>
              </select>
            </label>
          </div>
          {sectionsLoading || loading ? <p className="muted">Loading directory…</p> : directoryGroups.length ? (
            <div className="people-groups">
              {directoryGroups.map((group) => (
                <section className="people-group" key={group.name}>
                  {directoryView === "by-class" && <h5>{group.name}</h5>}
                  {group.people.length ? (
                    <div className="module-table-wrap">
                      <table className="module-table">
                        <thead><tr>
                          <th>Name</th><th>Username</th><th>Class / section</th>
                          {directoryRole === "STUDENT" && <th>Roll no.</th>}
                          {directoryRole === "TEACHER" && <th>Assignments</th>}
                        </tr></thead>
                        <tbody>{group.people.map((person) => (
                          <tr key={`${group.name}-${person.id}`}>
                            <td>{person.fullName}</td>
                            <td>{person.username}</td>
                            <td>{person.role === "STUDENT"
                              ? `${person.className ?? "Unassigned"}${person.sectionName ? ` · ${person.sectionName}` : ""}`
                              : personClassNames(person).join(", ")}</td>
                            {directoryRole === "STUDENT" && <td>{person.rollNumber ?? "—"}</td>}
                            {directoryRole === "TEACHER" && <td>
                  {person.role === "TEACHER" && editingTeacherId === person.id ? (
                    <div className="assignment-editor">
                      <select
                        aria-label={`Sections assigned to ${person.fullName}`}
                        multiple
                        onChange={(event) => setEditingSectionIds(Array.from(event.currentTarget.selectedOptions, (option) => Number(option.value)))}
                        size={Math.min(Math.max(sections.length, 2), 5)}
                        value={editingSectionIds.map(String)}
                      >
                        {sections.map((section) => (
                          <option key={section.id} value={section.id}>{section.className} · {section.name}</option>
                        ))}
                      </select>
                      <button className="quiet-button" disabled={saving} onClick={() => void saveAssignments(person.id)} type="button">Save</button>
                      <button className="text-button" onClick={() => setEditingTeacherId(null)} type="button">Cancel</button>
                    </div>
                  ) : person.role === "TEACHER" ? (
                    <div className="assignment-summary">
                      <span>{person.assignedSections?.length
                        ? person.assignedSections.map((section) => `${section.className} · ${section.name}`).join(", ")
                        : "Unassigned"}</span>
                      <button
                        className="quiet-button"
                        disabled={sectionsLoading || sections.length === 0}
                        onClick={() => {
                          setEditingTeacherId(person.id);
                          setEditingSectionIds(person.assignedSections?.map((section) => section.id) ?? []);
                        }}
                        type="button"
                      >Edit</button>
                    </div>
                  ) : "—"}
                            </td>}
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  ) : <p className="class-empty">No {directoryRole === "STUDENT" ? "students" : "teachers"} found.</p>}
                </section>
              ))}
            </div>
          ) : <p className="class-empty">No {directoryRole === "STUDENT" ? "students" : "teachers"} match your search.</p>}
        </section>
      )}
    </section>
  );
}
