import type { SchoolSection } from "../../../types/api";

export function SectionSelect({
  sections,
  value,
  onChange,
  label = "Section",
}: {
  sections: Array<SchoolSection & { className?: string }>;
  value: number | null;
  onChange: (id: number | null) => void;
  label?: string;
}) {
  return (
    <label className="module-field">
      {label}
      <select
        aria-label={label}
        required={sections.length > 0}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
      >
        <option value="">Choose a section</option>
        {sections.map((section) => (
          <option key={section.id} value={section.id}>
            {section.className ? `${section.className} · ` : ""}{section.name}
          </option>
        ))}
      </select>
    </label>
  );
}
