import { useEffect, useState } from "react";
import { getTeacherSections } from "../services/api";
import type { TeacherSection } from "../types/api";

export function useTeacherSections() {
  const [sections, setSections] = useState<TeacherSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getTeacherSections()
      .then(setSections)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load your sections."))
      .finally(() => setLoading(false));
  }, []);
  return { sections, loading, error };
}
