import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { LoginForm } from "../components/auth/LoginForm";
import { ExamSetupPanel } from "../components/admin/panels/ExamSetupPanel";
import { ClassesPanel as ClassesManagement } from "../components/admin/panels/ClassesPanel";
import { PeopleManagement } from "../components/admin/panels/PeoplePanel";
import {
  createClass,
  createExam,
  createExamSubject,
  createSectionSubject,
  createSchoolExamDefinition,
  createPerson,
  createSection,
  deleteSection,
  getPeople,
  getClasses,
  getExams,
  getSchoolExamDefinitions,
  getSectionSubjects,
  getHealth,
  getSchoolProfile,
  getSession,
  getStudentAttendanceHistory,
  getStudentExamHistory,
  getStudentExamResults,
  getStudentProfile,
  getStudentToppers,
  updateStudentProfile,
  getAttendance,
  getAttendanceHistory,
  getClassDirectory,
  getTeacherProfile,
  getTeacherProgress,
  getTeacherRoster,
  getTeacherSections,
  saveAttendance,
  saveExamMarks,
  updateTeacherProfile,
} from "../services/api";

vi.mock("../services/api", () => ({
  createClass: vi.fn(),
  createExam: vi.fn(),
  createExamSubject: vi.fn(),
  createSectionSubject: vi.fn(),
  createSchoolExamDefinition: vi.fn(),
  createPerson: vi.fn(),
  createSection: vi.fn(),
  deleteSection: vi.fn(),
  getAttendance: vi.fn(),
  getAttendanceHistory: vi.fn(),
  getClassDirectory: vi.fn(),
  getClasses: vi.fn(),
  getExams: vi.fn(),
  getSchoolExamDefinitions: vi.fn(),
  getSectionSubjects: vi.fn(),
  getHealth: vi.fn(),
  getPeople: vi.fn(),
  getSchoolProfile: vi.fn(),
  getSession: vi.fn(),
  getStudentAttendanceHistory: vi.fn(),
  getStudentExamHistory: vi.fn(),
  getStudentExamResults: vi.fn(),
  getStudentProfile: vi.fn(),
  getStudentToppers: vi.fn(),
  getTeacherProfile: vi.fn(),
  getTeacherProgress: vi.fn(),
  getTeacherRoster: vi.fn(),
  getTeacherSections: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  saveAttendance: vi.fn(),
  saveExamMarks: vi.fn(),
  updateStudentProfile: vi.fn(),
  updateTeacherProfile: vi.fn(),
  updateTeacherSections: vi.fn(),
  updateSchoolProfile: vi.fn(),
}));

beforeEach(() => {
  window.location.hash = "";
  localStorage.clear();
  vi.mocked(createClass).mockReset();
  vi.mocked(createExam).mockReset();
  vi.mocked(createExamSubject).mockReset();
  vi.mocked(createSectionSubject).mockReset();
  vi.mocked(createSchoolExamDefinition).mockReset();
  vi.mocked(createSection).mockReset();
  vi.mocked(deleteSection).mockReset();
  vi.mocked(getClasses).mockReset();
  vi.mocked(getExams).mockReset();
  vi.mocked(getSchoolExamDefinitions).mockReset();
  vi.mocked(getSectionSubjects).mockReset();
  vi.mocked(getClassDirectory).mockReset();
  vi.mocked(getPeople).mockReset();
  vi.mocked(getAttendance).mockReset();
  vi.mocked(getAttendanceHistory).mockReset();
  vi.mocked(getSession).mockReset();
  vi.mocked(getStudentAttendanceHistory).mockReset();
  vi.mocked(getStudentExamHistory).mockReset();
  vi.mocked(getStudentExamResults).mockReset();
  vi.mocked(getStudentProfile).mockReset();
  vi.mocked(getStudentToppers).mockReset();
  vi.mocked(updateStudentProfile).mockReset();
  vi.mocked(getTeacherProfile).mockReset();
  vi.mocked(getTeacherProgress).mockReset();
  vi.mocked(getTeacherRoster).mockReset();
  vi.mocked(getTeacherSections).mockReset();
  vi.mocked(updateTeacherProfile).mockReset();
  vi.mocked(saveAttendance).mockReset();
  vi.mocked(saveExamMarks).mockReset();
  vi.mocked(createPerson).mockReset();
});

afterEach(() => {
  cleanup();
});

describe("login form", () => {
  it("submits the entered credentials and shows a pending state", async () => {
    let finishLogin: (() => void) | undefined;
    const onLogin = vi.fn(() => new Promise<void>((resolve) => {
      finishLogin = resolve;
    }));
    render(<LoginForm onLogin={onLogin} />);

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a-long-password" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(onLogin).toHaveBeenCalledWith("admin", "a-long-password");
    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
    finishLogin?.();
  });
});

describe("classes and sections management", () => {
  it("creates a class, adds a section, and removes it", async () => {
    vi.mocked(getClasses)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, name: "Grade 1", sections: [] }])
      .mockResolvedValueOnce([{ id: 1, name: "Grade 1", sections: [{ id: 10, name: "A" }] }])
      .mockResolvedValueOnce([{ id: 1, name: "Grade 1", sections: [] }]);
    vi.mocked(createClass).mockResolvedValue({ id: 1, name: "Grade 1", sections: [] });
    vi.mocked(createSection).mockResolvedValue({ id: 10, name: "A" });
    vi.mocked(deleteSection).mockResolvedValue();

    render(<ClassesManagement />);
    fireEvent.change(await screen.findByLabelText("Class name"), { target: { value: "Grade 1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add class" }));

    expect(await screen.findByRole("heading", { name: "Grade 1" })).toBeInTheDocument();
    expect(createClass).toHaveBeenCalledWith("Grade 1");
    fireEvent.change(screen.getByLabelText("Section name for Grade 1"), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: "Add section" }));

    expect(await screen.findByText("A")).toBeInTheDocument();
    expect(createSection).toHaveBeenCalledWith(1, "A");
    fireEvent.click(screen.getByRole("button", { name: "Remove section A from Grade 1" }));

    await waitFor(() => expect(deleteSection).toHaveBeenCalledWith(1, 10));
    expect(await screen.findByText("No sections yet. Add one to organize this class.")).toBeInTheDocument();
  });

  it("opens a class to show students and assigned teachers by section", async () => {
    vi.mocked(getClasses).mockResolvedValue([{
      id: 1,
      name: "Grade 5",
      sections: [{ id: 10, name: "A" }],
    }]);
    vi.mocked(getClassDirectory).mockResolvedValue({
      id: 1,
      name: "Grade 5",
      sections: [{
        id: 10,
        name: "A",
        students: [{ id: 21, fullName: "Ari Student", rollNumber: 3 }],
        teachers: [{ id: 31, fullName: "Ravi Teacher" }],
      }],
    });

    render(<ClassesManagement />);
    fireEvent.click(await screen.findByRole("button", { name: "Open class details" }));

    expect(await screen.findByText((_, element) =>
      element?.tagName === "LI" && Boolean(element.textContent?.includes("Ari Student")))).toBeInTheDocument();
    expect(screen.getByText("Ravi Teacher")).toBeInTheDocument();
    expect(getClassDirectory).toHaveBeenCalledWith(1);
  });
});

describe("people directory", () => {
  it("offers student/teacher cards, class and all views, search, and class sorting", async () => {
    vi.mocked(getClasses).mockResolvedValue([]);
    vi.mocked(getPeople).mockImplementation(async (role) => role === "STUDENT"
      ? [
        { id: 1, fullName: "Zara Student", username: "zara", role: "STUDENT", sectionId: 2, sectionName: "B", className: "Grade 6", rollNumber: 5, assignedSections: [] },
        { id: 2, fullName: "Ari Student", username: "ari", role: "STUDENT", sectionId: 1, sectionName: "A", className: "Grade 5", rollNumber: 2, assignedSections: [] },
      ]
      : [
        { id: 3, fullName: "Mina Teacher", username: "mina", role: "TEACHER", sectionId: null, sectionName: null, className: null, rollNumber: null, assignedSections: [{ id: 2, name: "B", classId: 6, className: "Grade 6" }] },
      ]);

    render(<PeopleManagement />);
    fireEvent.click(await screen.findByRole("button", { name: /students/i }));
    expect(await screen.findByText("All students")).toBeInTheDocument();
    expect(screen.getByText("Zara Student")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "By class" }));
    expect(screen.getByRole("heading", { name: "Grade 5" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Grade 6" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search name or class"), { target: { value: "grade 6" } });
    expect(screen.getByText("Zara Student")).toBeInTheDocument();
    expect(screen.queryByText("Ari Student")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /teachers/i }));
    expect(await screen.findByText("Mina Teacher")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Class" })).toBeInTheDocument();
  });
});
describe("admin navigation", () => {
  it("opens the School management dashboard first and displays only the selected page", async () => {
    vi.mocked(getSession).mockResolvedValue({ username: "admin", role: "ADMIN" });
    vi.mocked(getHealth).mockResolvedValue(true);
    vi.mocked(getSchoolProfile).mockResolvedValue({ name: "My School", timezone: "UTC" });
    vi.mocked(getClasses).mockResolvedValue([]);

    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "School management" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Scholora home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Students & teachers/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: /School profile/ }));

    expect(await screen.findByRole("heading", { level: 3, name: "School profile" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 4, name: "Classes & sections" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: "School management" })).not.toBeInTheDocument();
    window.location.hash = "";
  });
});

describe("workspace themes", () => {
  it("saves a theme for the signed-in account without changing another account's theme", async () => {
    vi.mocked(getSession).mockResolvedValue({ username: "admin", role: "ADMIN" });
    vi.mocked(getHealth).mockResolvedValue(true);

    const adminView = render(<App />);
    await screen.findByRole("heading", { level: 1, name: "School management" });
    const adminWorkspace = screen.getByRole("main");
    const themePicker = await screen.findByLabelText("Theme");

    expect(adminWorkspace).toHaveAttribute("data-theme", "forest");
    fireEvent.change(themePicker, { target: { value: "ocean" } });
    expect(adminWorkspace).toHaveAttribute("data-theme", "ocean");
    expect(localStorage.getItem("scholora.theme.admin")).toBe("ocean");
    adminView.unmount();

    const reopenedAdminView = render(<App />);
    expect(await screen.findByLabelText("Theme")).toHaveValue("ocean");
    reopenedAdminView.unmount();

    vi.mocked(getSession).mockResolvedValue({ username: "learner", role: "STUDENT" });
    render(<App />);

    expect(await screen.findByLabelText("Theme")).toHaveValue("forest");
    expect(screen.getByRole("main")).toHaveAttribute("data-theme", "forest");
  });
});

describe("admin exam creation", () => {
  it("adds school-wide exams and section-specific subjects from class cards", async () => {
    vi.mocked(getClasses).mockResolvedValue([{
      id: 7,
      name: "Grade 7",
      sections: [{ id: 41, name: "A" }],
    }]);
    vi.mocked(getPeople).mockResolvedValue([]);
    vi.mocked(getSchoolExamDefinitions).mockResolvedValue([]);
    vi.mocked(getSectionSubjects).mockResolvedValue([]);
    vi.mocked(createSectionSubject).mockResolvedValue({
      id: 59,
      sectionId: 41,
      subject: "Mathematics",
      defaultMaximumMarks: 100,
    });
    vi.mocked(createSchoolExamDefinition).mockResolvedValue({
      id: 39,
      name: "Term 1",
      academicYear: 2026,
    });
    render(<ExamSetupPanel />);
    fireEvent.change(await screen.findByLabelText("Common exam name"), { target: { value: "Term 1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add common exam" }));
    await waitFor(() => expect(createSchoolExamDefinition).toHaveBeenCalledWith({
      name: "Term 1",
      academicYear: 2026,
    }));

    expect(await screen.findByText("Section A")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /section a/i }));
    fireEvent.change(await screen.findByLabelText("Subject"), { target: { value: "Mathematics" } });
    fireEvent.click(screen.getByRole("button", { name: "Add section subject" }));

    await waitFor(() => expect(createSectionSubject).toHaveBeenCalledWith(41, {
      subject: "Mathematics",
      maximumMarks: 100,
    }));
  });
});

describe("student portal", () => {
  it("opens all four student pages and displays private profile and recorded summaries", async () => {
    vi.mocked(getSession).mockResolvedValue({ username: "learner", role: "STUDENT" });
    vi.mocked(getHealth).mockResolvedValue(true);
    vi.mocked(getStudentProfile).mockResolvedValue({
      displayName: "Taylor Student",
      dateOfBirth: "2009-04-12",
      motherName: "Morgan Student",
      fatherName: "Casey Student",
      emergencyContact: null,
      rollNumber: 7,
      className: "Grade 8",
      sectionName: "A",
    });

    vi.mocked(updateStudentProfile).mockResolvedValue({
      displayName: "Taylor Student",
      dateOfBirth: "2009-04-12",
      motherName: "Morgan Student",
      fatherName: "Casey Student",
      emergencyContact: "555-0101",
      rollNumber: 7,
      className: "Grade 8",
      sectionName: "A",
    });
    vi.mocked(getStudentExamResults).mockResolvedValue([{
      examId: 25,
      examName: "Term 1",
      academicYear: 2026,
      totalMarks: 45,
      maximumMarks: 50,
      percentage: 90,
      sectionRank: 2,
      classRank: 5,
      subjects: [{
        subject: "Mathematics",
        obtainedMarks: 45,
        maximumMarks: 50,
        percentage: 90,
      }],
    }, {
      examId: 22,
      examName: "Annual Exam",
      academicYear: 2025,
      totalMarks: 88,
      maximumMarks: 100,
      percentage: 88,
      sectionRank: 1,
      classRank: 2,
      subjects: [{
        subject: "Science",
        obtainedMarks: 88,
        maximumMarks: 100,
        percentage: 88,
      }],
    }]);
    vi.mocked(getStudentAttendanceHistory).mockResolvedValue({
      presentCount: 1,
      absentCount: 0,
      lateCount: 1,
      recordedDays: 2,
      attendancePercentage: 100,
      history: [
        { date: "2026-10-24", status: "LATE" },
        { date: "2026-10-23", status: "PRESENT" },
      ],
    });
    vi.mocked(getStudentToppers).mockResolvedValue({
      classToppers: [
        { studentName: "Taylor Student", className: "Grade 8", sectionName: null, subject: null, academicYear: 2026, totalMarks: 90, rank: 1, currentStudent: true },
        { studentName: "Alex Student", className: "Grade 8", sectionName: null, subject: null, academicYear: 2026, totalMarks: 80, rank: 2, currentStudent: false },
        { studentName: "Sam Student", className: "Grade 9", sectionName: null, subject: null, academicYear: 2026, totalMarks: 95, rank: 1, currentStudent: false },
      ],
      sectionToppers: [
        { studentName: "Taylor Student", className: "Grade 8", sectionName: "A", subject: null, academicYear: 2026, totalMarks: 90, rank: 1, currentStudent: true },
      ],
      subjectToppers: [
        { studentName: "Taylor Student", className: "Grade 8", sectionName: null, subject: "Mathematics", academicYear: 2026, totalMarks: 90, rank: 1, currentStudent: true },
        { studentName: "Alex Student", className: "Grade 8", sectionName: null, subject: "Science", academicYear: 2026, totalMarks: 80, rank: 1, currentStudent: false },
      ],
    });

    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Good day, learner." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open my profile/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open exam results & progress/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open attendance summary/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open school toppers/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /open my profile/i }));
    expect(await screen.findByRole("heading", { level: 3, name: "My Profile" })).toBeInTheDocument();
    expect(screen.getByLabelText("Date of birth")).toHaveValue("2009-04-12");
    expect(screen.getByLabelText("Date of birth")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Class")).toHaveValue("Grade 8");
    expect(screen.getByLabelText("Display name")).toHaveAttribute("readonly");
    fireEvent.change(screen.getByLabelText(/Emergency phone/), { target: { value: "555-0101" } });
    fireEvent.click(screen.getByRole("button", { name: "Save emergency phone" }));
    await waitFor(() => expect(updateStudentProfile).toHaveBeenCalledWith({
      emergencyContact: "555-0101",
    }));

    fireEvent.click(screen.getByRole("link", { name: /your school life/i }));
    fireEvent.click(await screen.findByRole("link", { name: /open exam results & progress/i }));
    expect(await screen.findByLabelText("Academic year")).toHaveValue("2026");
    expect(screen.getByText("Section #2 · Class #5")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Term 1"));
    expect(await screen.findAllByText("45 / 50")).toHaveLength(2);
    expect(screen.getAllByText("90%")).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Academic year"), { target: { value: "2025" } });
    expect(screen.getByText("Annual Exam")).toBeInTheDocument();
    expect(screen.queryByText("Term 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /your school life/i }));
    fireEvent.click(await screen.findByRole("link", { name: /open attendance summary/i }));
    expect(await screen.findByText("100%")).toBeInTheDocument();
    expect(screen.getByText("2026-10-24")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /your school life/i }));
    fireEvent.click(await screen.findByRole("link", { name: /open school toppers/i }));
    expect(await screen.findByText("Taylor Student")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2026 · Grade 8" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2026 · Grade 9" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /by class/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Classes ranked")).toBeInTheDocument();
    expect(screen.getAllByText("You")).toHaveLength(1);
    expect(screen.getByText("Taylor Student").closest("li")).toHaveClass("leaderboard-current-student");
    fireEvent.click(screen.getByRole("button", { name: /by section/i }));
    expect(screen.getByRole("heading", { name: "2026 · Grade 8 · A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /by section/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Taylor Student").closest("li")).toHaveClass("leaderboard-current-student");
    fireEvent.click(screen.getByRole("button", { name: /by subject/i }));
    expect(screen.getByRole("heading", { name: "2026 · Grade 8 · Mathematics" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2026 · Grade 8 · Science" })).toBeInTheDocument();
    expect(screen.getByText("Taylor Student").closest("li")).toHaveClass("leaderboard-current-student");
  });
});

describe("admin and teacher topper dashboards", () => {
  it.each(["ADMIN", "TEACHER"] as const)("shows the School Toppers card for %s accounts", async (role) => {
    vi.mocked(getSession).mockResolvedValue({
      username: role === "ADMIN" ? "admin" : "teacher",
      role,
    });
    vi.mocked(getHealth).mockResolvedValue(true);
    vi.mocked(getTeacherProfile).mockResolvedValue({
      displayName: "Morgan Teacher",
      username: "teacher",
      phone: null,
      sections: [],
    });
    vi.mocked(getStudentToppers).mockResolvedValue({
      classToppers: [],
      sectionToppers: [],
      subjectToppers: [],
    });

    render(<App />);
    const topperCard = await screen.findByRole("link", { name: /open school toppers/i });
    fireEvent.click(topperCard);

    expect(await screen.findByRole("heading", { level: 3, name: "School Toppers" })).toBeInTheDocument();
  });
});

describe("teacher portal", () => {
  const section = { id: 31, name: "B", classId: 7, className: "Grade 7" };
  const profile = {
    displayName: "Jordan Teacher",
    username: "jordan",
    phone: null,
    sections: [section],
  };
  const roster = [{ id: 44, fullName: "Alex Learner", rollNumber: 4 }];

  it("opens the five teacher tools and edits only teacher profile fields", async () => {
    vi.mocked(getSession).mockResolvedValue({ username: "jordan", role: "TEACHER" });
    vi.mocked(getHealth).mockResolvedValue(true);
    vi.mocked(getTeacherProfile).mockResolvedValue(profile);
    vi.mocked(getTeacherSections).mockResolvedValue([section]);
    vi.mocked(getTeacherRoster).mockResolvedValue(roster);
    vi.mocked(updateTeacherProfile).mockResolvedValue({ ...profile, displayName: "Jordan Updated", phone: "555-0112" });

    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Good day, Jordan Teacher." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open my classes & roster/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open take attendance/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open exam setup/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open marks register/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open class progress/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open my profile/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /open my classes & roster/i }));
    expect(await screen.findByText("Alex Learner")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Grade 7 · B" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /teaching workspace/i }));
    fireEvent.click(await screen.findByRole("link", { name: /open my profile/i }));
    expect(await screen.findByLabelText("Username")).toHaveValue("jordan");
    expect(screen.getByLabelText("Username")).toHaveAttribute("readonly");
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Jordan Updated" } });
    fireEvent.change(screen.getByLabelText(/Phone/), { target: { value: "555-0112" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(updateTeacherProfile).toHaveBeenCalledWith({
      displayName: "Jordan Updated",
      phone: "555-0112",
    }));
  });

  it("records attendance, enters exam marks, and renders section progress", async () => {
    vi.mocked(getSession).mockResolvedValue({ username: "jordan", role: "TEACHER" });
    vi.mocked(getHealth).mockResolvedValue(true);
    vi.mocked(getTeacherProfile).mockResolvedValue(profile);
    vi.mocked(getTeacherSections).mockResolvedValue([section]);
    vi.mocked(getAttendance).mockResolvedValue([{ studentId: 44, fullName: "Alex Learner", status: null }]);
    vi.mocked(getAttendanceHistory).mockResolvedValue([]);
    vi.mocked(saveAttendance).mockResolvedValue([{ studentId: 44, fullName: "Alex Learner", status: "PRESENT" }]);
    vi.mocked(getTeacherRoster).mockResolvedValue(roster);
    vi.mocked(getSchoolExamDefinitions).mockResolvedValue([{
      id: 521,
      name: "Midterm",
      academicYear: 2026,
    }]);
    vi.mocked(getExams).mockResolvedValue([{
      id: 52,
      sectionId: 31,
      examDefinitionId: 521,
      name: "Midterm",
      academicYear: 2026,
      subjects: [{
        id: 521,
        subject: "Science",
        maximumMarks: 40,
        marks: [{ studentId: 44, fullName: "Alex Learner", obtainedMarks: 30 }],
      }],
    }]);
    vi.mocked(saveExamMarks).mockResolvedValue();
    vi.mocked(getTeacherProgress).mockResolvedValue({
      sectionId: 31,
      students: [{
        studentId: 44,
        studentName: "Alex Learner",
        recordedAttendance: 1,
        attendancePercentage: 100,
        marks: [{ examName: "Midterm", subject: "Science", academicYear: 2026, obtainedMarks: 30, maximumMarks: 40 }],
      }],
    });

    render(<App />);
    fireEvent.click(await screen.findByRole("link", { name: /open take attendance/i }));
    fireEvent.change(await screen.findByLabelText("Attendance for Alex Learner"), { target: { value: "PRESENT" } });
    fireEvent.click(screen.getByRole("button", { name: "Save attendance" }));
    await waitFor(() => expect(saveAttendance).toHaveBeenCalledWith(31, expect.any(String), [
      { studentId: 44, status: "PRESENT" },
    ]));

    fireEvent.click(screen.getByRole("link", { name: /teaching workspace/i }));
    fireEvent.click(await screen.findByRole("link", { name: /open marks register/i }));
    expect(await screen.findByRole("option", { name: "Science · 40 marks" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Marks for Alex Learner"), { target: { value: "35" } });
    fireEvent.click(screen.getByRole("button", { name: "Save marks" }));
    await waitFor(() => expect(saveExamMarks).toHaveBeenCalledWith(521, [
      { studentId: 44, obtainedMarks: 35 },
    ]));

    fireEvent.click(screen.getByRole("link", { name: /teaching workspace/i }));
    fireEvent.click(await screen.findByRole("link", { name: /open class progress/i }));
    expect(await screen.findByText("Attendance 100% (1 recorded)")).toBeInTheDocument();
    expect(screen.getByText("2026 · Midterm · Science")).toBeInTheDocument();
  });
});

describe("student enrollment form", () => {
  it("requires student birth and parent details while keeping teacher enrollment unchanged", async () => {
    vi.mocked(getClasses).mockResolvedValue([]);
    vi.mocked(getPeople).mockResolvedValue([]);
    vi.mocked(createPerson).mockResolvedValue({
      id: 1,
      fullName: "New Student",
      username: "new-student",
      role: "STUDENT",
      sectionId: 1,
      sectionName: "A",
      className: "Grade 1",
      rollNumber: 1,
      assignedSections: [],
    });
    render(<PeopleManagement />);
    expect(await screen.findByLabelText("Date of birth")).toBeRequired();
    expect(screen.getByLabelText("Mother’s name")).toBeRequired();
    expect(screen.getByLabelText("Father’s name")).toBeRequired();
    expect(screen.getByLabelText(/Emergency contact/)).not.toBeRequired();
    fireEvent.change(screen.getByLabelText("Account type"), { target: { value: "TEACHER" } });
    expect(screen.queryByLabelText("Date of birth")).not.toBeInTheDocument();
  });
});

describe("teacher section assignment form", () => {
  it("submits multiple selected sections when an administrator creates a teacher", async () => {
    vi.mocked(getClasses).mockResolvedValue([{
      id: 1,
      name: "Grade 1",
      sections: [{ id: 10, name: "A" }, { id: 11, name: "B" }],
    }]);
    vi.mocked(getPeople).mockResolvedValue([]);
    vi.mocked(createPerson).mockResolvedValue({
      id: 9,
      fullName: "New Teacher",
      username: "new-teacher",
      role: "TEACHER",
      sectionId: null,
      sectionName: null,
      className: null,
      rollNumber: null,
      assignedSections: [],
    });

    render(<PeopleManagement />);
    fireEvent.change(await screen.findByLabelText("Account type"), { target: { value: "TEACHER" } });
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "New Teacher" } });
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "new-teacher" } });
    const passwordInput = screen.getByLabelText("Initial password");
    expect(passwordInput).not.toHaveAttribute("minlength");
    expect(passwordInput).not.toHaveAttribute("maxlength");
    fireEvent.change(passwordInput, { target: { value: "x" } });
    const assignedSections = screen.getByLabelText("Assigned sections") as HTMLSelectElement;
    Array.from(assignedSections.options).forEach((option) => { option.selected = true; });
    fireEvent.change(assignedSections);
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(createPerson).toHaveBeenCalledWith(expect.objectContaining({
      fullName: "New Teacher",
      role: "TEACHER",
      password: "x",
      sectionId: null,
      sectionIds: [10, 11],
    })));
  });
});
