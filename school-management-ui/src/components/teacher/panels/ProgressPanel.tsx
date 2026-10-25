import { useEffect, useMemo, useState } from "react";
import { getTeacherProgress } from "../../../services/api";
import type { TeacherStudentProgress } from "../../../types/api";
import { useTeacherSections } from "../../../hooks/useTeacherSections";
import { SectionEmptyState, SectionPicker } from "./SectionPicker";

export function TeacherProgressPage() {
  const { sections, loading: sectionsLoading, error: sectionsError } = useTeacherSections();
  const fullSections = useMemo(
    () => sections.filter((section) => section.fullSectionAccess),
    [sections],
  );
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [students, setStudents] = useState<TeacherStudentProgress[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fullSections.length) {
      setSectionId(null);
      return;
    }
    setSectionId((selected) => selected && fullSections.some((section) => section.id === selected)
      ? selected
      : fullSections[0].id);
  }, [fullSections]);

  useEffect(() => {
    if (sectionId == null) {
      setStudents(null);
      return;
    }
    setStudents(null);
    setError("");
    getTeacherProgress(sectionId)
      .then((result) => setStudents(result.students))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load class progress."));
  }, [sectionId]);

  return (
    <section className="teacher-panel">
      <div className="section-heading"><div><p className="eyebrow">Class overview</p><h3>Class Progress</h3></div></div>
      <p className="muted">Attendance percentages use recorded entries; leave days are excluded.</p>
      {(!sections.length || fullSections.length > 0)
        && <SectionEmptyState error={sectionsError} loading={sectionsLoading} sections={fullSections} />}
      {!sectionsLoading && !sectionsError && sections.length > 0 && !fullSections.length && (
        <p className="class-empty">Class progress is available only to class teachers and teachers assigned to the full section.</p>
      )}
      {!sectionsLoading && !sectionsError && fullSections.length > 0 && (
        <>
          <SectionPicker onChange={setSectionId} sections={fullSections} selected={sectionId} />
          {error && <p className="form-error" role="alert">{error}</p>}
          {!students && !error ? <p className="muted">Loading progress…</p> : students?.length ? (
            <div className="teacher-progress-list">
              {students.map((student) => (
                <article className="teacher-progress-card" key={student.studentId}>
                  <div className="section-heading">
                    <h4>{student.studentName}</h4>
                    <span className="status-pill">
                      Attendance {student.recordedAttendance
                        ? `${student.attendancePercentage}% (${student.recordedAttendance} recorded${student.leaveCount ? ` · ${student.leaveCount} leave excluded` : ""})`
                        : "— (no records)"}
                    </span>
                  </div>
                  {student.marks.length ? (
                    <ul className="teacher-mark-list">{student.marks.map((mark, index) => (
                      <li key={`${mark.academicYear}-${mark.examName}-${mark.subject}-${index}`}>
                        <span>{mark.academicYear} · {mark.examName} · {mark.subject}</span>
                        <strong>{mark.obtainedMarks} / {mark.maximumMarks}</strong>
                      </li>
                    ))}</ul>
                  ) : <p className="class-empty">No exam marks recorded.</p>}
                </article>
              ))}
            </div>
          ) : students ? <p className="class-empty">No students are enrolled in this section yet.</p> : null}
        </>
      )}
    </section>
  );
}
