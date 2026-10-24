import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClassesManagement, LoginForm, default as App } from "./App";
import {
  createClass,
  createSection,
  deleteSection,
  getClasses,
  getHealth,
  getSchoolProfile,
  getSession,
} from "./api";

vi.mock("./api", () => ({
  createClass: vi.fn(),
  createExam: vi.fn(),
  createPerson: vi.fn(),
  createSection: vi.fn(),
  deleteSection: vi.fn(),
  getAttendance: vi.fn(),
  getClasses: vi.fn(),
  getExams: vi.fn(),
  getHealth: vi.fn(),
  getPeople: vi.fn(),
  getSchoolProfile: vi.fn(),
  getSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  saveAttendance: vi.fn(),
  saveExamMarks: vi.fn(),
  updateSchoolProfile: vi.fn(),
}));

beforeEach(() => {
  window.location.hash = "";
  vi.mocked(createClass).mockReset();
  vi.mocked(createSection).mockReset();
  vi.mocked(deleteSection).mockReset();
  vi.mocked(getClasses).mockReset();
  vi.mocked(getSession).mockReset();
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
