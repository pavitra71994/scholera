import type { TeacherSection } from "../../../types/api";
import { DropdownSelect } from "../../shared/DropdownSelect";

export function SectionPicker({
  sections,
  selected,
  onChange,
}: {
  sections: TeacherSection[];
  selected: number | null;
  onChange: (sectionId: number | null) => void;
}) {
  return <DropdownSelect
    label="Assigned section"
    onChange={(value) => onChange(value ? Number(value) : null)}
    options={[
      { value: "", label: "Choose a section" },
      ...sections.map((section) => ({
        value: String(section.id),
        label: `${section.className} · ${section.name}`,
      })),
    ]}
    value={selected === null ? "" : String(selected)}
  />;
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
