import { useEffect, useState } from "react";
import { getSession, login, logout } from "../services/api";
import type { SessionUser } from "../types/api";

export function useAuthSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    getSession()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false));
  }, []);

  async function signIn(username: string, password: string) {
    const authenticated = await login(username, password);
    setUser(authenticated);
    window.location.hash = authenticated.role === "STUDENT"
      ? "#/student"
      : authenticated.role === "TEACHER" ? "#/teacher" : "#/admin";
  }

  async function signOut() {
    await logout();
    setUser(null);
  }

  return { user, checkingSession, signIn, signOut };
}
