import { useEffect, useMemo, useState } from "react";
import { getClasses } from "../services/api";
import type { SchoolClass } from "../types/api";

export function useAdminSections() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClasses()
      .then(setClasses)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load classes and sections."))
      .finally(() => setLoading(false));
  }, []);

  const sections = useMemo(
    () => classes.flatMap((schoolClass) => schoolClass.sections.map((section) => ({
      ...section,
      className: schoolClass.name,
    }))),
    [classes],
  );
  return { sections, error, loading };
}
