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

export interface ClassDirectory {
  id: number;
  name: string;
  sections: Array<SchoolSection & {
    students: Array<{ id: number; fullName: string; rollNumber: number | null }>;
    teachers: Array<{ id: number; fullName: string }>;
  }>;
}

export interface SchoolPerson {
  id: number;
  fullName: string;
  username: string;
  role: "TEACHER" | "STUDENT";
  sectionId: number | null;
  sectionName: string | null;
  className: string | null;
  rollNumber: number | null;
  assignedSections: TeacherSection[];
}

export interface TeacherSection {
  id: number;
  name: string;
  classId: number;
  className: string;
}

export interface TeacherProfile {
  displayName: string;
  username: string;
  phone: string | null;
  sections: TeacherSection[];
}

export interface TeacherStudent {
  id: number;
  fullName: string;
  rollNumber: number | null;
}

export interface TeacherStudentProgress {
  studentId: number;
  studentName: string;
  recordedAttendance: number;
  attendancePercentage: number;
  marks: Array<{
    examName: string;
    subject: string;
    academicYear: number;
    obtainedMarks: number;
    maximumMarks: number;
  }>;
}

export interface StudentProfile {
  displayName: string;
  dateOfBirth: string | null;
  motherName: string | null;
  fatherName: string | null;
  emergencyContact: string | null;
  rollNumber: number | null;
  className: string | null;
  sectionName: string | null;
}

export interface StudentExamHistoryEntry {
  examName: string;
  subject: string;
  academicYear: number;
  obtainedMarks: number;
  maximumMarks: number;
  percentage: number;
}

export interface StudentExamResult {
  examId: number;
  examName: string;
  academicYear: number;
  totalMarks: number;
  maximumMarks: number;
  percentage: number;
  sectionRank: number;
  classRank: number;
  subjects: Array<{
    subject: string;
    obtainedMarks: number;
    maximumMarks: number;
    percentage: number;
  }>;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

export interface StudentAttendanceHistory {
  presentCount: number;
  absentCount: number;
  lateCount: number;
  recordedDays: number;
  attendancePercentage: number;
  history: Array<{ date: string; status: AttendanceStatus }>;
}

export interface StudentLeaderboardEntry {
  studentName: string;
  className: string | null;
  sectionName: string | null;
  subject: string | null;
  academicYear: number;
  totalMarks: number;
  rank: number;
  currentStudent: boolean;
}

export interface StudentToppers {
  classToppers: StudentLeaderboardEntry[];
  sectionToppers: StudentLeaderboardEntry[];
  subjectToppers: StudentLeaderboardEntry[];
}

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
  examDefinitionId: number;
  name: string;
  academicYear: number;
  subjects: SchoolExamSubject[];
}

export interface SchoolExamDefinition {
  id: number;
  name: string;
  academicYear: number;
}

export interface SchoolSectionSubject {
  id: number;
  sectionId: number;
  subject: string;
  defaultMaximumMarks: number;
}

export interface SchoolExamSubject {
  id: number;
  subject: string;
  maximumMarks: number;
  marks: ExamMark[];
}
