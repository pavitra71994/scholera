export type Role = "ADMIN" | "TEACHER" | "STUDENT";

export interface SessionUser {
  username: string;
  role: Role;
}

export interface SchoolProfile {
  name: string;
  timezone: string;
}

export interface SchoolSection {
  id: number;
  name: string;
}

export interface SchoolClass {
  id: number;
  name: string;
  sections: SchoolSection[];
}

export interface SchoolPerson {
  id: number;
  fullName: string;
  username: string;
  role: "TEACHER" | "STUDENT";
  sectionId: number | null;
  sectionName: string | null;
  className: string | null;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

export interface StudentAttendance {
  studentId: number;
  fullName: string;
  status: AttendanceStatus | null;
}

export interface ExamMark {
  studentId: number;
  fullName: string;
  obtainedMarks: number;
}

export interface SchoolExam {
  id: number;
  sectionId: number;
  name: string;
  subject: string;
  maximumMarks: number;
  marks: ExamMark[];
}

interface CsrfTokenResponse {
  token: string;
  headerName: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api/v1";
let csrf: CsrfTokenResponse | undefined;

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    if (body.message) return body.message;
  } catch {
    // Non-JSON responses use the status-specific fallback below.
  }
  return response.status === 401
    ? "Your session has expired or the credentials were not accepted."
    : `The request failed (${response.status}). Please try again.`;
}

async function getCsrf(): Promise<CsrfTokenResponse> {
  const response = await fetch(`${API_URL}/auth/csrf`, { credentials: "include" });
  if (!response.ok) throw new Error(await readError(response));
  csrf = (await response.json()) as CsrfTokenResponse;
  return csrf;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error(await readError(response));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function mutate<T>(path: string, method: string, body?: unknown): Promise<T> {
  const token = csrf ?? (await getCsrf());
  return request<T>(path, {
    method,
    headers: { [token.headerName]: token.token },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export async function login(username: string, password: string): Promise<SessionUser> {
  await getCsrf();
  return mutate<SessionUser>("/auth/login", "POST", { username, password });
}

export async function getSession(): Promise<SessionUser> {
  return request<SessionUser>("/auth/me");
}

export async function logout(): Promise<void> {
  await mutate<void>("/auth/logout", "POST");
  csrf = undefined;
}

export async function getSchoolProfile(): Promise<SchoolProfile> {
  return request<SchoolProfile>("/school");
}

export async function updateSchoolProfile(profile: SchoolProfile): Promise<SchoolProfile> {
  return mutate<SchoolProfile>("/school", "PATCH", profile);
}

export async function getClasses(): Promise<SchoolClass[]> {
  return request<SchoolClass[]>("/classes");
}

export async function createClass(name: string): Promise<SchoolClass> {
  return mutate<SchoolClass>("/classes", "POST", { name });
}

export async function createSection(classId: number, name: string): Promise<SchoolSection> {
  return mutate<SchoolSection>(`/classes/${classId}/sections`, "POST", { name });
}

export async function deleteSection(classId: number, sectionId: number): Promise<void> {
  await mutate<void>(`/classes/${classId}/sections/${sectionId}`, "DELETE");
}

export async function getPeople(role: "TEACHER" | "STUDENT"): Promise<SchoolPerson[]> {
  return request<SchoolPerson[]>(`/people?role=${role}`);
}

export async function createPerson(person: {
  fullName: string;
  username: string;
  password: string;
  role: "TEACHER" | "STUDENT";
  sectionId: number | null;
}): Promise<SchoolPerson> {
  return mutate<SchoolPerson>("/people", "POST", person);
}

export async function getAttendance(sectionId: number, date: string): Promise<StudentAttendance[]> {
  return request<StudentAttendance[]>(`/attendance?sectionId=${sectionId}&date=${date}`);
}

export async function saveAttendance(
  sectionId: number,
  date: string,
  records: Array<{ studentId: number; status: AttendanceStatus }>,
): Promise<StudentAttendance[]> {
  return mutate<StudentAttendance[]>("/attendance", "POST", { sectionId, date, records });
}

export async function getExams(sectionId: number): Promise<SchoolExam[]> {
  return request<SchoolExam[]>(`/exams?sectionId=${sectionId}`);
}

export async function createExam(exam: {
  sectionId: number;
  name: string;
  subject: string;
  maximumMarks: number;
}): Promise<SchoolExam> {
  return mutate<SchoolExam>("/exams", "POST", exam);
}

export async function saveExamMarks(
  examId: number,
  marks: Array<{ studentId: number; obtainedMarks: number }>,
): Promise<void> {
  await mutate<unknown>(`/exams/${examId}/marks`, "POST", { marks });
}

export async function getHealth(): Promise<boolean> {
  try {
    const result = await request<{ status: string }>("/health");
    return result.status === "UP";
  } catch {
    return false;
  }
}
