import type { SchoolPerson } from "../types/api";

export function personClassNames(person: SchoolPerson): string[] {
  return person.role === "STUDENT"
    ? [person.className ?? "Unassigned"]
    : [...new Set(person.assignedSections.map((section) => section.className))];
}
