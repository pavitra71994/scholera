export type AdminPage = "home" | "school-profile" | "classes-sections" | "students-teachers" | "attendance" | "exam-setup" | "marks-register" | "toppers";
export type StudentPage = "home" | "profile" | "exam-history" | "attendance-history" | "toppers";
export type TeacherPage = "home" | "classes-roster" | "attendance" | "marks-register" | "class-progress" | "profile" | "toppers";

export const adminPages: Array<{ title: string; page: Exclude<AdminPage, "home">; description: string }> = [
  { title: "School profile", page: "school-profile", description: "Update school details and timezone." },
  { title: "Classes & sections", page: "classes-sections", description: "Organize classes and their sections." },
  { title: "Students & teachers", page: "students-teachers", description: "Manage school people and their accounts." },
  { title: "Attendance", page: "attendance", description: "Record daily attendance by section." },
  { title: "Exam Setup", page: "exam-setup", description: "Create school-wide exams and configure section subjects." },
  { title: "Marks Register", page: "marks-register", description: "Enter and review marks by class, section, and exam." },
  { title: "School Toppers", page: "toppers", description: "View rankings for a selected class, section, and year." },
];

export const studentPages: Array<{ title: string; page: Exclude<StudentPage, "home">; description: string }> = [
  { title: "My Profile", page: "profile", description: "Your personal and class information." },
  { title: "Exam Results & Progress", page: "exam-history", description: "Review your exams, marks, and percentages." },
  { title: "Attendance Summary", page: "attendance-history", description: "See your recorded attendance and history." },
  { title: "School Toppers", page: "toppers", description: "View leaders for a selected class, section, and year." },
];

export const teacherPages: Array<{ title: string; page: Exclude<TeacherPage, "home">; description: string }> = [
  { title: "My Classes & Roster", page: "classes-roster", description: "View your assigned classes and student rosters." },
  { title: "Take Attendance", page: "attendance", description: "Record attendance and review recent history." },
  { title: "Marks Register", page: "marks-register", description: "Enter and update marks for your assigned sections." },
  { title: "Class Progress", page: "class-progress", description: "Review recorded attendance and exam marks." },
  { title: "My Profile", page: "profile", description: "View your details and edit your name or phone." },
  { title: "School Toppers", page: "toppers", description: "View rankings for a selected class, section, and year." },
];
