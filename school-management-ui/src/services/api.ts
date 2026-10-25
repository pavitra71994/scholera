import type {
  AttendanceStatus,
  ClassDirectory,
  SchoolClass,
  SchoolExam,
  SchoolExamDefinition,
  SchoolSectionSubject,
  SchoolPerson,
  SchoolProfile,
  SchoolSection,
  SessionUser,
  StudentAttendance,
  StudentAttendanceHistory,
  StudentExamHistoryEntry,
  StudentExamResult,
  StudentProfile,
  StudentToppers,
  TeacherProfile,
  TeacherSection,
  TeacherStudent,
  TeacherStudentProgress,
} from "../types/api";
import { API_URL } from "../constants/config";

export type * from "../types/api";

interface CsrfTokenResponse {
  token: string;
  headerName: string;
}

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

export async function getClassDirectory(classId: number): Promise<ClassDirectory> {
  return request<ClassDirectory>(`/classes/${classId}/directory`);
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
  dateOfBirth: string | null;
  motherName: string | null;
  fatherName: string | null;
  emergencyContact: string | null;
  sectionIds: number[];
}): Promise<SchoolPerson> {
  return mutate<SchoolPerson>("/people", "POST", person);
}

export async function updateTeacherSections(personId: number, sectionIds: number[]): Promise<SchoolPerson> {
  return mutate<SchoolPerson>(`/people/${personId}/teacher-sections`, "PUT", { sectionIds });
}

export async function getTeacherProfile(): Promise<TeacherProfile> {
  return request<TeacherProfile>("/teacher/profile");
}

export async function updateTeacherProfile(
  profile: Pick<TeacherProfile, "displayName" | "phone">,
): Promise<TeacherProfile> {
  return mutate<TeacherProfile>("/teacher/profile", "PATCH", profile);
}

export async function getTeacherSections(): Promise<TeacherSection[]> {
  return request<TeacherSection[]>("/teacher/sections");
}

export async function getTeacherRoster(sectionId: number): Promise<TeacherStudent[]> {
  return request<TeacherStudent[]>(`/teacher/sections/${sectionId}/students`);
}

export async function getTeacherProgress(sectionId: number): Promise<{ sectionId: number; students: TeacherStudentProgress[] }> {
  return request<{ sectionId: number; students: TeacherStudentProgress[] }>(`/teacher/sections/${sectionId}/progress`);
}

export async function getStudentProfile(): Promise<StudentProfile> {
  return request<StudentProfile>("/student/profile");
}

export async function updateStudentProfile(profile: Pick<StudentProfile, "emergencyContact">): Promise<StudentProfile> {
  return mutate<StudentProfile>("/student/profile", "PATCH", profile);
}

export async function getStudentExamHistory(): Promise<StudentExamHistoryEntry[]> {
  return request<StudentExamHistoryEntry[]>("/student/exam-history");
}

export async function getStudentExamResults(): Promise<StudentExamResult[]> {
  return request<StudentExamResult[]>("/student/exam-results");
}

export async function getStudentAttendanceHistory(): Promise<StudentAttendanceHistory> {
  return request<StudentAttendanceHistory>("/student/attendance-history");
}

export async function getStudentToppers(): Promise<StudentToppers> {
  return request<StudentToppers>("/student/toppers");
}

export async function getAttendance(sectionId: number, date: string): Promise<StudentAttendance[]> {
  return request<StudentAttendance[]>(`/attendance?sectionId=${sectionId}&date=${date}`);
}

export async function getAttendanceHistory(sectionId: number): Promise<Array<{
  date: string;
  studentId: number;
  fullName: string;
  status: AttendanceStatus;
}>> {
  return request(`/attendance/history?sectionId=${sectionId}`);
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

export async function getSchoolExamDefinitions(): Promise<SchoolExamDefinition[]> {
  return request<SchoolExamDefinition[]>("/exams/definitions");
}

export async function createSchoolExamDefinition(definition: {
  name: string;
  academicYear: number;
}): Promise<SchoolExamDefinition> {
  return mutate<SchoolExamDefinition>("/exams/definitions", "POST", definition);
}

export async function getSectionSubjects(sectionId: number): Promise<SchoolSectionSubject[]> {
  return request<SchoolSectionSubject[]>(`/exams/sections/${sectionId}/subjects`);
}

export async function createSectionSubject(sectionId: number, subject: {
  subject: string;
  maximumMarks: number;
}): Promise<SchoolSectionSubject> {
  return mutate<SchoolSectionSubject>(`/exams/sections/${sectionId}/subjects`, "POST", subject);
}

export async function createExam(exam: {
  sectionId: number;
  examDefinitionId: number;
}): Promise<SchoolExam> {
  return mutate<SchoolExam>("/exams", "POST", exam);
}

export async function createExamSubject(examId: number, subject: {
  subject: string;
  maximumMarks: number;
}): Promise<SchoolExam["subjects"][number]> {
  return mutate<SchoolExam["subjects"][number]>(`/exams/${examId}/subjects`, "POST", subject);
}

export async function saveExamMarks(
  subjectId: number,
  marks: Array<{ studentId: number; obtainedMarks: number }>,
): Promise<void> {
  await mutate<unknown>(`/exams/subjects/${subjectId}/marks`, "POST", { marks });
}

export async function getHealth(): Promise<boolean> {
  try {
    const result = await request<{ status: string }>("/health");
    return result.status === "UP";
  } catch {
    return false;
  }
}
