import type { TeacherSection } from "../../../types/api";

export function SectionPicker({
  sections,
  selected,
  onChange,
}: {
  sections: TeacherSection[];
  selected: number | null;
  onChange: (sectionId: number | null) => void;
}) {
  return (
    <label className="module-field">
      Assigned section
      <select
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        value={selected ?? ""}
      >
        <option value="">Choose a section</option>
        {sections.map((section) => (
          <option key={section.id} value={section.id}>{section.className} · {section.name}</option>
        ))}
      </select>
    </label>
  );
}

export function SectionEmptyState({ sections, loading, error }: {
  sections: TeacherSection[];
  loading: boolean;
  error: string;
}) {
  if (loading) return <p className="muted">Loading assigned sections…</p>;
  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!sections.length) {
    return <p className="class-empty">No sections are assigned to your account yet. Ask an administrator to assign your classes.</p>;
  }
  return null;
}
