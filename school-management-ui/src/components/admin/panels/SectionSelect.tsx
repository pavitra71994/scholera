import type { SchoolSection } from "../../../types/api";
import { DropdownSelect } from "../../shared/DropdownSelect";

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
  return <DropdownSelect
    label={label}
    onChange={(selected) => onChange(selected ? Number(selected) : null)}
    options={[
      { value: "", label: "Choose a section" },
      ...sections.map((section) => ({
        value: String(section.id),
        label: `${section.className ? `${section.className} · ` : ""}${section.name}`,
      })),
    ]}
    value={value === null ? "" : String(value)}
  />;
}
